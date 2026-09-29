-- UX (live-audit O1/O2/O4): warmere, gegenderde relatie-labels + beide gedeelde voorouders.
--
-- O1: optioneel geslacht op personen → 'oom'/'tante' i.p.v. 'oom of tante' (null = neutraal).
-- O2: de zin op het ontdekt-profiel wordt daardoor natuurlijker (frontend).
-- O4: relation_route noemt bij volle neven/nichten BEIDE gemeenschappelijke voorouders.

alter table public.persons add column if not exists geslacht text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'persons_geslacht_check'
                 and conrelid = 'public.persons'::regclass) then
    alter table public.persons add constraint persons_geslacht_check
      check (geslacht in ('man','vrouw'));
  end if;
end $$;

-- Kies man/vrouw/neutraal op basis van geslacht.
create or replace function public.gelabel(p_man text, p_vrouw text, p_neutraal text, p_ges text)
returns text language sql immutable as $$
  select case p_ges when 'man' then p_man when 'vrouw' then p_vrouw else p_neutraal end;
$$;

-- Gegenderde relatie-label van 'other' t.o.v. 'me' (neutraal als geslacht onbekend).
create or replace function public.relation_label(me uuid, other uuid)
returns text language plpgsql stable set search_path to 'public'
as $function$
declare up_gen int; down_gen int; lo int; diff int; base text; gedeeld int; ges text;
begin
  if me = other then return 'jij'; end if;
  select geslacht into ges from persons where id = other;
  if exists (select 1 from relationships where kind='partner'
      and ((from_person=me and to_person=other) or (from_person=other and to_person=me))) then
    return 'partner';
  end if;
  if exists (select 1 from relationships where kind='former_partner'
      and ((from_person=me and to_person=other) or (from_person=other and to_person=me))) then
    return 'ex-partner';
  end if;
  select generations into up_gen from ancestors_of(me) where person_id = other;
  if up_gen is not null then
    return case up_gen
      when 1 then gelabel('vader','moeder','ouder', ges)
      when 2 then gelabel('opa','oma','grootouder', ges)
      when 3 then gelabel('overgrootvader','overgrootmoeder','overgrootouder', ges)
      when 4 then gelabel('betovergrootvader','betovergrootmoeder','betovergrootouder', ges)
      else 'voorouder ('||up_gen||' generaties terug)' end;
  end if;
  select generations into down_gen from descendants_of(me) where person_id = other;
  if down_gen is not null then
    return case down_gen
      when 1 then gelabel('zoon','dochter','kind', ges)
      when 2 then gelabel('kleinzoon','kleindochter','kleinkind', ges)
      when 3 then gelabel('achterkleinzoon','achterkleindochter','achterkleinkind', ges)
      when 4 then gelabel('achterachterkleinzoon','achterachterkleindochter','achterachterkleinkind', ges)
      else 'nakomeling ('||down_gen||' generaties verder)' end;
  end if;
  select a.generations, b.generations into up_gen, down_gen
  from ancestors_of(me) a join ancestors_of(other) b on a.person_id=b.person_id
  order by a.generations+b.generations, abs(a.generations-b.generations) limit 1;
  if up_gen is null then return 'familie'; end if;
  lo := least(up_gen, down_gen); diff := abs(up_gen - down_gen);
  if lo = 1 then
    if diff = 0 then
      select count(*) into gedeeld
      from relationships r1 join relationships r2 on r1.from_person = r2.from_person
      where r1.kind='parent' and r2.kind='parent' and r1.to_person = me and r2.to_person = other;
      if gedeeld >= 2 then return gelabel('broer','zus','broer of zus', ges);
      else return gelabel('halfbroer','halfzus','halfbroer of halfzus', ges); end if;
    end if;
    if up_gen < down_gen then
      if diff = 1 then return gelabel('neef','nicht','neef of nicht', ges); end if;
      if diff = 2 then return gelabel('achterneef','achternicht','achterneef of achternicht', ges); end if;
      return gelabel('achterneef','achternicht','achterneef of achternicht', ges)||' ('||(diff-1)||'x verwijderd)';
    else
      if diff = 1 then return gelabel('oom','tante','oom of tante', ges); end if;
      if diff = 2 then return gelabel('oudoom','oudtante','oudoom of oudtante', ges); end if;
      return gelabel('oudoom','oudtante','oudoom of oudtante', ges)||' ('||(diff-2)||'x verwijderd)';
    end if;
  end if;
  if diff = 0 then
    return case lo when 2 then gelabel('neef','nicht','neef of nicht', ges)
      when 3 then gelabel('achterneef','achternicht','achterneef of achternicht', ges)
      when 4 then 'achter-achterneef of achter-achternicht'
      else 'verre neef of nicht ('||lo||'e graad)' end;
  end if;
  base := case lo when 2 then gelabel('neef','nicht','neef of nicht', ges)
    when 3 then gelabel('achterneef','achternicht','achterneef of achternicht', ges)
    else 'achter-achterneef of achter-achternicht' end;
  return base || ' (' || diff || 'x verwijderd)';
