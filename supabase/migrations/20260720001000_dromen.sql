-- Fullkin — Fase 2: De Droom Wallet (sectie 7.2)
--
-- Elk familielid heeft één actieve droom: één zin, één bedrag, zichtbare
-- voortgang. "Kofi wil een fatbike."
--
-- Slimme koppeling: een droom krijgt een doorlopende collecte als motor. Zo
-- hergebruikt "bijdragen aan andermans droom" exact de bestaande machinerie —
-- de anonimiteitsregel (namen zichtbaar, bedragen verborgen), de 5%-splitsing
-- en settle_contribution. Geen nieuwe betaalcode.

create type dream_status as enum ('actief', 'vervuld', 'gepauzeerd');

create table dreams (
  id            uuid primary key default gen_random_uuid(),
  network_id    uuid not null references family_networks(id),
  person_id     uuid not null references persons(id),
  title         text not null,                       -- één zin
  target_cents  int  not null check (target_cents > 0),
  status        dream_status not null default 'actief',
  collection_id uuid references collections(id),     -- de doorlopende droom-collecte
  created_at    timestamptz not null default now(),
  fulfilled_at  timestamptz
);

-- Eén actieve droom per persoon tegelijk. Vervulde/gepauzeerde blijven als
-- historie bestaan.
create unique index dreams_one_active on dreams (person_id) where status = 'actief';
create index on dreams (network_id) where status = 'actief';
create index on dreams (collection_id);

alter table dreams enable row level security;

create policy dreams_read on dreams for select
  using (network_id in (select my_networks()));

-- Je stelt je eigen droom in (of die van iemand die je beheert; co-founder mag ook).
create policy dreams_write on dreams for insert
  with check (
    network_id in (select my_networks())
    and (
      person_id = me()
      or person_id in (select id from persons where managed_by = me())
      or has_role(network_id, 'co_founder')
    )
  );

create policy dreams_update on dreams for update
  using (
    person_id = me()
    or person_id in (select id from persons where managed_by = me())
    or has_role(network_id, 'co_founder')
  );

-- ---------------------------------------------------------------------------
-- family_dreams — alle actieve dromen in mijn netwerken, met voortgang.
--
-- SECURITY DEFINER omdat de voortgang (som van betaalde bijdragen) langs de
-- contributions-RLS heen moet, net als collection_total. Netwerk-gated via
-- my_networks(). Individuele bedragen komen er nooit uit — alleen het totaal.
-- ---------------------------------------------------------------------------

create or replace function family_dreams()
returns table (
  dream_id      uuid,
  person_id     uuid,
  first_name    text,
  last_name     text,
  photo_url     text,
  title         text,
  target_cents  int,
  raised_cents  bigint,
  collection_id uuid,
  status        dream_status
)
language sql stable security definer set search_path = public as $$
  select
    d.id, d.person_id, p.first_name, p.last_name, p.photo_url,
    d.title, d.target_cents,
    coalesce((
      select sum(c.amount_cents) from contributions c
      where c.collection_id = d.collection_id and c.status = 'betaald'
    ), 0)::bigint,
    d.collection_id,
    d.status
  from dreams d
  join persons p on p.id = d.person_id
  where d.status = 'actief'
    and d.network_id in (select my_networks());
$$;

revoke execute on function family_dreams() from public, anon;
grant execute on function family_dreams() to authenticated;
