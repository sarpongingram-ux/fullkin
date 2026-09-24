-- Magic moment (North Star): laat zien dat de familie vorm krijgt en dat Fullkin
-- de relaties zelf herkent. leden = personen in je familie; herkend = mensen voor
-- wie automatisch een concrete verwantschap is berekend (niet het generieke label).
create or replace function public.familie_vorm(me uuid)
returns table(leden int, herkend int, generaties int)
language sql stable security definer set search_path to 'public' as $$
  select
    (select count(*)::int from persons
      where network_id = (select network_id from persons where id = me)),
    (select count(*)::int from family_map(me) where label <> 'familie'),
    (coalesce((select max(generations) from ancestors_of(me)), 0)
      + coalesce((select max(generations) from descendants_of(me)), 0) + 1);
$$;
grant execute on function public.familie_vorm(uuid) to authenticated;
revoke execute on function public.familie_vorm(uuid) from anon;
