-- Fullkin — Volledige relatiegradaties + leesbare route
--
-- Breidt relation_label uit met de diepere graden (betovergrootouder,
-- achter-achterneef, oudoom, en "Nx verwijderd" voor asymmetrische neven).
-- De berekening blijft in de database: één recursieve query per relatie
-- (ancestors_of), niet honderden losse client-queries via een BFS.
--
-- De dichte labels ('ouder','kind','partner','broer of zus','oom of tante',
-- 'neef of nicht', grootouder…) blijven EXACT gelijk — de RLS-policy voor
-- collectes en de UI hangen ervan af. Alleen de diepere graden komen erbij.

create or replace function relation_label(me uuid, other uuid)
returns text
language plpgsql stable set search_path = public as $$
declare
  up_gen   int;   -- afstand van mij naar de gemeenschappelijke voorouder
  down_gen int;   -- afstand van de ander naar die voorouder
  lo       int;
  diff     int;
  base     text;
begin
  if me = other then return 'jij'; end if;

  -- Partner is symmetrisch en direct opgeslagen.
  if exists (
    select 1 from relationships
    where kind = 'partner'
      and ((from_person = me and to_person = other)
        or (from_person = other and to_person = me))
  ) then
    return 'partner';
  end if;

  -- Rechte lijn omhoog: de ander is mijn voorouder.
  select generations into up_gen from ancestors_of(me) where person_id = other;
  if up_gen is not null then
    return case up_gen
      when 1 then 'ouder'
      when 2 then 'grootouder'
      when 3 then 'overgrootouder'
      when 4 then 'betovergrootouder'
      else 'voorouder (' || up_gen || ' generaties terug)'
    end;
  end if;

  -- Rechte lijn omlaag: de ander is mijn nakomeling.
  select generations into down_gen from descendants_of(me) where person_id = other;
  if down_gen is not null then
    return case down_gen
      when 1 then 'kind'
      when 2 then 'kleinkind'
      when 3 then 'achterkleinkind'
      when 4 then 'achterachterkleinkind'
      else 'nakomeling (' || down_gen || ' generaties verder)'
    end;
  end if;

  -- Zijlijn: dichtstbijzijnde gemeenschappelijke voorouder.
  -- up_gen = mijn afstand tot die voorouder, down_gen = die van de ander.
  select a.generations, b.generations into up_gen, down_gen
  from ancestors_of(me) a
  join ancestors_of(other) b on a.person_id = b.person_id
  order by a.generations + b.generations, abs(a.generations - b.generations)
  limit 1;

  if up_gen is null then
    return 'familie';  -- verbinding nog niet volledig in kaart
  end if;

  lo   := least(up_gen, down_gen);
  diff := abs(up_gen - down_gen);

  -- Avunculaire lijn: één van beiden is een direct kind van de voorouder.
  -- Hier telt de richting: ben ik de oudere of de jongere generatie?
  if lo = 1 then
    if diff = 0 then
      return 'broer of zus';
    end if;
    if up_gen < down_gen then
      -- ik sta dichter bij de voorouder → de ander is jonger (mijn neef/nicht-lijn)
      if diff = 1 then return 'neef of nicht'; end if;              -- kind van mijn broer/zus
      if diff = 2 then return 'achterneef of achternicht'; end if;  -- kleinkind van mijn broer/zus
      return 'achterneef of achternicht (' || (diff - 1) || 'x verwijderd)';
    else
      -- de ander staat dichter bij de voorouder → de ander is ouder (mijn oom/tante-lijn)
      if diff = 1 then return 'oom of tante'; end if;
      if diff = 2 then return 'oudoom of oudtante'; end if;
      return 'oudoom of oudtante (' || (diff - 2) || 'x verwijderd)';
    end if;
  end if;

  -- Neef/nicht-territorium: beiden minstens twee generaties van de voorouder.
  if diff = 0 then
    return case lo
      when 2 then 'neef of nicht'                                  -- eerste neven
      when 3 then 'achterneef of achternicht'                      -- tweede neven
      when 4 then 'achter-achterneef of achter-achternicht'        -- derde neven
      else 'verre neef of nicht (' || lo || 'e graad)'
    end;
  end if;

  -- Asymmetrisch: neven met een generatieverschil ("Nx verwijderd").
  base := case lo
    when 2 then 'neef of nicht'
    when 3 then 'achterneef of achternicht'
    else 'achter-achterneef of achter-achternicht'
  end;
  return base || ' (' || diff || 'x verwijderd)';
end;
$$;

-- ---------------------------------------------------------------------------
-- relation_route — de verbinding in gewone taal ("Jullie delen dezelfde
-- ouder: X", "Jullie gemeenschappelijke voorouder is X. Aan jouw kant via Y…").
-- ---------------------------------------------------------------------------

create or replace function relation_route(me uuid, other uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  up_gen int; down_gen int; anc uuid;
  anc_naam text; other_naam text; mijn_tak text; hun_tak text;
begin
  if me = other then return 'Dit ben jij.'; end if;

  if exists (
    select 1 from relationships where kind = 'partner'
      and ((from_person = me and to_person = other)
        or (from_person = other and to_person = me))
  ) then
    return 'Jullie zijn partners.';
  end if;

  select first_name || ' ' || last_name into other_naam
  from persons where id = other;

  -- Rechte lijn omhoog / omlaag.
  select generations into up_gen from ancestors_of(me) where person_id = other;
  if up_gen is not null then
    return other_naam || ' is jouw directe voorouder, ' || up_gen
      || ' generatie(s) terug.';
  end if;
  select generations into down_gen from descendants_of(me) where person_id = other;
  if down_gen is not null then
    return other_naam || ' is jouw directe nakomeling, ' || down_gen
      || ' generatie(s) verder.';
  end if;

  -- Zijlijn: gemeenschappelijke voorouder + de tak aan elke kant.
  select a.person_id, a.generations, b.generations
    into anc, up_gen, down_gen
  from ancestors_of(me) a
  join ancestors_of(other) b on a.person_id = b.person_id
  order by a.generations + b.generations, abs(a.generations - b.generations)
  limit 1;

  if anc is null then
    return 'Jullie verbinding is nog niet volledig in kaart gebracht.';
  end if;

  select first_name || ' ' || last_name into anc_naam from persons where id = anc;

  if up_gen = 1 and down_gen = 1 then
    return 'Jullie delen dezelfde ouder: ' || anc_naam || '.';
  end if;

  -- Het kind van de voorouder dat naar mij leidt, en dat naar de ander leidt.
  select p.first_name into mijn_tak
  from relationships r join persons p on p.id = r.to_person
  where r.kind = 'parent' and r.from_person = anc
    and (r.to_person = me or r.to_person in (select person_id from ancestors_of(me)))
  limit 1;

  select p.first_name into hun_tak
  from relationships r join persons p on p.id = r.to_person
  where r.kind = 'parent' and r.from_person = anc
    and (r.to_person = other or r.to_person in (select person_id from ancestors_of(other)))
  limit 1;

  return 'Jullie gemeenschappelijke voorouder is ' || anc_naam
    || '. Aan jouw kant via ' || coalesce(mijn_tak, '?')
    || ', aan de kant van ' || other_naam || ' via ' || coalesce(hun_tak, '?') || '.';
end;
$$;

revoke execute on function relation_route(uuid, uuid) from public;
grant execute on function relation_route(uuid, uuid) to authenticated;
