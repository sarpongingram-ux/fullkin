-- family_dreams geeft nu ook het aantal gevers terug, zodat de UI het totaal
-- kan verbergen zolang er te weinig gevers zijn (anders is iemands bedrag af te
-- leiden — zelfde privacyregel als bij collectes).
drop function if exists public.family_dreams();
create or replace function public.family_dreams()
returns table(
  dream_id uuid, person_id uuid, first_name text, last_name text, photo_url text,
  title text, target_cents integer, raised_cents bigint, collection_id uuid,
  status dream_status, contributor_count integer
)
language sql stable security definer set search_path to 'public'
as $function$
  select
    d.id, d.person_id, p.first_name, p.last_name, p.photo_url,
    d.title, d.target_cents,
    coalesce((
      select sum(c.amount_cents) from contributions c
      where c.collection_id = d.collection_id and c.status = 'betaald'
    ), 0)::bigint,
    d.collection_id,
    d.status,
    coalesce((
      select count(distinct c.contributor_id) from contributions c
      where c.collection_id = d.collection_id and c.status = 'betaald'
    ), 0)::int
  from dreams d
  join persons p on p.id = d.person_id
  where d.status = 'actief'
    and d.network_id in (select my_networks());
$function$;