end;
$function$;

-- O4: relation_route noemt beide gemeenschappelijke voorouders (bv. opa én oma).
create or replace function public.relation_route(me uuid, other uuid)
returns text language plpgsql stable security definer set search_path to 'public'
as $function$
declare up_gen int; down_gen int; anc uuid;
  anc_namen text[]; anc_txt text; other_naam text; mijn_tak text; hun_tak text; gedeeld int;
begin
  if not mag_vantage(me) then raise exception 'Niet toegestaan.'; end if;
  if me = other then return 'Dit ben jij.'; end if;
  if exists (select 1 from relationships where kind='partner'
      and ((from_person=me and to_person=other) or (from_person=other and to_person=me))) then
    return 'Jullie zijn partners.';
  end if;
  if exists (select 1 from relationships where kind='former_partner'
      and ((from_person=me and to_person=other) or (from_person=other and to_person=me))) then
    return 'Jullie waren eerder partners.';
  end if;
  select first_name||' '||last_name into other_naam from persons where id = other;
  select generations into up_gen from ancestors_of(me) where person_id = other;
  if up_gen is not null then
    return other_naam || ' is jouw directe voorouder, ' || up_gen || ' generatie(s) terug.';
  end if;
  select generations into down_gen from descendants_of(me) where person_id = other;
  if down_gen is not null then
    return other_naam || ' is jouw directe nakomeling, ' || down_gen || ' generatie(s) verder.';
  end if;
  select a.person_id, a.generations, b.generations into anc, up_gen, down_gen
  from ancestors_of(me) a join ancestors_of(other) b on a.person_id=b.person_id
  order by a.generations+b.generations, abs(a.generations-b.generations) limit 1;
  if anc is null then return 'Jullie verbinding is nog niet volledig in kaart gebracht.'; end if;
  if up_gen = 1 and down_gen = 1 then
    select count(*) into gedeeld
    from relationships r1 join relationships r2 on r1.from_person = r2.from_person
    where r1.kind='parent' and r2.kind='parent' and r1.to_person = me and r2.to_person = other;
    if gedeeld >= 2 then return 'Jullie zijn broer en zus, met dezelfde ouders.';
    else
      select first_name into anc_txt from persons where id = anc;
      return 'Jullie zijn halfbroer of halfzus — jullie delen één ouder: ' || anc_txt || '.';
    end if;
  end if;
  -- Alle gedeelde voorouders op het dichtstbijzijnde niveau (meestal een (groot)ouderpaar).
  select array_agg(p.first_name order by p.first_name) into anc_namen
  from ancestors_of(me) a join ancestors_of(other) b on a.person_id = b.person_id
  join persons p on p.id = a.person_id
  where a.generations = up_gen and b.generations = down_gen;
  if coalesce(array_length(anc_namen,1),0) >= 2 then
    anc_txt := 'Jullie gemeenschappelijke voorouders zijn ' || array_to_string(anc_namen, ' en ');
  else
    anc_txt := 'Jullie gemeenschappelijke voorouder is ' || anc_namen[1];
  end if;
  select p.first_name into mijn_tak
  from relationships r join persons p on p.id = r.to_person
  where r.kind='parent' and r.from_person = anc
    and (r.to_person = me or r.to_person in (select person_id from ancestors_of(me))) limit 1;
  select p.first_name into hun_tak
  from relationships r join persons p on p.id = r.to_person
  where r.kind='parent' and r.from_person = anc
    and (r.to_person = other or r.to_person in (select person_id from ancestors_of(other))) limit 1;
  return anc_txt || '. Aan jouw kant via ' || coalesce(mijn_tak,'?')
    || ', aan de kant van ' || other_naam || ' via ' || coalesce(hun_tak,'?') || '.';
