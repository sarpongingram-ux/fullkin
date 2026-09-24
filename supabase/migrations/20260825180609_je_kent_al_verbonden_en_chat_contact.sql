-- 1) "Je kent al" telt voortaan iedereen met wie je VERBONDEN bent (of aan het
--    herstellen), niet alleen wie een gelogd contactmoment heeft. Je naaste
--    familie telt dus automatisch mee. "Uit het oog" = wie op 'stil' staat.
create or replace function public.family_stats(me uuid)
returns table(total integer, known integer, silent integer, out_of_touch integer)
language sql stable set search_path to 'public' as $$
  select
    count(*)::int,
    count(*) filter (where status in ('verbonden','herstellend'))::int,
    count(*) filter (where status = 'stil')::int,
    count(*) filter (where status = 'stil')::int
  from family_map(me);
$$;

-- 2) Chatten telt als contact. Eén rij per persoonspaar; we werken de datum bij.
alter table contact_log add constraint contact_log_pair_uniek unique (person_a, person_b);

-- Legt contact vast tussen mij en iedereen in een chatruimte (privé of familie).
create or replace function public.leg_chat_contact_vast(p_room uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare mij uuid; ander uuid;
begin
  mij := me();
  if mij is null then return; end if;
  for ander in
    select person_id from chat_members
    where room_id = p_room and person_id <> mij
  loop
    insert into contact_log (person_a, person_b, occurred_at)
    values (least(mij, ander), greatest(mij, ander), now())
    on conflict (person_a, person_b)
      do update set occurred_at = excluded.occurred_at;
  end loop;
end;
$$;
grant execute on function public.leg_chat_contact_vast(uuid) to authenticated;

-- 3) Inhaalslag: bestaande chats meteen meetellen als contact (laatste bericht).
insert into contact_log (person_a, person_b, occurred_at)
select least(m.sender_id, cm.person_id), greatest(m.sender_id, cm.person_id), max(m.created_at)
from chat_messages m
join chat_members cm on cm.room_id = m.room_id and cm.person_id <> m.sender_id
where m.sender_id is not null
group by least(m.sender_id, cm.person_id), greatest(m.sender_id, cm.person_id)
on conflict (person_a, person_b)
  do update set occurred_at = greatest(contact_log.occurred_at, excluded.occurred_at);
