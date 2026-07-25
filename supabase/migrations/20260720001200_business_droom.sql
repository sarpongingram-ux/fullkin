-- Fullkin — Fase 2: De Business Droom (sectie 7.7)
--
-- Een familielid stelt niet alleen een persoonlijke droom in, maar een
-- businessplan. De familie stelt vragen (openbaar), stemt (60% akkoord nodig),
-- en investeert. Bij goedkeuring opent een business-collecte die dezelfde
-- machinerie gebruikt als elke andere collecte. Daarna: maandelijkse updates.

create type business_status as enum ('stemming', 'goedgekeurd', 'afgewezen', 'afgerond');

create table business_dreams (
  id                     uuid primary key default gen_random_uuid(),
  network_id             uuid not null references family_networks(id),
  person_id              uuid not null references persons(id),   -- de ondernemer
  name                   text not null,
  description            text not null,
  target_cents           int  not null check (target_cents > 0),
  expected_revenue_cents int,
  give_back              text,                                   -- hoe hij teruggeeft
  status                 business_status not null default 'stemming',
  collection_id          uuid references collections(id),
  created_at             timestamptz not null default now(),
  approved_at            timestamptz
);

create index on business_dreams (network_id, status);

-- Openbare vragenronde. Iedereen ziet vraag én antwoord.
create table business_questions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_dreams(id),
  asker_id    uuid not null references persons(id),
  question    text not null,
  answer      text,
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);

create index on business_questions (business_id, created_at);

-- Stemmen. Anoniem: alleen de teller is zichtbaar, niet wie wat stemde.
create table business_votes (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_dreams(id),
  voter_id    uuid not null references persons(id),
  approve     boolean not null,
  created_at  timestamptz not null default now(),
  unique (business_id, voter_id)
);

-- Maandelijkse update: één foto, één getal (sectie 7.7 stap 5).
create table business_updates (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_dreams(id),
  photo_url   text,
  metric      text,                                             -- "40 kippen"
  note        text,
  created_at  timestamptz not null default now()
);

create index on business_updates (business_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table business_dreams    enable row level security;
alter table business_questions enable row level security;
alter table business_votes     enable row level security;
alter table business_updates   enable row level security;

create policy bd_read on business_dreams for select
  using (network_id in (select my_networks()));
create policy bd_write on business_dreams for insert
  with check (network_id in (select my_networks()) and person_id = me());
create policy bd_update on business_dreams for update
  using (person_id = me() or has_role(network_id, 'co_founder'));

create policy bq_read on business_questions for select
  using (business_id in (select id from business_dreams where network_id in (select my_networks())));
create policy bq_ask on business_questions for insert
  with check (
    asker_id = me()
    and business_id in (select id from business_dreams where network_id in (select my_networks()))
  );
-- Alleen de ondernemer beantwoordt.
create policy bq_answer on business_questions for update
  using (business_id in (select id from business_dreams where person_id = me()));

-- Je ziet alleen je eigen stem; de teller loopt via business_tally (definer).
create policy bv_read_own on business_votes for select using (voter_id = me());
create policy bv_write on business_votes for insert
  with check (
    voter_id = me()
    and business_id in (select id from business_dreams where network_id in (select my_networks()))
  );
create policy bv_change on business_votes for update using (voter_id = me());

create policy bu_read on business_updates for select
  using (business_id in (select id from business_dreams where network_id in (select my_networks())));
create policy bu_write on business_updates for insert
  with check (business_id in (select id from business_dreams where person_id = me()));

-- ---------------------------------------------------------------------------
-- business_tally — stemstand + drempel (60% van de actieve leden).
-- Anoniem: geeft alleen tellers, plus je eigen stem.
-- ---------------------------------------------------------------------------

create or replace function business_tally(bid uuid)
returns table (
  ja int, nee int, actief int, nodig int, goedgekeurd boolean, mijn_stem boolean
)
language sql stable security definer set search_path = public as $$
  with b as (
    select * from business_dreams where id = bid and network_id in (select my_networks())
  )
  select
    (select count(*) filter (where approve) from business_votes where business_id = bid)::int,
    (select count(*) filter (where not approve) from business_votes where business_id = bid)::int,
    (select count(*) from persons where network_id = (select network_id from b) and claimed_by is not null)::int,
    ceil(0.6 * (select count(*) from persons where network_id = (select network_id from b) and claimed_by is not null))::int,
    (select status from b) = 'goedgekeurd',
    (select approve from business_votes where business_id = bid and voter_id = me())
  from b;
$$;

revoke execute on function business_tally(uuid) from public, anon;
grant execute on function business_tally(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- approve_business — als de 60%-drempel écht is gehaald, opent de
-- business-collecte. Idempotent en veilig: telt zelf de stemmen, dus een
-- gebruiker kan goedkeuring niet forceren.
-- ---------------------------------------------------------------------------

create or replace function approve_business(bid uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  b business_dreams%rowtype; ja int; actief int; nodig int; col uuid;
begin
  select * into b from business_dreams where id = bid;
  if not found then raise exception 'Business Droom niet gevonden'; end if;
  if b.status <> 'stemming' then return b.collection_id; end if;

  select count(*) into actief from persons
    where network_id = b.network_id and claimed_by is not null;
  select count(*) filter (where approve) into ja from business_votes where business_id = bid;
  nodig := ceil(0.6 * actief);

  if nodig > 0 and ja >= nodig then
    insert into collections (
      network_id, beneficiary_id, title, message, suggested_cents,
      status, closes_at, started_by
    ) values (
      b.network_id, b.person_id, b.name, 'Business Droom',
      greatest(100, b.target_cents / 20), 'open',
      now() + interval '1 year', b.person_id
    ) returning id into col;

    update business_dreams
      set status = 'goedgekeurd', collection_id = col, approved_at = now()
      where id = bid;
    return col;
  end if;
  return null;
end;
$$;

revoke execute on function approve_business(uuid) from public, anon;
grant execute on function approve_business(uuid) to authenticated;
