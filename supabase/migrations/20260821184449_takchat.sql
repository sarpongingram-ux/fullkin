-- Tak-rooms krijgen een woonland.
alter table chat_rooms add column if not exists country text;

-- Mag de ingelogde gebruiker bij deze room? Familie = iedereen in het netwerk.
-- Tak = wie in dat land woont, of handmatig is toegetreden. Direct = leden.
create or replace function kan_bij_room(p_room uuid)
returns boolean
language plpgsql security definer set search_path = public stable
as $$
declare r record; mijn_land text;
begin
  select network_id, type, country into r from chat_rooms where id = p_room;
  if r.network_id is null then return false; end if;
  if r.network_id not in (select my_networks()) then return false; end if;
  if r.type = 'familie' then return true; end if;
  if r.type = 'tak' then
    select country into mijn_land from persons where id = me();
    if mijn_land is not null and r.country is not null and mijn_land = r.country then
      return true;
    end if;
    return exists (select 1 from chat_members where room_id = p_room and person_id = me());
  end if;
  -- direct
  return exists (select 1 from chat_members where room_id = p_room and person_id = me());
end $$;

-- Toegangsregels bijwerken.
drop policy if exists chat_rooms_read on chat_rooms;
create policy chat_rooms_read on chat_rooms for select
  using (
    network_id in (select my_networks())
    and (
      type <> 'direct'
      or exists (select 1 from chat_members where room_id = chat_rooms.id and person_id = me())
    )
  );

drop policy if exists chat_messages_read on chat_messages;
create policy chat_messages_read on chat_messages for select
  using (kan_bij_room(room_id));

drop policy if exists chat_messages_insert on chat_messages;
create policy chat_messages_insert on chat_messages for insert
  with check (sender_id = me() and kan_bij_room(room_id));

drop policy if exists chat_members_insert on chat_members;
create policy chat_members_insert on chat_members for insert
  with check (
    person_id = me()
    and room_id in (select id from chat_rooms where network_id in (select my_networks()))
  );

-- Zorgt dat er voor elk woonland in het netwerk een takchat bestaat.
create or replace function ensure_tak_chats()
returns void
language plpgsql security definer set search_path = public
as $$
declare net uuid; naam text; c text;
begin
  select network_id into net from persons where id = me();
  if net is null then return; end if;
  select name into naam from family_networks where id = net;
  for c in
    select distinct country from persons
    where network_id = net and coalesce(country, '') <> ''
  loop
    if not exists (
      select 1 from chat_rooms where network_id = net and type = 'tak' and country = c
    ) then
      insert into chat_rooms (network_id, type, name, country)
        values (net, 'tak', naam || ' — ' || c, c);
    end if;
  end loop;
end $$;
