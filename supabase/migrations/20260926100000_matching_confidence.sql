-- Matching-confidence-laag (zie MATCHING_ARCHITECTURE.md).
--
-- Van harde exacte-naam-match naar een gewogen confidence-score (0–100) met fuzzy
-- naamherkenning (pg_trgm). mogelijke_matches rangschikt op score en toont een drempel;
-- bevestig_persoon_match gebruikt DEZELFDE score als poort (zodat elke getoonde kandidaat
-- ook bevestigd kan worden, en niets daarbuiten). Menselijke bevestiging blijft de
-- eindbeslissing; geen automatische merge.

create extension if not exists pg_trgm;

-- Trigram-index voor de blocking/fuzzy-vergelijking (naam_norm is IMMUTABLE).
create index if not exists persons_naam_trgm
  on persons using gin (naam_norm(first_name || last_name) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- match_score(a, b): confidence dat twee personen dezelfde mens zijn (0–100).
-- Signalen: naam (exact/geboortenaam/fuzzy), geboortedatum (gelijk/dichtbij/afwijkend),
-- reeds verbonden families, en locatie. Verschillende families is een voorwaarde
-- (personen in hetzelfde netwerk zijn per definitie geen cross-family match).
-- ---------------------------------------------------------------------------
create or replace function public.match_score(p_a uuid, p_b uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when a.network_id = b.network_id then 0 else
    least(100, greatest(0,
      -- Naam (beste van: exacte naam, exacte geboortenaam, fuzzy naam-similariteit).
      greatest(
        case when naam_norm(a.first_name||a.last_name) = naam_norm(b.first_name||b.last_name) then 55 else 0 end,
        case when a.birth_name is not null and b.birth_name is not null
              and naam_norm(a.birth_name) = naam_norm(b.birth_name) then 55 else 0 end,
        round(45 * similarity(naam_norm(a.first_name||a.last_name), naam_norm(b.first_name||b.last_name)))::int
      )
      -- Geboortedatum.
      + case
          when a.born_on is not null and b.born_on is not null and a.born_on = b.born_on then 30
          when a.born_on is not null and b.born_on is not null and abs(a.born_on - b.born_on) <= 366 then 12
          when a.born_on is not null and b.born_on is not null then -40  -- duidelijk verschillend → sterk negatief
          else 0
        end
      -- Families al verbonden via een eerdere bevestigde brug.
      + case when exists (
          select 1 from person_links pl
          join persons xa on xa.id = pl.person_a
          join persons xb on xb.id = pl.person_b
          where (xa.network_id = a.network_id and xb.network_id = b.network_id)
             or (xa.network_id = b.network_id and xb.network_id = a.network_id)
        ) then 15 else 0 end
      -- Locatie.
      + case when a.city is not null and b.city is not null and lower(a.city) = lower(b.city) then 6
             when a.country is not null and a.country = b.country then 3 else 0 end
    )) end
  from persons a, persons b
  where a.id = p_a and b.id = p_b;
$$;
revoke execute on function public.match_score(uuid,uuid) from anon;
grant execute on function public.match_score(uuid,uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- mogelijke_matches: fuzzy blocking → score → drempel (45) → rangschikking.
-- (De returnvorm krijgt een extra kolom 'score', dus eerst droppen.)
-- ---------------------------------------------------------------------------
drop function if exists public.mogelijke_matches(uuid);
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
           (mp.city is not null and op.city is not null and lower(mp.city) = lower(op.city)) as zelfde_stad
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
      case when p.zelfde_stad then 'zelfde woonplaats' end
    ),
    p.sc
  from paren p
  join family_networks fn on fn.id = p.op_net
  where p.sc >= 45                                   -- drempel; zie MATCHING_ARCHITECTURE.md
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

-- ---------------------------------------------------------------------------
-- bevestig_persoon_match: zelfde score-poort als mogelijke_matches (P1.8-veilig).
-- ---------------------------------------------------------------------------
create or replace function public.bevestig_persoon_match(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path to 'public'
as $function$
declare a uuid; b uuid;
begin
  if p_a = p_b then raise exception 'Ongeldige match.'; end if;
  a := least(p_a, p_b); b := greatest(p_a, p_b);
  if auth.role() <> 'service_role' then
    -- Aanroeper moet één kant bezitten.
    if not exists (
      select 1 from persons where id in (p_a, p_b) and network_id in (select my_networks())
    ) then
      raise exception 'Je mag deze match niet bevestigen.';
    end if;
    -- En het paar moet een echte kandidaat zijn (score boven de drempel).
    if coalesce(match_score(p_a, p_b), 0) < 45 then
      raise exception 'Je mag deze match niet bevestigen.';
    end if;
  end if;
  insert into person_links (person_a, person_b, confirmed_by)
    values (a, b, me())
  on conflict (person_a, person_b) do nothing;
end;
$function$;
