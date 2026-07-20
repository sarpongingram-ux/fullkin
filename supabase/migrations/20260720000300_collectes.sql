-- Fullkin — Fase 1: Collectes
--
-- De regel die alles draagt (sectie 7.1):
--   Iedereen ziet WIE heeft bijgedragen. Niemand ziet HOEVEEL.
--   De oma die €0,75 geeft staat naast de oom die €200 geeft.
--
-- Dit is geen UI-keuze. Het bedrag verlaat de database niet. Zie de RLS-policy
-- en de view onderaan dit bestand.
--
-- Geldstroom: bijdragen gaan via Stripe Connect rechtstreeks naar de rekening
-- van de ontvanger. Fullkin houdt geen saldo van derden aan.

create type life_event_kind as enum (
  'verjaardag', 'ronde_verjaardag', 'zwemdiploma', 'nieuwe_school',
  'afstuderen', 'huwelijk', 'geboorte', 'overlijden',
  'diaspora_mijlpaal', 'business_droom', 'nood'
);

-- Suggestiebedragen per moment (sectie 7.1). Als tabel, niet hardcoded:
-- een familie in Accra hanteert andere bedragen dan een familie in Londen.
create table event_suggestions (
  kind             life_event_kind primary key,
  suggested_cents  int not null
);

insert into event_suggestions (kind, suggested_cents) values
  ('verjaardag', 200), ('ronde_verjaardag', 1500), ('zwemdiploma', 75),
  ('nieuwe_school', 75), ('afstuderen', 500), ('huwelijk', 1000),
  ('geboorte', 1000), ('overlijden', 1000), ('diaspora_mijlpaal', 500),
  ('business_droom', 0), ('nood', 0);

create table life_events (
  id           uuid primary key default gen_random_uuid(),
  network_id   uuid not null references family_networks(id),
  person_id    uuid not null references persons(id),   -- voor wie
  kind         life_event_kind not null,
  title        text not null,
  occurs_on    date not null,
  created_by   uuid references persons(id),
  created_at   timestamptz not null default now()
);

create index on life_events (network_id, occurs_on);

-- ---------------------------------------------------------------------------
-- Collectes
-- ---------------------------------------------------------------------------

create type collection_status as enum ('concept', 'open', 'gesloten', 'uitbetaald');

create table collections (
  id                uuid primary key default gen_random_uuid(),
  network_id        uuid not null references family_networks(id),
  life_event_id     uuid references life_events(id),
  beneficiary_id    uuid not null references persons(id),

  title             text not null,
  message           text,
  suggested_cents   int not null default 200,
  status            collection_status not null default 'concept',

  opens_at          timestamptz not null default now(),
  closes_at         timestamptz not null,

  -- Stripe Connect: het account van de ontvanger. Geld gaat daar direct heen.
  stripe_account_id text,

  started_by        uuid not null references persons(id),
  created_at        timestamptz not null default now()
);

create index on collections (network_id, status);
create index on collections (beneficiary_id);

-- ---------------------------------------------------------------------------
-- Bijdragen
--
-- amount_cents is het gevoeligste veld in de hele applicatie. Alleen de
-- bijdrager zelf en de service role (webhooks, uitbetaling) mogen het zien.
-- Niet de ontvanger. Niet de Co-Founder. Niemand.
-- ---------------------------------------------------------------------------

create type contribution_status as enum ('wachtend', 'betaald', 'mislukt', 'terugbetaald');

create table contributions (
  id                uuid primary key default gen_random_uuid(),
  collection_id     uuid not null references collections(id),
  contributor_id    uuid not null references persons(id),

  amount_cents      int not null check (amount_cents > 0),
  currency          text not null default 'eur',
  status            contribution_status not null default 'wachtend',

  -- Een bijdrager kan zijn naam verbergen. Het bedrag is altijd verborgen.
  -- Dit is voor de rijke oom die anoniem €500 in de pot gooit.
  hide_name         boolean not null default false,

  stripe_payment_intent text unique,
  message           text,

  created_at        timestamptz not null default now(),
  paid_at           timestamptz,

  unique (collection_id, contributor_id)
);

create index on contributions (collection_id) where status = 'betaald';
create index on contributions (contributor_id);

-- ---------------------------------------------------------------------------
-- Wat de familie WEL ziet.
--
-- Namen en aantallen. Geen bedragen. Deze view is de enige manier waarop de
-- app bijdragen van anderen leest.
-- ---------------------------------------------------------------------------

create view collection_contributors
with (security_invoker = false) as
  select
    c.collection_id,
    case when c.hide_name then null else c.contributor_id end as contributor_id,
    case when c.hide_name then null else p.first_name end     as first_name,
    case when c.hide_name then null else p.last_name end      as last_name,
    case when c.hide_name then null else p.photo_url end      as photo_url,
    c.hide_name,
    c.message,
    c.paid_at
  from contributions c
  join persons p on p.id = c.contributor_id
  where c.status = 'betaald';

-- Het totaal is wel zichtbaar — dat is het feest. Alleen de individuele
-- bedragen niet.
create view collection_totals
with (security_invoker = false) as
  select
    col.id as collection_id,
    coalesce(sum(c.amount_cents) filter (where c.status = 'betaald'), 0)::bigint
      as total_cents,
    count(*) filter (where c.status = 'betaald')::int as contributor_count
  from collections col
  left join contributions c on c.collection_id = col.id
  group by col.id;

-- ---------------------------------------------------------------------------
-- Transactieverdeling (sectie 8) — 5% per transactie.
--
-- Vastgelegd per transactie, niet berekend bij uitlezing. Als de percentages
-- ooit veranderen mag dat nooit met terugwerkende kracht gelden voor geld dat
-- al is verdeeld.
-- ---------------------------------------------------------------------------

create table transaction_splits (
  id                uuid primary key default gen_random_uuid(),
  contribution_id   uuid not null references contributions(id),
  network_id        uuid not null references family_networks(id),

  gross_cents       int not null,
  co_founder_cents  int not null,   -- 0,50%
  role_holder_cents int not null,   -- 0,50%
  family_pot_cents  int not null,   -- 1,00%
  platform_cents    int not null,   -- 3,00%
  net_cents         int not null,   -- naar de ontvanger

  created_at        timestamptz not null default now(),

  constraint split_sums_up check (
    co_founder_cents + role_holder_cents + family_pot_cents
      + platform_cents + net_cents = gross_cents
  )
);

create index on transaction_splits (network_id, created_at);

-- Berekening op één plek, met afronding naar de ontvanger toe: de restcent
-- gaat altijd naar de familie, nooit naar het platform.
create or replace function compute_split(gross int)
returns table (
  co_founder int, role_holder int, family_pot int, platform int, net int
)
language sql immutable as $$
  select
    cf, rh, fp, pf, gross - cf - rh - fp - pf
  from (
    select
      (gross * 50)  / 10000 as cf,
      (gross * 50)  / 10000 as rh,
      (gross * 100) / 10000 as fp,
      (gross * 300) / 10000 as pf
  ) s;
$$;
