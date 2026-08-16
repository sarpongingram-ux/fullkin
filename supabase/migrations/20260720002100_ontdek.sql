-- Fullkin — Ontdeklaag in het album
--
-- Een foto waarop twee mensen samen staan die nog niet met elkaar verbonden
-- zijn op de familiekaart, is een hint: misschien horen ze bij elkaar. Deze
-- functie vindt zulke paren — samen op de foto, maar de relatie is nog niet in
-- kaart gebracht (relation_label = 'familie'). Het is een suggestie, geen
-- automatische wijziging: de afgeleide-relatie-wet blijft intact.

create or replace function ontdek_verbindingen()
returns table (
  a_id uuid, a_naam text, b_id uuid, b_naam text, samen int
)
language sql stable security definer set search_path = public as $$
  with paren as (
    select
      t1.person_id as a,
      t2.person_id as b,
      count(distinct t1.album_item_id) as samen
    from album_tags t1
    join album_tags t2
      on t2.album_item_id = t1.album_item_id
     and t1.person_id < t2.person_id
    join album_items i on i.id = t1.album_item_id
    where i.network_id in (select my_networks())
    group by t1.person_id, t2.person_id
  )
  select
    p.a, pa.first_name || ' ' || pa.last_name,
    p.b, pb.first_name || ' ' || pb.last_name,
    p.samen::int
  from paren p
  join persons pa on pa.id = p.a
  join persons pb on pb.id = p.b
  where relation_label(p.a, p.b) = 'familie'
  order by p.samen desc, pa.first_name;
$$;

revoke execute on function ontdek_verbindingen() from public, anon;
grant execute on function ontdek_verbindingen() to authenticated;
