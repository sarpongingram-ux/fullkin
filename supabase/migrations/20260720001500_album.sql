-- Fullkin — Fase 2: Het Familiealbum (foto's-eerst)
--
-- De plek waar de familie samen herinneringen bewaart. Warm, privé, van
-- iedereen samen. Tags koppelen foto's direct aan profielen op de familiekaart,
-- zodat kaart en album elkaar versterken.
--
-- Deze eerste versie: foto's. Video, audio en de ontdekkingslaag volgen.

create type media_kind    as enum ('foto', 'video', 'audio');
create type reaction_kind as enum ('hart', 'lach', 'traan', 'vuur');

-- ---------------------------------------------------------------------------
-- Herinneringen (album items)
-- ---------------------------------------------------------------------------

create table album_items (
  id             uuid primary key default gen_random_uuid(),
  network_id     uuid not null references family_networks(id),
  uploaded_by    uuid not null references persons(id),
  file_url       text not null,               -- opslagpad in bucket, of externe url
  file_type      media_kind not null default 'foto',
  title          text,                         -- één zin
  memory_text    text,                         -- het verhaal erbij
  date_of_memory date,
  location       text,
  created_at     timestamptz not null default now()
);

create index on album_items (network_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Tags — wie staat erop. Direct gekoppeld aan profielen.
-- confirmed is voor de latere ontdekkingslaag; in v1 telt elke tag meteen.
-- ---------------------------------------------------------------------------

create table album_tags (
  id            uuid primary key default gen_random_uuid(),
  album_item_id uuid not null references album_items(id) on delete cascade,
  person_id     uuid not null references persons(id),   -- getagde persoon
  tagged_by     uuid not null references persons(id),
  confirmed     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (album_item_id, person_id)
);

create index on album_tags (person_id, created_at);
create index on album_tags (album_item_id);

-- ---------------------------------------------------------------------------
-- Reacties — warmte, geen competitie. Eén reactie per persoon per item.
-- Anoniem: alleen tellingen worden getoond, nooit wie.
-- ---------------------------------------------------------------------------

create table album_reactions (
  id            uuid primary key default gen_random_uuid(),
  album_item_id uuid not null references album_items(id) on delete cascade,
  person_id     uuid not null references persons(id),
  reaction      reaction_kind not null,
  created_at    timestamptz not null default now(),
  unique (album_item_id, person_id)
);

create index on album_reactions (album_item_id);

-- ---------------------------------------------------------------------------
-- Opmerkingen — hier zijn namen wél zichtbaar (warm, een gesprek).
-- ---------------------------------------------------------------------------

create table album_comments (
  id            uuid primary key default gen_random_uuid(),
  album_item_id uuid not null references album_items(id) on delete cascade,
  person_id     uuid not null references persons(id),
  comment_text  text not null,
  created_at    timestamptz not null default now()
);

create index on album_comments (album_item_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS — alles binnen je eigen netwerk
-- ---------------------------------------------------------------------------

alter table album_items     enable row level security;
alter table album_tags      enable row level security;
alter table album_reactions enable row level security;
alter table album_comments  enable row level security;

create policy items_read on album_items for select
  using (network_id in (select my_networks()));
create policy items_write on album_items for insert
  with check (network_id in (select my_networks()) and uploaded_by = me());
create policy items_update on album_items for update
  using (uploaded_by = me());

-- Tags: lezen binnen netwerk; taggen mag ieder lid (van items in eigen netwerk).
create policy tags_read on album_tags for select
  using (album_item_id in (select id from album_items where network_id in (select my_networks())));
create policy tags_write on album_tags for insert
  with check (
    tagged_by = me()
    and album_item_id in (select id from album_items where network_id in (select my_networks()))
  );

-- Reacties: je ziet/plaatst alleen je eigen rij (anonimiteit). Tellingen lopen
-- via album_reaction_counts (definer).
create policy reactions_own on album_reactions for select using (person_id = me());
create policy reactions_write on album_reactions for insert
  with check (
    person_id = me()
    and album_item_id in (select id from album_items where network_id in (select my_networks()))
  );
create policy reactions_change on album_reactions for update using (person_id = me());
create policy reactions_delete on album_reactions for delete using (person_id = me());

-- Opmerkingen: lezen binnen netwerk, plaatsen als jezelf.
create policy comments_read on album_comments for select
  using (album_item_id in (select id from album_items where network_id in (select my_networks())));
create policy comments_write on album_comments for insert
  with check (
    person_id = me()
    and album_item_id in (select id from album_items where network_id in (select my_networks()))
  );

-- ---------------------------------------------------------------------------
-- Reactietellingen (anoniem) + mijn eigen reactie
-- ---------------------------------------------------------------------------

create or replace function album_reaction_counts(p_item uuid)
returns table (reaction reaction_kind, aantal int)
language sql stable security definer set search_path = public as $$
  select r.reaction, count(*)::int
  from album_reactions r
  where r.album_item_id = p_item
    and r.album_item_id in (select id from album_items where network_id in (select my_networks()))
  group by r.reaction;
$$;

revoke execute on function album_reaction_counts(uuid) from public, anon;
grant execute on function album_reaction_counts(uuid) to authenticated;
