-- Privacy-bewuste weergave van een ONTDEKT familielid uit een ander netwerk.
-- Geeft alleen data terug als p_id echt bereikbaar is via een bevestigde
-- gedeelde-persoon-koppeling. Bewust GEEN geboortedatum/woonplaats/contact —
-- die blijven privé tot er (later) toestemming is (§18). Naam + pad wél.
create or replace function public.ontdekt_profiel(me uuid, p_id uuid)
returns table(id uuid, voornaam text, achternaam text, photo_url text,
              ander_familie text, brug_naam text, mijn_kant text, hun_kant text)
language sql stable security definer set search_path to 'public' as $$
  with mijn_net as (select network_id as n from persons where id = me),
  links as (
    select case when pa.network_id = (select n from mijn_net) then pl.person_a else pl.person_b end as my_node,
           case when pa.network_id = (select n from mijn_net) then pl.person_b else pl.person_a end as brug_node
    from person_links pl
    join persons pa on pa.id = pl.person_a
    join persons pb on pb.id = pl.person_b
    where ( pa.network_id = (select n from mijn_net) and pb.network_id <> (select n from mijn_net) )
       or ( pb.network_id = (select n from mijn_net) and pa.network_id <> (select n from mijn_net) )
  )
  select d.id, d.first_name, d.last_name, d.photo_url, fn.name,
         mn.first_name, relation_label(me, l.my_node), relation_label(l.brug_node, d.id)
  from links l
  join persons bn on bn.id = l.brug_node
  join persons mn on mn.id = l.my_node
  join persons d on d.network_id = bn.network_id and d.id = p_id
  join family_networks fn on fn.id = bn.network_id
  limit 1;
$$;
grant execute on function public.ontdekt_profiel(uuid, uuid) to authenticated;
revoke execute on function public.ontdekt_profiel(uuid, uuid) from anon;
