-- Matching toleranter: accenten (José=Jose), tussenvoegsels (van der), hoofdletters
-- en spaties. Zonder extensies. Nog steeds mens-bevestigd, nooit auto-merge.
create or replace function public.naam_norm(t text)
returns text language sql immutable set search_path to 'public' as $$
  select regexp_replace(
    regexp_replace(
      translate(lower(coalesce(t,'')),
        'áàâäãåéèêëíìîïóòôöõúùûüýÿñç',
        'aaaaaaeeeeiiiiooooouuuuyync'),
      '\y(van der|van den|van de|van|de|den|der|ter|te|het|op|aan|tot)\y', '', 'g'),
    '[^a-z0-9]', '', 'g');
$$;

create or replace function public.mogelijke_matches(me uuid)
returns table(mijn_id uuid, mijn_naam text, ander_id uuid, ander_naam text, ander_familie text, signaal text)
language sql stable security definer set search_path to 'public' as $$
  with mijn_net as (select network_id as n from persons where id = me)
  select mp.id, mp.first_name || ' ' || mp.last_name,
         op.id, op.first_name || ' ' || op.last_name,
         fn.name,
         case
           when naam_norm(mp.first_name||mp.last_name) = naam_norm(op.first_name||op.last_name)
                and mp.born_on is not null and mp.born_on = op.born_on
             then 'Zelfde naam en geboortedatum'
           when mp.birth_name is not null and op.birth_name is not null
                and naam_norm(mp.birth_name) = naam_norm(op.birth_name)
             then 'Zelfde geboortenaam'
           else 'Zelfde naam'
         end
  from persons mp
  join persons op
    on op.network_id <> mp.network_id
   and (mp.born_on is null or op.born_on is null or mp.born_on = op.born_on)
   and (
        naam_norm(mp.first_name||mp.last_name) = naam_norm(op.first_name||op.last_name)
     or (mp.birth_name is not null and op.birth_name is not null
         and naam_norm(mp.birth_name) = naam_norm(op.birth_name))
   )
  join family_networks fn on fn.id = op.network_id
  where mp.network_id = (select n from mijn_net)
    and not exists (
      select 1 from person_links pl
      where pl.person_a = least(mp.id, op.id) and pl.person_b = greatest(mp.id, op.id)
    )
  order by mp.first_name;
$$;
grant execute on function public.mogelijke_matches(uuid) to authenticated;
revoke execute on function public.mogelijke_matches(uuid) from anon;
