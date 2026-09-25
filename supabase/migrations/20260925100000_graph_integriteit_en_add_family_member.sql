-- P1.6 + P1.7 — Transactionele build-flow + graph-integriteit.
--
-- P1.7 (database-level safeguards):
--   * former_partner moet net als partner genormaliseerd zijn (from_person < to_person);
--   * geen dubbele edges (uniek op kind, from_person, to_person);
--   * geen cross-network relaties (een relationship verbindt personen in HETZELFDE
--     netwerk; cross-family loopt via person_links);
--   * geen ouder-cykels (A ouder van B, B ouder van A, of langere lussen).
--
-- P1.6 (transactionele build):
--   * add_family_member(...) doet person-create + eventuele placeholder-ouder + edges in
--     ÉÉN transactie. Faalt een stap, dan rolt alles terug — nooit een losse (orphan) node.

-- ---------------------------------------------------------------------------
-- P1.7.1 — former_partner normaliseren.
-- ---------------------------------------------------------------------------
alter table relationships drop constraint if exists former_partner_normalised;
alter table relationships add constraint former_partner_normalised
  check (kind <> 'former_partner' or from_person < to_person);

-- ---------------------------------------------------------------------------
-- P1.7.2 — geen dubbele edges.
-- ---------------------------------------------------------------------------
create unique index if not exists relationships_uniek_edge
  on relationships (kind, from_person, to_person);

-- ---------------------------------------------------------------------------
-- P1.7.3 + P1.7.4 — cross-network + cykel-bewaking via BEFORE-trigger.
-- ---------------------------------------------------------------------------
create or replace function public.relationships_integriteit()
returns trigger language plpgsql security definer set search_path = public as $$
declare fnet uuid; tnet uuid;
begin
  select network_id into fnet from persons where id = new.from_person;
  select network_id into tnet from persons where id = new.to_person;
  if fnet is null or tnet is null then
    raise exception 'Relatie verwijst naar een onbekende persoon.';
  end if;
  if fnet <> tnet or fnet <> new.network_id then
    raise exception 'Een relatie mag geen personen uit verschillende families verbinden (gebruik person_links voor cross-family).';
  end if;
  if new.kind = 'parent' then
    -- Cykel: het kind (to_person) mag geen voorouder van de ouder (from_person) zijn.
    if new.to_person = new.from_person
       or new.to_person in (select person_id from ancestors_of(new.from_person)) then
      raise exception 'Deze ouder-relatie zou een kringloop in de stamboom maken.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_relationships_integriteit on relationships;
create trigger trg_relationships_integriteit
  before insert or update on relationships
  for each row execute function public.relationships_integriteit();

-- ---------------------------------------------------------------------------
-- P1.6 — add_family_member: alles in één transactie.
-- ---------------------------------------------------------------------------
create or replace function public.add_family_member(
  p_voornaam text,
  p_achternaam text,
  p_relatie text,
  p_anker uuid default null,
  p_stad text default null,
  p_land text default null,
  p_geboortedatum date default null,
  p_is_kind boolean default false,
  p_origin relationship_origin default 'biological'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  mij uuid;
  net uuid;
  anker uuid;
  anker_net uuid;
  nieuw uuid;
  ph uuid;
  ouder_ids uuid[] := '{}';
  oid uuid;
begin
  if p_voornaam is null or btrim(p_voornaam) = '' or p_achternaam is null or btrim(p_achternaam) = '' then
    raise exception 'Vul een voor- en achternaam in.';
  end if;
  if p_relatie not in ('ouder','kind','partner','ex_partner','broer_zus') then
    raise exception 'Kies hoe dit familielid verbonden is.';
  end if;

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

  -- Broer/zus: verzamel de ouders van het anker vóór we iets aanmaken.
  if p_relatie = 'broer_zus' then
    select coalesce(array_agg(from_person), '{}') into ouder_ids
    from relationships where kind = 'parent' and to_person = anker;
  end if;

  -- Persoon aanmaken.
  insert into persons (network_id, first_name, last_name, city, country, born_on, managed_by, created_by)
  values (net, btrim(p_voornaam), btrim(p_achternaam), p_stad, p_land, p_geboortedatum,
          case when p_is_kind then mij else null end, auth.uid())
  returning id into nieuw;

  -- Broer/zus zonder bekende ouder: gedeelde placeholder-ouder aanmaken.
  if p_relatie = 'broer_zus' and coalesce(array_length(ouder_ids,1),0) = 0 then
    insert into persons (network_id, first_name, last_name, created_by)
    values (net, 'Onbekende', btrim(p_achternaam), auth.uid())
    returning id into ph;
    insert into relationships (network_id, kind, origin, from_person, to_person, created_by)
    values (net, 'parent', p_origin, ph, anker, auth.uid());
    ouder_ids := array[ph];
  end if;

  -- Edges leggen.
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

revoke execute on function public.add_family_member(text,text,text,uuid,text,text,date,boolean,relationship_origin) from anon;
grant execute on function public.add_family_member(text,text,text,uuid,text,text,date,boolean,relationship_origin) to authenticated, service_role;
