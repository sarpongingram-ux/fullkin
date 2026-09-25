-- De takchat-migratie maakte chat_rooms_read afhankelijk van chat_members en
-- chat_members_read afhankelijk van chat_rooms → oneindige recursie in RLS.
-- Oplossing: een SECURITY DEFINER-helper die chat_members leest zónder RLS,
-- zodat beide policies 'm kunnen gebruiken zonder elkaar te triggeren.
create or replace function public.is_lid_van_room(p_room uuid)
returns boolean
language sql security definer stable set search_path = public
as $function$
  select exists (
    select 1 from chat_members m
    where m.room_id = p_room and m.person_id = me()
  );
$function$;

revoke execute on function public.is_lid_van_room(uuid) from anon;

drop policy if exists chat_rooms_read on chat_rooms;
create policy chat_rooms_read on chat_rooms for select
  using (
    network_id in (select my_networks())
    and (type <> 'direct' or is_lid_van_room(id))
  );

drop policy if exists chat_members_read on chat_members;
create policy chat_members_read on chat_members for select
  using (person_id = me() or is_lid_van_room(room_id));
