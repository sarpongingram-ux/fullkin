-- Matching-kalibratie: maak de score data-gedreven afstembaar op de beslissingshistorie.
--
-- Nu is er te weinig gelabelde data om gewichten op te kalibreren (overfitten op N=1 is
-- geen kalibratie). Deze migratie bouwt daarom het FUNDAMENT:
--   1. de labelset compleet maken — bevestig_persoon_match legt de bevestiging voortaan óók
--      als 'confirmed'-beslissing vast (naast person_links), zodat positieven én negatieven
--      samen beschikbaar zijn;
--   2. een evaluatiefunctie matching_kalibratie() die de huidige score tegen die historie
--      afzet (scheiding bevestigd vs. afgewezen, nauwkeurigheid, voorgestelde drempel).
-- De gewichten zelf blijven ongewijzigd tot er genoeg data is (zie MATCHING_KALIBRATIE.md).

-- 1. bevestig_persoon_match legt de bevestiging ook als beslissing vast (labelset).
create or replace function public.bevestig_persoon_match(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path to 'public'
as $function$
declare a uuid; b uuid;
begin
  if p_a = p_b then raise exception 'Ongeldige match.'; end if;
  a := least(p_a, p_b); b := greatest(p_a, p_b);
  if auth.role() <> 'service_role' then
    if not exists (
      select 1 from persons where id in (p_a, p_b) and network_id in (select my_networks())
    ) then
      raise exception 'Je mag deze match niet bevestigen.';
    end if;
    if coalesce(match_score(p_a, p_b), 0) < 45 then
      raise exception 'Je mag deze match niet bevestigen.';
    end if;
  end if;
  insert into person_links (person_a, person_b, confirmed_by)
    values (a, b, me())
  on conflict (person_a, person_b) do nothing;
  -- Labelset voor kalibratie: bevestiging ook als beslissing vastleggen.
  insert into person_match_decisions (person_a, person_b, decision, decided_by)
    values (a, b, 'confirmed', me())
  on conflict (person_a, person_b)
    do update set decision = 'confirmed', decided_by = me(), decided_at = now();
end;
$function$;

-- 2. Evaluatie van de huidige score tegen de beslissingshistorie.
create or replace function public.matching_kalibratie()
returns jsonb language sql stable security definer set search_path = public as $$
  with confirmed as (select match_score(person_a, person_b) as s from person_links),
       rejected  as (select match_score(person_a, person_b) as s
                     from person_match_decisions where decision = 'rejected'),
       cs as (select count(*) n, min(s) mn, round(avg(s))::int av, max(s) mx from confirmed),
       rs as (select count(*) n, min(s) mn, round(avg(s))::int av, max(s) mx from rejected)
  select jsonb_build_object(
    'drempel', 45,
    'bevestigd', jsonb_build_object(
      'n', (select n from cs), 'min', (select mn from cs), 'avg', (select av from cs),
      'max', (select mx from cs), 'boven_drempel', (select count(*) from confirmed where s >= 45)),
    'afgewezen', jsonb_build_object(
      'n', (select n from rs), 'min', (select mn from rs), 'avg', (select av from rs),
      'max', (select mx from rs), 'onder_drempel', (select count(*) from rejected where s < 45)),
    'nauwkeurigheid_pct', (
      case when (select n from cs) + (select n from rs) = 0 then null
      else round(100.0 * ((select count(*) from confirmed where s >= 45)
                        + (select count(*) from rejected where s < 45))
                 / ((select n from cs) + (select n from rs)))::int end),
    'voorgestelde_drempel', (
      case when (select n from cs) > 0 and (select n from rs) > 0
                and (select mx from rs) < (select mn from cs)
      then ((select mx from rs) + (select mn from cs)) / 2 else null end),
    'genoeg_data', ((select n from cs) >= 10 and (select n from rs) >= 10)
  );
$$;
revoke execute on function public.matching_kalibratie() from public, anon, authenticated;
grant execute on function public.matching_kalibratie() to service_role;