end;
$function$;

-- add_family_member met optioneel geslacht (oude 9-arg versie droppen).
drop function if exists public.add_family_member(text,text,text,uuid,text,text,date,boolean,relationship_origin);
create or replace function public.add_family_member(
  p_voornaam text,
  p_achternaam text,
  p_relatie text,
  p_anker uuid default null,
  p_stad text default null,
  p_land text default null,
  p_geboortedatum date default null,
  p_is_kind boolean default false,
  p_origin relationship_origin default 'biological',
  p_geslacht text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  mij uuid; net uuid; anker uuid; anker_net uuid; nieuw uuid; ph uuid;
  ouder_ids uuid[] := '{}'; oid uuid; ges text;
begin
  if p_voornaam is null or btrim(p_voornaam) = '' or p_achternaam is null or btrim(p_achternaam) = '' then
    raise exception 'Vul een voor- en achternaam in.';
  end if;
  if p_relatie not in ('ouder','kind','partner','ex_partner','broer_zus') then
    raise exception 'Kies hoe dit familielid verbonden is.';
  end if;
  ges := case when p_geslacht in ('man','vrouw') then p_geslacht else null end;

  mij := me();
  if mij is null then raise exception 'Je account is nog niet gekoppeld.'; end if;
  select network_id into net from persons where id = mij;
  if net is null then raise exception 'Je profiel is niet gevonden.'; end if;

  if netwerk_bevroren(net) then
    raise exception 'Deze familie staat op pauze. Heractiveer ''m om weer te kunnen bewerken.';
  end if;

  anker := coalesce(p_anker, mij);
  select network_id into anker_net from persons where id = anker;
  if anker_net is null or anker_net <> net then
    raise exception 'Kies een geldig familielid om aan te koppelen.';
  end if;

  if p_relatie = 'broer_zus' then
    select coalesce(array_agg(from_person), '{}') into ouder_ids
    from relationships where kind = 'parent' and to_person = anker;
  end if;

  insert into persons (network_id, first_name, last_name, city, country, born_on, geslacht, managed_by, created_by)
  values (net, btrim(p_voornaam), btrim(p_achternaam), p_stad, p_land, p_geboortedatum, ges,
          case when p_is_kind then mij else null end, auth.uid())
  returning id into nieuw;

  if p_relatie = 'broer_zus' and coalesce(array_length(ouder_ids,1),0) = 0 then
    insert into persons (network_id, first_name, last_name, created_by)
    values (net, 'Onbekende', btrim(p_achternaam), auth.uid())
    returning id into ph;
    insert into relationships (network_id, kind, origin, from_person, to_person, created_by)
    values (net, 'parent', p_origin, ph, anker, auth.uid());
    ouder_ids := array[ph];
  end if;

  if p_relatie = 'ouder' then
    insert into relationships (network_id, kind, origin, from_person, to_person, created_by)
    values (net, 'parent', p_origin, nieuw, anker, auth.uid());
  elsif p_relatie = 'kind' then
    insert into relationships (network_id, kind, origin, from_person, to_person, created_by)
    values (net, 'parent', p_origin, anker, nieuw, auth.uid());
  elsif p_relatie = 'partner' then
    insert into relationships (network_id, kind, origin, from_person, to_person, created_by)
    values (net, 'partner', p_origin, least(anker, nieuw), greatest(anker, nieuw), auth.uid());
  elsif p_relatie = 'ex_partner' then
    insert into relationships (network_id, kind, origin, from_person, to_person, created_by)
    values (net, 'former_partner', p_origin, least(anker, nieuw), greatest(anker, nieuw), auth.uid());
  elsif p_relatie = 'broer_zus' then
    foreach oid in array ouder_ids loop
      insert into relationships (network_id, kind, origin, from_person, to_person, created_by)
      values (net, 'parent', p_origin, oid, nieuw, auth.uid());
    end loop;
  end if;

  return nieuw;
end $$;
revoke execute on function public.add_family_member(text,text,text,uuid,text,text,date,boolean,relationship_origin,text) from anon;
grant execute on function public.add_family_member(text,text,text,uuid,text,text,date,boolean,relationship_origin,text) to authenticated, service_role;
