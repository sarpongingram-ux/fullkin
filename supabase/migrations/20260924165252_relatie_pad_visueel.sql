-- Het zichtbare verwantschapspad (§12): de keten van personen van jou naar de
-- ander, via ouder- en partner-relaties (kortste pad, breedte-eerst).
create or replace function public.relatie_pad(me uuid, other uuid)
returns table(pos int, naam text)
language sql stable security definer set search_path to 'public' as $$
  with recursive edges as (
    select from_person as a, to_person as b from relationships where kind = 'parent'
    union all select to_person, from_person from relationships where kind = 'parent'
    union all select from_person, to_person from relationships where kind = 'partner'
    union all select to_person, from_person from relationships where kind = 'partner'
  ),
  bfs as (
    select me as node, array[me] as path, 0 as depth
    union all
    select e.b, bfs.path || e.b, bfs.depth + 1
    from bfs
    join edges e on e.a = bfs.node
    where not (e.b = any(bfs.path)) and bfs.depth < 8
  ),
  gevonden as (
    select path from bfs where node = other order by depth limit 1
  )
  select p.ord::int, pe.first_name || ' ' || pe.last_name
  from gevonden g, unnest(g.path) with ordinality as p(pid, ord)
  join persons pe on pe.id = p.pid
  order by p.ord;
$$;
grant execute on function public.relatie_pad(uuid, uuid) to authenticated;
revoke execute on function public.relatie_pad(uuid, uuid) from anon;
