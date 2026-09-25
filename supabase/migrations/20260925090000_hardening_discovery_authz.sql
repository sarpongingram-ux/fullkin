-- P1.8 / P1.9 / P1.10 — Hardening van discovery- en claim-RPC's.
--
-- PROBLEEM (IDOR / cross-family privacy-lek):
--   mogelijke_matches / ontdekt_profiel / ontdekte_familie / relatie_pad /
--   relation_route / mijn_begroetingen namen de "vantage" (me / persoon-UUID) als
--   parameter aan ZONDER te controleren of die persoon bij de aanroeper hoort. Een
--   ingelogde gebruiker kon met een willekeurige UUID de matches/ontdekkingen/
--   relatiepaden van een ANDERE familie uitlezen.
--
--   bevestig_persoon_match controleerde niet of het paar een ECHTE kandidaat was,
--   waardoor een gebruiker zijn eigen persoon aan een willekeurige vreemde kon
--   koppelen (forged link) en zo diens brug-/familiegegevens kon ontsluiten.
--
--   claim_invite miste rijvergrendeling: twee gelijktijdige claims konden allebei
--   slagen (race condition).
--
-- FIX:
--   * mag_vantage(persoon): centrale vantage-controle (service_role of eigen netwerk).
--   * vantage-guard toegevoegd aan alle bovengenoemde read-RPC's.
--   * bevestig_persoon_match valideert dat het paar een echte kandidaat is.
--   * claim_invite vergrendelt de invite- én persoonsrij (FOR UPDATE).
--
-- Niet-brekend: de frontend roept deze functies altijd aan met de EIGEN persoon
-- (me()), die per definitie in het eigen netwerk zit. service_role (backend/tests)
-- blijft toegestaan.

