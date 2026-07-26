-- Fullkin — Fase 2: De Familie Pot (sectie 7.4)
--
-- De Pot is een GROOTBOEK, geen aparte spaarrekening. Elke boeking is een
-- credit (1% per transactie, donatie, maandbijdrage) of debit (uitkering).
-- Het saldo is de som. Zo houden we geen apart geparkeerd saldo van derden aan
-- — de euro's zitten in Fullkin's Stripe-balans als deel van de fee, en bij een
-- uitkering wordt op dat moment overgemaakt.
--
-- Bedragen van individuele bijdragers blijven verborgen. De Pot toont alleen
-- geaggregeerde totalen — nooit hoeveel één transactie was.

create type pot_entry_kind as enum (
  'transactie_1pct',  -- automatische 1% van elke bijdrage
  'maandbijdrage',    -- €3 per actief lid per maand (later)
  'donatie',          -- vrije, anonieme donatie
  'uitkering'         -- uit de pot (Rad, Stem, noodcollecte) — negatief
);

create table pot_ledger (
  id              uuid primary key default gen_random_uuid(),
  network_id      uuid not null references family_networks(id),
  kind            pot_entry_kind not null,
  amount_cents    int not null,                 -- + erin, − eruit
  contribution_id uuid references contributions(id),  -- bij transactie_1pct
  person_id       uuid references persons(id),  -- doneur / ontvanger (nooit getoond bij donatie)
  stripe_ref      text,                          -- payment intent bij donatie (dedup)
  description     text,
  created_at      timestamptz not null default now()
);

create index on pot_ledger (network_id, created_at desc);
-- Idempotentie: één 1%-boeking per bijdrage, één donatie per Stripe-betaling.
create unique index pot_ledger_contrib
  on pot_ledger (contribution_id) where kind = 'transactie_1pct';
create unique index pot_ledger_stripe
  on pot_ledger (stripe_ref) where stripe_ref is not null;

alter table pot_ledger enable row level security;

-- Iedereen in het netwerk ziet de Pot (transparantie). Schrijven gebeurt
-- uitsluitend via de service role (afrekenen) — geen client-insert.
create policy pot_read on pot_ledger for select
  using (network_id in (select my_networks()));

-- ---------------------------------------------------------------------------
-- my_pot_summary — geaggregeerd overzicht voor mijn netwerk. Alleen totalen,
-- nooit individuele bedragen per transactie.
-- ---------------------------------------------------------------------------

create or replace function my_pot_summary()
returns table (
  saldo_cents        bigint,
  uit_1pct_cents     bigint,
  uit_donaties_cents bigint,
  uitgekeerd_cents   bigint,
  donatie_aantal     int
)
language sql stable security definer set search_path = public as $$
  with net as (
    select network_id as id from persons where claimed_by = auth.uid() limit 1
  ),
  l as (select * from pot_ledger where network_id = (select id from net))
  select
    coalesce(sum(amount_cents), 0)::bigint,
    coalesce(sum(amount_cents) filter (where kind = 'transactie_1pct'), 0)::bigint,
    coalesce(sum(amount_cents) filter (where kind = 'donatie'), 0)::bigint,
    coalesce(-sum(amount_cents) filter (where kind = 'uitkering'), 0)::bigint,
    count(*) filter (where kind = 'donatie')::int
  from l;
$$;

revoke execute on function my_pot_summary() from public, anon;
grant execute on function my_pot_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- settle_contribution uitgebreid: schrijft nu ook de automatische 1% naar de
-- Pot-ledger. Idempotent via de unieke index op contribution_id.
-- ---------------------------------------------------------------------------

create or replace function settle_contribution(p_contribution uuid, p_intent text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  c      contributions%rowtype;
  s      record;
  net_id uuid;
begin
  select * into c from contributions where id = p_contribution;
  if not found then
    raise exception 'Bijdrage % niet gevonden', p_contribution;
  end if;

  if c.status = 'betaald' then
    return;
  end if;

  select network_id into net_id from collections where id = c.collection_id;

  update contributions
    set status = 'betaald',
        paid_at = now(),
        stripe_payment_intent = coalesce(p_intent, stripe_payment_intent)
    where id = p_contribution;

  select * into s from compute_split(c.amount_cents);

  insert into transaction_splits (
    contribution_id, network_id, gross_cents,
    co_founder_cents, role_holder_cents, family_pot_cents,
    platform_cents, net_cents
  ) values (
    c.id, net_id, c.amount_cents,
    s.co_founder, s.role_holder, s.family_pot,
    s.platform, s.net
  );

  -- Automatische 1% naar de Pot-ledger (alleen als er iets te boeken valt).
  if s.family_pot > 0 then
    insert into pot_ledger (network_id, kind, amount_cents, contribution_id, description)
    values (net_id, 'transactie_1pct', s.family_pot, c.id,
            'Automatische 1% van een bijdrage')
    on conflict (contribution_id) where kind = 'transactie_1pct' do nothing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill: boek de 1% van reeds afgerekende bijdragen alsnog in het grootboek.
-- ---------------------------------------------------------------------------

insert into pot_ledger (network_id, kind, amount_cents, contribution_id, description, created_at)
select ts.network_id, 'transactie_1pct', ts.family_pot_cents, ts.contribution_id,
       'Automatische 1% (backfill)', ts.created_at
from transaction_splits ts
where ts.family_pot_cents > 0
on conflict (contribution_id) where kind = 'transactie_1pct' do nothing;

-- ---------------------------------------------------------------------------
-- record_pot_donation — boekt een vrije donatie in het grootboek. Alleen de
-- service role (na een geslaagde betaling) roept dit aan. Idempotent via
-- stripe_ref.
-- ---------------------------------------------------------------------------

create or replace function record_pot_donation(
  p_network uuid, p_person uuid, p_amount int, p_ref text
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into pot_ledger (network_id, kind, amount_cents, person_id, stripe_ref, description)
  values (p_network, 'donatie', p_amount, p_person, p_ref, 'Vrije donatie')
  on conflict (stripe_ref) where stripe_ref is not null do nothing;
end;
$$;

revoke execute on function record_pot_donation(uuid, uuid, int, text) from public, anon, authenticated;
grant execute on function record_pot_donation(uuid, uuid, int, text) to service_role;
