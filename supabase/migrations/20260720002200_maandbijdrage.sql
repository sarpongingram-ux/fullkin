-- Fullkin — Maandelijkse bijdrage aan de Familie Pot (sectie 7.4)
--
-- Elk lid kan een vaste maandbijdrage instellen. €3 is de suggestie, maar de
-- familie bepaalt zelf het bedrag. Loopt via een Stripe-abonnement; elke
-- geslaagde maandbetaling wordt als 'maandbijdrage' in het grootboek geboekt.
-- Individuele bedragen blijven verborgen — de Pot toont alleen totalen.

create type pot_sub_status as enum ('actief', 'geannuleerd');

create table pot_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  network_id             uuid not null references family_networks(id),
  person_id              uuid not null references persons(id),
  amount_cents           int not null,
  stripe_subscription_id text,
  stripe_customer_id     text,
  status                 pot_sub_status not null default 'actief',
  created_at             timestamptz not null default now(),
  canceled_at            timestamptz
);
create index on pot_subscriptions (network_id) where status = 'actief';
create unique index pot_sub_stripe
  on pot_subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;

alter table pot_subscriptions enable row level security;

-- Je ziet alleen je eigen abonnement. Schrijven gebeurt via de service role
-- (na een geslaagde Stripe-betaling), niet vanuit de client.
create policy potsub_read_own on pot_subscriptions for select using (person_id = me());

-- ---------------------------------------------------------------------------
-- record_pot_maandbijdrage — boekt één maandbetaling in het grootboek. Alleen
-- de service role (na een geslaagde betaling). Idempotent via stripe_ref
-- (de factuur-id), zodat return-afhandeling en webhook nooit dubbel boeken.
-- ---------------------------------------------------------------------------

create or replace function record_pot_maandbijdrage(
  p_network uuid, p_person uuid, p_amount int, p_ref text
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into pot_ledger (network_id, kind, amount_cents, person_id, stripe_ref, description)
  values (p_network, 'maandbijdrage', p_amount, p_person, p_ref, 'Maandelijkse bijdrage')
  on conflict (stripe_ref) where stripe_ref is not null do nothing;
end;
$$;

revoke execute on function record_pot_maandbijdrage(uuid, uuid, int, text)
  from public, anon, authenticated;
grant execute on function record_pot_maandbijdrage(uuid, uuid, int, text) to service_role;

-- ---------------------------------------------------------------------------
-- pot_maandbijdrage_stats — geaggregeerd, voor de Pot-pagina: hoeveel leden
-- dragen maandelijks bij en voor welk totaalbedrag per maand. Nooit per lid.
-- ---------------------------------------------------------------------------

create or replace function pot_maandbijdrage_stats()
returns table (leden int, per_maand_cents bigint)
language sql stable security definer set search_path = public as $$
  with net as (
    select network_id as id from persons where claimed_by = auth.uid() limit 1
  )
  select
    count(*)::int,
    coalesce(sum(amount_cents), 0)::bigint
  from pot_subscriptions
  where network_id = (select id from net) and status = 'actief';
$$;

revoke execute on function pot_maandbijdrage_stats() from public, anon;
grant execute on function pot_maandbijdrage_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- my_pot_summary uitgebreid: maandbijdragen als aparte bron erbij.
-- (Return-type wijzigt, dus eerst droppen.)
-- ---------------------------------------------------------------------------

drop function if exists my_pot_summary();

create or replace function my_pot_summary()
returns table (
  saldo_cents           bigint,
  uit_1pct_cents        bigint,
  uit_donaties_cents    bigint,
  uit_maandbijdrage_cents bigint,
  uitgekeerd_cents      bigint,
  donatie_aantal        int
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
    coalesce(sum(amount_cents) filter (where kind = 'maandbijdrage'), 0)::bigint,
    coalesce(-sum(amount_cents) filter (where kind = 'uitkering'), 0)::bigint,
    count(*) filter (where kind = 'donatie')::int
  from l;
$$;

revoke execute on function my_pot_summary() from public, anon;
grant execute on function my_pot_summary() to authenticated;