-- ---------------------------------------------------------------------------
-- Centrale vantage-controle.
-- ---------------------------------------------------------------------------
create or replace function public.mag_vantage(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.role() = 'service_role'
      or p in (select id from persons where network_id in (select my_networks()));
$$;
revoke execute on function public.mag_vantage(uuid) from anon;
grant execute on function public.mag_vantage(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- mogelijke_matches — vantage-guard in mijn_net.
-- ---------------------------------------------------------------------------
create or replace function public.mogelijke_matches(me uuid)
returns table(mijn_id uuid, mijn_naam text, ander_id uuid, ander_naam text, ander_familie text, signaal text)
language sql stable security definer set search_path to 'public'
as $function$
  with mijn_net as (
    select network_id as n from persons
    where id = me and mag_vantage(me)          -- P1.9: vantage moet van de aanroeper zijn
  )
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
$function$;

-- ---------------------------------------------------------------------------
-- ontdekte_familie — vantage-guard in mijn_net.
-- ---------------------------------------------------------------------------
create or replace function public.ontdekte_familie(me uuid)
returns table(ontdekt_id uuid, ontdekt_naam text, ander_familie text, brug_naam text, mijn_kant text, hun_kant text)
language sql stable security definer set search_path to 'public'
as $function$
  with mijn_net as (
    select network_id as n from persons
    where id = me and mag_vantage(me)          -- P1.9
  ),
  links as (
    select case when pa.network_id = (select n from mijn_net) then pl.person_a else pl.person_b end as my_node,
           case when pa.network_id = (select n from mijn_net) then pl.person_b else pl.person_a end as brug_node
    from person_links pl
    join persons pa on pa.id = pl.person_a
    join persons pb on pb.id = pl.person_b
    where ( pa.network_id = (select n from mijn_net) and pb.network_id <> (select n from mijn_net) )
       or ( pb.network_id = (select n from mijn_net) and pa.network_id <> (select n from mijn_net) )
  )
  select d.id, d.first_name || ' ' || d.last_name, fn.name,
         mn.first_name,
         relation_label(me, l.my_node),
         relation_label(l.brug_node, d.id)
  from links l
  join persons bn on bn.id = l.brug_node
  join persons mn on mn.id = l.my_node
  join persons d on d.network_id = bn.network_id and d.id <> l.brug_node
  join family_networks fn on fn.id = bn.network_id
  where d.id <> me;
$function$;

-- ---------------------------------------------------------------------------
-- ontdekt_profiel — vantage-guard in mijn_net.
-- ---------------------------------------------------------------------------
create or replace function public.ontdekt_profiel(me uuid, p_id uuid)
returns table(id uuid, voornaam text, achternaam text, photo_url text, ander_familie text, brug_naam text, mijn_kant text, hun_kant text)
language sql stable security definer set search_path to 'public'
as $function$
  with mijn_net as (
    select network_id as n from persons
    where id = me and mag_vantage(me)          -- P1.9
  ),
  links as (
    select case when pa.network_id = (select n from mijn_net) then pl.person_a else pl.person_b end as my_node,
           case when pa.network_id = (select n from mijn_net) then pl.person_b else pl.person_a end as brug_node
    from person_links pl
    join persons pa on pa.id = pl.person_a
    join persons pb on pb.id = pl.person_b
    where ( pa.network_id = (select n from mijn_net) and pb.network_id <> (select n from mijn_net) )
       or ( pb.network_id = (select n from mijn_net) and pa.network_id <> (select n from mijn_net) )
  )
  select d.id, d.first_name, d.last_name, d.photo_url, fn.name,
         mn.first_name, relation_label(me, l.my_node), relation_label(l.brug_node, d.id)
  from links l
  join persons bn on bn.id = l.brug_node
  join persons mn on mn.id = l.my_node
  join persons d on d.network_id = bn.network_id and d.id = p_id
  join family_networks fn on fn.id = bn.network_id
  limit 1;
$function$;

-- ---------------------------------------------------------------------------
-- relatie_pad — vantage-guard op de BFS-seed.
-- ---------------------------------------------------------------------------
create or replace function public.relatie_pad(me uuid, other uuid)
returns table(pos integer, naam text)
language sql stable security definer set search_path to 'public'
as $function$
  with recursive edges as (
    select from_person as a, to_person as b from relationships where kind = 'parent'
    union all select to_person, from_person from relationships where kind = 'parent'
    union all select from_person, to_person from relationships where kind = 'partner'
    union all select to_person, from_person from relationships where kind = 'partner'
  ),
  bfs as (
    select me as node, array[me] as path, 0 as depth
    where mag_vantage(me)                       -- P1.9
    union all
    select e.b, bfs.path || e.b, bfs.depth + 1
    from bfs
    join edges e on e.a = bfs.node
    where not (e.b = any(bfs.path)) and bfs.depth < 8
  ),
  gevonden as (
    select path from bfs where node = other order by depth limit 1
  )
  select p.ord::int, pe.first_name || ' ' || pe.last_name
  from gevonden g, unnest(g.path) with ordinality as p(pid, ord)
  join persons pe on pe.id = p.pid
  order by p.ord;
$function$;

-- ---------------------------------------------------------------------------
-- relation_route — vantage-guard vooraan.
-- ---------------------------------------------------------------------------
create or replace function public.relation_route(me uuid, other uuid)
returns text language plpgsql stable security definer set search_path to 'public'
as $function$
declare up_gen int; down_gen int; anc uuid;
  anc_naam text; other_naam text; mijn_tak text; hun_tak text; gedeeld int;
begin
  if not mag_vantage(me) then raise exception 'Niet toegestaan.'; end if;   -- P1.9
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
  select first_name||' '||last_name into anc_naam from persons where id = anc;
  if up_gen = 1 and down_gen = 1 then
    select count(*) into gedeeld
    from relationships r1 join relationships r2 on r1.from_person = r2.from_person
    where r1.kind='parent' and r2.kind='parent' and r1.to_person = me and r2.to_person = other;
    if gedeeld >= 2 then return 'Jullie zijn broer en zus, met dezelfde ouders.';
    else return 'Jullie zijn halfbroer of halfzus — jullie delen één ouder: ' || anc_naam || '.'; end if;
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

-- ---------------------------------------------------------------------------
-- mijn_begroetingen — vantage-guard.
-- ---------------------------------------------------------------------------
create or replace function public.mijn_begroetingen(me uuid)
returns table(van_id uuid, van_naam text, van_familie text, wederzijds boolean)
language sql stable security definer set search_path to 'public'
as $function$
  select b.van_persoon, p.first_name || ' ' || p.last_name, fn.name,
         exists (select 1 from begroetingen b2
                 where b2.van_persoon = me and b2.naar_persoon = b.van_persoon)
  from begroetingen b
  join persons p on p.id = b.van_persoon
  join family_networks fn on fn.id = p.network_id
  where b.naar_persoon = me
    and mag_vantage(me)                         -- P1.9
  order by b.created_at desc;
$function$;

-- ---------------------------------------------------------------------------
-- bevestig_persoon_match — kandidaat-validatie (P1.8).
--   Het paar moet: verschillende netwerken zijn, de aanroeper moet één kant
--   bezitten, en ze moeten matchen op genormaliseerde naam (of geboortenaam)
--   met verenigbare geboortedatum — precies de kandidaat-logica uit
--   mogelijke_matches. service_role mag altijd (backend/tests).
-- ---------------------------------------------------------------------------
create or replace function public.bevestig_persoon_match(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path to 'public'
as $function$
declare a uuid; b uuid;
begin
  if p_a = p_b then raise exception 'Ongeldige match.'; end if;
  a := least(p_a, p_b); b := greatest(p_a, p_b);
  if auth.role() <> 'service_role' and not exists (
    select 1 from persons pa, persons pb
    where pa.id = p_a and pb.id = p_b
      and pa.network_id <> pb.network_id
      and (pa.network_id in (select my_networks()) or pb.network_id in (select my_networks()))
      and (
        naam_norm(pa.first_name||pa.last_name) = naam_norm(pb.first_name||pb.last_name)
        or (pa.birth_name is not null and pb.birth_name is not null
            and naam_norm(pa.birth_name) = naam_norm(pb.birth_name))
      )
      and (pa.born_on is null or pb.born_on is null or pa.born_on = pb.born_on)
  ) then
    raise exception 'Je mag deze match niet bevestigen.';
  end if;
  insert into person_links (person_a, person_b, confirmed_by)
    values (a, b, me())
  on conflict (person_a, person_b) do nothing;
end;
$function$;

-- ---------------------------------------------------------------------------
-- claim_invite — rijvergrendeling tegen gelijktijdige claims (P1.10).
-- ---------------------------------------------------------------------------
create or replace function public.claim_invite(invite_token text)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare
  inv    invites%rowtype;
  target persons%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Je moet ingelogd zijn om je plek te claimen.';
  end if;

  -- Vergrendel de invite-rij: gelijktijdige claims van hetzelfde token serialiseren.
  select * into inv from invites where token = invite_token for update;
  if not found then
    raise exception 'Deze uitnodiging bestaat niet.';
  end if;
  if inv.status <> 'open' then
    raise exception 'Deze uitnodiging is al gebruikt.';
  end if;
  if inv.expires_at < now() then
    raise exception 'Deze uitnodiging is verlopen.';
  end if;

  -- Vergrendel ook het doelprofiel: voorkomt dubbele claim via twee tokens.
  select * into target from persons where id = inv.person_id for update;

  if target.claimed_by is not null and target.claimed_by <> auth.uid() then
    raise exception 'Dit profiel is al door iemand anders geclaimd.';
  end if;

  if exists (
    select 1 from persons
    where claimed_by = auth.uid()
      and network_id = inv.network_id
      and id <> inv.person_id
  ) then
    raise exception 'Je hebt in deze familie al een eigen profiel.';
  end if;

  update persons set claimed_by = auth.uid() where id = inv.person_id;
  update invites
    set status = 'geaccepteerd', accepted_at = now()
    where id = inv.id;

  if inv.invited_by is not null and inv.invited_by <> inv.person_id then
    insert into notifications
      (network_id, recipient_person_id, actor_person_id, kind, subject_type, subject_id)
    values
      (inv.network_id, inv.invited_by, inv.person_id, 'uitnodiging_geaccepteerd', 'persoon', inv.person_id);
  end if;

  return inv.person_id;
end;
$function$;
