-- Verfijning matching: concreet gedeelde-verwanten-signaal (zie MATCHING_ARCHITECTURE.md).
--
-- Voorheen gaf match_score +15 zodra twee families ergens verbonden waren — grof. Nu wegen
-- we CONCRETE gedeelde verwanten: als een ouder/kind/partner van A al via person_links
-- gekoppeld is aan een ouder/kind/partner van B, is dat sterk bewijs dat A en B dezelfde
-- persoon zijn. De grove "families verbonden"-hint blijft als zwakke terugval (+8).

-- ---------------------------------------------------------------------------
-- gedeelde_verwanten_score(a, b): 0–40 op basis van gekoppelde gedeelde verwanten.
-- ---------------------------------------------------------------------------
create or replace function public.gedeelde_verwanten_score(p_a uuid, p_b uuid)
returns int language sql stable security definer set search_path = public as $$
  select least(40,
    -- Gedeelde (gekoppelde) ouder.
    (case when exists (
       select 1
       from relationships ra
       join relationships rb on rb.kind = 'parent' and rb.to_person = p_b
       join person_links pl on pl.person_a = least(ra.from_person, rb.from_person)
                           and pl.person_b = greatest(ra.from_person, rb.from_person)
       where ra.kind = 'parent' and ra.to_person = p_a
     ) then 25 else 0 end)
    -- Gedeeld (gekoppeld) kind.
  + (case when exists (
       select 1
       from relationships ra
       join relationships rb on rb.kind = 'parent' and rb.from_person = p_b
       join person_links pl on pl.person_a = least(ra.to_person, rb.to_person)
                           and pl.person_b = greatest(ra.to_person, rb.to_person)
       where ra.kind = 'parent' and ra.from_person = p_a
     ) then 15 else 0 end)
    -- Gedeelde (gekoppelde) partner (incl. former_partner).
  + (case when exists (
       select 1
       from relationships ra
       join relationships rb on rb.kind in ('partner','former_partner')
                            and (rb.from_person = p_b or rb.to_person = p_b)
       join person_links pl on pl.person_a = least(
                                 case when ra.from_person = p_a then ra.to_person else ra.from_person end,
                                 case when rb.from_person = p_b then rb.to_person else rb.from_person end)
                           and pl.person_b = greatest(
                                 case when ra.from_person = p_a then ra.to_person else ra.from_person end,
                                 case when rb.from_person = p_b then rb.to_person else rb.from_person end)
       where ra.kind in ('partner','former_partner') and (ra.from_person = p_a or ra.to_person = p_a)
     ) then 15 else 0 end)
  );
$$;
revoke execute on function public.gedeelde_verwanten_score(uuid,uuid) from anon;
grant execute on function public.gedeelde_verwanten_score(uuid,uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- match_score: verwanten-onderdeel vervangen door het concrete signaal (met terugval).
-- ---------------------------------------------------------------------------
create or replace function public.match_score(p_a uuid, p_b uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when a.network_id = b.network_id then 0 else
    least(100, greatest(0,
      greatest(
        case when naam_norm(a.first_name||a.last_name) = naam_norm(b.first_name||b.last_name) then 55 else 0 end,
        case when a.birth_name is not null and b.birth_name is not null
              and naam_norm(a.birth_name) = naam_norm(b.birth_name) then 55 else 0 end,
        round(45 * similarity(naam_norm(a.first_name||a.last_name), naam_norm(b.first_name||b.last_name)))::int
      )
      + case
          when a.born_on is not null and b.born_on is not null and a.born_on = b.born_on then 30
          when a.born_on is not null and b.born_on is not null and abs(a.born_on - b.born_on) <= 366 then 12
          when a.born_on is not null and b.born_on is not null then -40
          else 0
        end
      -- Gedeelde verwanten (concreet) met zwakke terugval op "families verbonden".
      + greatest(
          gedeelde_verwanten_score(a.id, b.id),
          case when exists (
            select 1 from person_links pl
            join persons xa on xa.id = pl.person_a
            join persons xb on xb.id = pl.person_b
            where (xa.network_id = a.network_id and xb.network_id = b.network_id)
               or (xa.network_id = b.network_id and xb.network_id = a.network_id)
          ) then 8 else 0 end
        )
      + case when a.city is not null and b.city is not null and lower(a.city) = lower(b.city) then 6
             when a.country is not null and a.country = b.country then 3 else 0 end
    )) end
  from persons a, persons b
  where a.id = p_a and b.id = p_b;
$$;

-- ---------------------------------------------------------------------------
-- mogelijke_matches: reden-tekst verrijken met "gedeelde familie".
-- ---------------------------------------------------------------------------
create or replace function public.mogelijke_matches(me uuid)
returns table(mijn_id uuid, mijn_naam text, ander_id uuid, ander_naam text,
              ander_familie text, signaal text, score int)
language sql stable security definer set search_path to 'public'
as $function$
  with mijn_net as (
    select network_id as n from persons where id = me and mag_vantage(me)
  ),
  paren as (
    select mp.id mp_id, mp.first_name mp_f, mp.last_name mp_l,
           op.id op_id, op.first_name op_f, op.last_name op_l, op.network_id op_net,
           match_score(mp.id, op.id) as sc,
           (naam_norm(mp.first_name||mp.last_name) = naam_norm(op.first_name||op.last_name)
            or (mp.birth_name is not null and op.birth_name is not null
                and naam_norm(mp.birth_name) = naam_norm(op.birth_name))) as naam_exact,
           (mp.born_on is not null and op.born_on is not null and mp.born_on = op.born_on) as gebdatum_gelijk,
           (mp.born_on is not null and op.born_on is not null and mp.born_on <> op.born_on
            and abs(mp.born_on - op.born_on) <= 366) as gebjaar_dichtbij,
           (mp.city is not null and op.city is not null and lower(mp.city) = lower(op.city)) as zelfde_stad,
           (gedeelde_verwanten_score(mp.id, op.id) > 0) as gedeeld_verwant
    from persons mp
    join persons op
      on op.network_id <> mp.network_id
     and (
        naam_norm(mp.first_name||mp.last_name) = naam_norm(op.first_name||op.last_name)
        or (mp.birth_name is not null and op.birth_name is not null
            and naam_norm(mp.birth_name) = naam_norm(op.birth_name))
        or similarity(naam_norm(mp.first_name||mp.last_name), naam_norm(op.first_name||op.last_name)) > 0.4
     )
    where mp.network_id = (select n from mijn_net)
  )
  select p.mp_id, p.mp_f || ' ' || p.mp_l, p.op_id, p.op_f || ' ' || p.op_l, fn.name,
    concat_ws(' · ',
      case when p.naam_exact then 'Zelfde naam' else 'Vergelijkbare naam' end,
      case when p.gebdatum_gelijk then 'zelfde geboortedatum'
           when p.gebjaar_dichtbij then 'geboortejaar dichtbij' end,
      case when p.gedeeld_verwant then 'gedeelde familie' end,
      case when p.zelfde_stad then 'zelfde woonplaats' end
    ),
    p.sc
  from paren p
  join family_networks fn on fn.id = p.op_net
  where p.sc >= 45
    and not exists (
      select 1 from person_links pl
      where pl.person_a = least(p.mp_id, p.op_id) and pl.person_b = greatest(p.mp_id, p.op_id)
    )
    and not exists (
      select 1 from person_match_decisions d
      where d.person_a = least(p.mp_id, p.op_id) and d.person_b = greatest(p.mp_id, p.op_id)
        and d.decision = 'rejected'
    )
  order by p.sc desc, p.mp_f;
$function$;
