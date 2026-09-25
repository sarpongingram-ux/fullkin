-- FULLKIN — clean-DB reproductie-assertie (P1.3).
-- Draait tegen een VERSE database die is opgebouwd uit supabase/migrations/* (+ seed).
-- Faalt (ON_ERROR_STOP) zodra een kernobject ontbreekt, een tabel geen RLS heeft, de
-- former_partner-enumwaarde mist, of de seed-familie niet volledig is geladen.

-- 1) Kern-tabellen en -functies aanwezig.
do $$
declare
  miss text[] := '{}';
  tbls text[] := array[
    'family_networks','persons','relationships','invites','person_links',
    'begroetingen','memberships','notifications'
  ];
  fns text[] := array[
    -- identiteit/hulp
    'me','my_networks','has_role','mag_vantage',
    -- relatie-engine
    'ancestors_of','descendants_of','siblings_of','relation_label','relation_route','relatie_pad',
    -- discovery
    'mogelijke_matches','bevestig_persoon_match','ontdekte_familie','ontdekt_profiel','naam_norm',
    -- core UX
    'familie_vorm','partner_nudge',
    -- claim
    'invite_preview','claim_invite',
    -- testfixtures
    'laad_testfamilie','verwijder_testnetwerk'
  ];
  x text;
begin
  foreach x in array tbls loop
    if to_regclass('public.'||x) is null then miss := miss || ('table:'||x); end if;
  end loop;
  foreach x in array fns loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname = x
    ) then miss := miss || ('function:'||x); end if;
  end loop;
  if coalesce(array_length(miss,1),0) > 0 then
    raise exception 'Ontbrekende kernobjecten na clean build: %', array_to_string(miss, ', ');
  end if;
  raise notice 'OBJECTEN OK: alle kern-tabellen en -functies aanwezig.';
end $$;

-- 2) relationship_kind bevat 'former_partner'.
do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname='relationship_kind' and e.enumlabel='former_partner'
  ) then
    raise exception 'enum relationship_kind mist waarde former_partner';
  end if;
  raise notice 'ENUM OK: relationship_kind.former_partner aanwezig.';
end $$;

-- 3) Elke public tabel heeft RLS ingeschakeld.
do $$
declare n int; lijst text;
begin
  select count(*), string_agg(tablename, ', ') into n, lijst
  from pg_tables where schemaname='public' and rowsecurity = false;
  if n > 0 then raise exception '% public tabel(len) zonder RLS: %', n, lijst; end if;
  raise notice 'RLS OK: alle public tabellen hebben RLS.';
end $$;

-- 4) Seed-sanity: de deterministische Carter-testfamilie is geladen (>=17 personen).
do $$
declare n int;
begin
  select count(*) into n from persons p join family_networks f on f.id = p.network_id
  where f.name = 'TEST — Carter';
  if n < 17 then raise exception 'Seed Carter onvolledig: % personen (verwacht >= 17)', n; end if;
  raise notice 'SEED OK: Carter-familie heeft % personen.', n;
end $$;

\echo 'FULLKIN DB-REPRODUCTIE: PASS'
