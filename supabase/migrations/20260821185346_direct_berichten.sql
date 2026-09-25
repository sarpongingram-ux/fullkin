-- Start (of hervind) een direct gesprek tussen jou en een ander familielid.
-- Bij een nieuw gesprek plaatst Fullkin een warm 'maak kennis'-bericht.
create or replace function start_direct(p_other uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare net uuid; me_id uuid; naam_a text; naam_b text; rel text; room uuid;
begin
  me_id := me();
  if me_id is null then raise exception 'Je bent niet ingelogd.'; end if;
  if p_other = me_id then raise exception 'Je kunt geen gesprek met jezelf starten.'; end if;

  select network_id, first_name into net, naam_a from persons where id = me_id;
  select first_name into naam_b from persons where id = p_other and network_id = net;
  if naam_b is null then raise exception 'Dit familielid is niet gevonden.'; end if;

  -- Bestaat er al een gesprek tussen deze twee?
  select r.id into room
  from chat_rooms r
  where r.type = 'direct' and r.network_id = net
    and exists (select 1 from chat_members m where m.room_id = r.id and m.person_id = me_id)
    and exists (select 1 from chat_members m where m.room_id = r.id and m.person_id = p_other)
  limit 1;
  if room is not null then return room; end if;

  insert into chat_rooms (network_id, type, name) values (net, 'direct', null)
    returning id into room;
  insert into chat_members (room_id, person_id) values (room, me_id), (room, p_other);

  rel := relation_label(me_id, p_other);
  insert into chat_messages (room_id, sender_id, message_text, message_type)
    values (
      room, null,
      'Hé ' || naam_a || ' en ' || naam_b || '. Jullie zijn ' ||
        coalesce(nullif(rel, ''), 'familie') || ' van elkaar. Maak kennis. 👋',
      'systeem'
    );
  return room;
end $$;
