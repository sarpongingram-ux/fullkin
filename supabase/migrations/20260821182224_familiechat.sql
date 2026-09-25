-- Enums
do $$ begin
  create type chat_room_type as enum ('familie','tak','direct');
exception when duplicate_object then null; end $$;
do $$ begin
  create type chat_message_type as enum ('tekst','foto','collecte_link','album_item','moment','systeem');
exception when duplicate_object then null; end $$;

-- Tabellen
create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references family_networks(id),
  type chat_room_type not null default 'familie',
  name text,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id),
  sender_id uuid references persons(id),           -- null = systeembericht
  message_text text,
  message_type chat_message_type not null default 'tekst',
  reference_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_room_time on chat_messages(room_id, created_at);

create table if not exists chat_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references chat_rooms(id),
  person_id uuid not null references persons(id),
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  unique(room_id, person_id)
);

-- RLS
alter table chat_rooms enable row level security;
alter table chat_messages enable row level security;
alter table chat_members enable row level security;

drop policy if exists chat_rooms_read on chat_rooms;
create policy chat_rooms_read on chat_rooms for select
  using (network_id in (select my_networks()));

drop policy if exists chat_messages_read on chat_messages;
create policy chat_messages_read on chat_messages for select
  using (room_id in (select id from chat_rooms where network_id in (select my_networks())));

drop policy if exists chat_messages_insert on chat_messages;
create policy chat_messages_insert on chat_messages for insert
  with check (
    sender_id = me()
    and room_id in (select id from chat_rooms where network_id in (select my_networks()))
  );

drop policy if exists chat_members_read on chat_members;
create policy chat_members_read on chat_members for select
  using (room_id in (select id from chat_rooms where network_id in (select my_networks())));

drop policy if exists chat_members_insert on chat_members;
create policy chat_members_insert on chat_members for insert
  with check (person_id = me());

drop policy if exists chat_members_update on chat_members;
create policy chat_members_update on chat_members for update
  using (person_id = me()) with check (person_id = me());

-- Realtime aanzetten voor live berichten
do $$ begin
  alter publication supabase_realtime add table chat_messages;
exception when duplicate_object then null; end $$;

-- Familiechat voor bestaande netwerken aanmaken
insert into chat_rooms (network_id, type, name)
select fn.id, 'familie', 'Familie ' || fn.name
from family_networks fn
where not exists (
  select 1 from chat_rooms cr where cr.network_id = fn.id and cr.type = 'familie'
);

-- Welkom-systeembericht in elke familiechat die er nog geen heeft
insert into chat_messages (room_id, sender_id, message_text, message_type)
select cr.id, null,
  'Welkom in de familiechat. Dit is jullie eigen veilige ruimte — alleen voor familie. 💛',
  'systeem'
from chat_rooms cr
where cr.type = 'familie'
  and not exists (select 1 from chat_messages m where m.room_id = cr.id);
