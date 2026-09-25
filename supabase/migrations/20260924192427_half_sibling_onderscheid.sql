-- Z12: onderscheid volle broer/zus (2 gedeelde ouders) van halfbroer/halfzus (1).
create or replace function public.relation_label(me uuid, other uuid)
returns text language plpgsql stable set search_path to 'public' as $function$
declare up_gen int; down_gen int; lo int; diff int; base text; gedeeld int;
begin
  if me = other then return 'jij'; end if;
  if exists (select 1 from relationships where kind='partner'
      and ((from_person=me and to_person=other) or (from_person=other and to_person=me))) then
    return 'partner';
  end if;
  select generations into up_gen from ancestors_of(me) where person_id = other;
  if up_gen is not null then
    return case up_gen when 1 then 'ouder' when 2 then 'grootouder' when 3 then 'overgrootouder'
      when 4 then 'betovergrootouder' else 'voorouder ('||up_gen||' generaties terug)' end;
  end if;
  select generations into down_gen from descendants_of(me) where person_id = other;
  if down_gen is not null then
    return case down_gen when 1 then 'kind' when 2 then 'kleinkind' when 3 then 'achterkleinkind'
      when 4 then 'achterachterkleinkind' else 'nakomeling ('||down_gen||' generaties verder)' end;
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
      if gedeeld >= 2 then return 'broer of zus'; else return 'halfbroer of halfzus'; end if;
    end if;
    if up_gen < down_gen then
      if diff = 1 then return 'neef of nicht'; end if;
      if diff = 2 then return 'achterneef of achternicht'; end if;
      return 'achterneef of achternicht ('||(diff-1)||'x verwijderd)';
    else
      if diff = 1 then return 'oom of tante'; end if;
      if diff = 2 then return 'oudoom of oudtante'; end if;
      return 'oudoom of oudtante ('||(diff-2)||'x verwijderd)';
    end if;
  end if;
  if diff = 0 then
    return case lo when 2 then 'neef of nicht' when 3 then 'achterneef of achternicht'
      when 4 then 'achter-achterneef of achter-achternicht' else 'verre neef of nicht ('||lo||'e graad)' end;
  end if;
  base := case lo when 2 then 'neef of nicht' when 3 then 'achterneef of achternicht'
    else 'achter-achterneef of achter-achternicht' end;
  return base || ' (' || diff || 'x verwijderd)';
end;
$function$;

create or replace function public.relation_route(me uuid, other uuid)
returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare up_gen int; down_gen int; anc uuid;
  anc_naam text; other_naam text; mijn_tak text; hun_tak text; gedeeld int;
begin
  if me = other then return 'Dit ben jij.'; end if;
  if exists (select 1 from relationships where kind='partner'
      and ((from_person=me and to_person=other) or (from_person=other and to_person=me))) then
    return 'Jullie zijn partners.';
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
  select first_name||' '||last_name into anc_naam from persons where id = anc;
  if up_gen = 1 and down_gen = 1 then
    select count(*) into gedeeld
    from relationships r1 join relationships r2 on r1.from_person = r2.from_person
    where r1.kind='parent' and r2.kind='parent' and r1.to_person = me and r2.to_person = other;
    if gedeeld >= 2 then
      return 'Jullie zijn broer en zus, met dezelfde ouders.';
    else
      return 'Jullie zijn halfbroer of halfzus — jullie delen één ouder: ' || anc_naam || '.';
    end if;
  end if;
  select p.first_name into mijn_tak
  from relationships r join persons p on p.id = r.to_person
  where r.kind='parent' and r.from_person = anc
    and (r.to_person = me or r.to_person in (select person_id from ancestors_of(me))) limit 1;
  select p.first_name into hun_tak
  from relationships r join persons p on p.id = r.to_person
  where r.kind='parent' and r.from_person = anc
    and (r.to_person = other or r.to_person in (select person_id from ancestors_of(other))) limit 1;
  return 'Jullie gemeenschappelijke voorouder is ' || anc_naam
    || '. Aan jouw kant via ' || coalesce(mijn_tak,'?')
    || ', aan de kant van ' || other_naam || ' via ' || coalesce(hun_tak,'?') || '.';
end;
$function$;
