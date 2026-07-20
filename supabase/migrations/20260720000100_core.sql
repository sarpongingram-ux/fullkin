-- Fullkin — Fase 1: De Kern
-- Familiekaart, personen, relaties, contactstatus.
--
-- Twee wetten zijn hier in het schema vastgelegd, niet in de applicatiecode:
--   1. Je tekent nooit een stamboom. Alleen ouder-kind en partner worden opgeslagen.
--      Broers, zussen, neven, nichten, ooms en tantes worden afgeleid.
--   2. Familie kun je niet verwijderen. Er is geen delete op relaties. Alleen de
--      contactstatus tussen twee mensen kan veranderen.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Netwerken
-- ---------------------------------------------------------------------------

create table family_networks (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  home_country text,                       -- diaspora-herkomst, bv. 'GH', 'SR'
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Personen
--
-- Een persoon is niet hetzelfde als een gebruiker. Opa Emmanuel (70, Accra,
-- geen smartphone) is een volwaardige persoon op de familiekaart, aangemaakt en
-- beheerd door zijn kleinkind. Hij kan later zelf claimen zonder dataverlies.
-- ---------------------------------------------------------------------------

create table persons (
  id            uuid primary key default gen_random_uuid(),
  network_id    uuid not null references family_networks(id),

  first_name    text not null,
  last_name     text not null,
  birth_name    text,                      -- nodig voor de Fullkin-scan (sectie 11)
  born_on       date,
  died_on       date,

  city          text,
  country       text,
  photo_url     text,

  -- Eigenaarschap. Beide mogen null zijn: een persoon die nog niemand claimde.
  claimed_by    uuid unique references auth.users(id),
  managed_by    uuid references persons(id), -- proxyprofiel: kleinkind beheert opa

  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index on persons (network_id);
create index on persons (claimed_by);
create index on persons (lower(last_name));

-- ---------------------------------------------------------------------------
-- Relaties — de enige twee soorten die worden opgeslagen
--
-- 'parent': from_person is de ouder van to_person. Richting is betekenisvol.
-- 'partner': symmetrisch. We slaan één rij op en normaliseren de volgorde.
--
-- Alles daarbuiten (broer, neef, oudtante) is een query over deze graaf.
-- ---------------------------------------------------------------------------

create type relationship_kind as enum ('parent', 'partner');

-- Hoe iemand in de familie kwam. Fullkin maakt geen onderscheid in rechten
-- (sectie 12) — dit veld is puur voor de medische laag en zichtbaarheid.
create type relationship_origin as enum (
  'biological', 'adoptive', 'step', 'foster', 'donor', 'chosen'
);

create table relationships (
  id           uuid primary key default gen_random_uuid(),
  network_id   uuid not null references family_networks(id),
  kind         relationship_kind not null,
  origin       relationship_origin not null default 'biological',

  from_person  uuid not null references persons(id),
  to_person    uuid not null references persons(id),

  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),

  constraint no_self_relation check (from_person <> to_person),
  -- Partners worden genormaliseerd opgeslagen zodat (a,b) en (b,a) niet
  -- allebei kunnen bestaan.
  constraint partner_normalised check (kind <> 'partner' or from_person < to_person)
);

create unique index relationships_unique
  on relationships (kind, from_person, to_person);
create index on relationships (network_id);
create index on relationships (to_person);

-- De Wet van Fullkin, afgedwongen door de database.
-- Een relatie is een feit. Feiten verdwijnen niet.
create rule relationships_no_delete as
  on delete to relationships do instead nothing;

-- ---------------------------------------------------------------------------
-- Contactstatus (sectie 4)
--
-- Dit is wat mensen zoeken als ze "verwijderen" willen. De relatie blijft, de
-- afstand verandert. Standaard is 'verbonden' — we slaan alleen afwijkingen op,
-- anders wordt dit n².
-- ---------------------------------------------------------------------------

create type contact_status as enum ('verbonden', 'stil', 'herstellend');

create table contact_states (
  network_id   uuid not null references family_networks(id),
  person_a     uuid not null references persons(id),
  person_b     uuid not null references persons(id),
  status       contact_status not null,
  set_by       uuid references persons(id),
  changed_at   timestamptz not null default now(),

  primary key (person_a, person_b),
  constraint pair_normalised check (person_a < person_b),
  constraint no_self_state check (person_a <> person_b)
);

-- Ook hier: nooit verwijderen. Terug naar 'verbonden' is een update.
create rule contact_states_no_delete as
  on delete to contact_states do instead nothing;

-- Laatste contactmoment, voor "met 12 heb je al meer dan een jaar geen contact
-- gehad" en voor de automatische overgang naar 'herstellend'.
create table contact_log (
  id         uuid primary key default gen_random_uuid(),
  person_a   uuid not null references persons(id),
  person_b   uuid not null references persons(id),
  occurred_at timestamptz not null default now(),
  constraint log_pair_normalised check (person_a < person_b)
);

create index on contact_log (person_a, person_b, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Lidmaatschap en rollen (sectie 10)
-- ---------------------------------------------------------------------------

create type family_role as enum (
  'co_founder',        -- dag 1, permanent, niet stembaar
  'events_manager',    -- 50+ leden
  'verhalen_manager',  -- 150+
  'pot_beheerder',     -- 150+
  'connector',         -- 300+
  'welzijn_manager',   -- 300+
  'mediator',          -- 500+
  'archivaris'         -- 500+
);

create table memberships (
  id          uuid primary key default gen_random_uuid(),
  network_id  uuid not null references family_networks(id),
  person_id   uuid not null references persons(id),
  role        family_role not null,
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,                -- rolwissel na stemronde; co_founder nooit

  unique (network_id, person_id, role)
);

create index on memberships (network_id, role) where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Uitnodigingen (sectie 18 — kip-en-ei)
--
-- Een uitnodiging wijst naar een persoon die al op de kaart staat. Je wordt
-- niet uitgenodigd voor een lege app: je plek is al ingevuld.
-- ---------------------------------------------------------------------------

create type invite_status as enum ('open', 'geaccepteerd', 'verlopen');

create table invites (
  id          uuid primary key default gen_random_uuid(),
  network_id  uuid not null references family_networks(id),
  person_id   uuid not null references persons(id),
  invited_by  uuid not null references persons(id),

  channel     text not null,              -- 'whatsapp' | 'sms' | 'email'
  destination text not null,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),

  status      invite_status not null default 'open',
  sent_at     timestamptz,
  accepted_at timestamptz,
  expires_at  timestamptz not null default now() + interval '90 days',
  created_at  timestamptz not null default now()
);

create index on invites (network_id, status);
create index on invites (person_id);
