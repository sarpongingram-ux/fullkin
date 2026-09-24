-- Cross-family discovery via gedeelde-persoon-koppeling: als dezelfde mens in
-- twee families als node bestaat, koppelen we die nodes en verbinden zo de graphs.

create table if not exists person_links (
  id           uuid primary key default gen_random_uuid(),
  person_a     uuid not null references persons(id) on delete cascade,
  person_b     uuid not null references persons(id) on delete cascade,
  confirmed_by uuid references persons(id),
  created_at   timestamptz not null default now(),
  check (person_a < person_b),
  unique (person_a, person_b)
);
alter table person_links enable row level security;
drop policy if exists person_links_read on person_links;
create policy person_links_read on person_links for select using (
  exists (
    select 1 from persons p
    where p.id in (person_a, person_b) and p.network_id in (select my_networks())
  )
);

-- Mogelijke matches (§9): mensen in MIJN familie die als dezelfde persoon in een
-- ANDERE familie lijken voor te komen (zelfde naam of geboortenaam, en niet-
-- tegenstrijdige geboortedatum). Nooit automatisch koppelen — mens bevestigt.
create or replace function public.mogelijke_matches(me uuid)
returns table(mijn_id uuid, mijn_naam text, ander_id uuid, ander_naam text, ander_familie text, signaal text)
language sql stable security definer set search_path to 'public' as $$
  with mijn_net as (select network_id as n from persons where id = me)
  select mp.id, mp.first_name || ' ' || mp.last_name,
         op.id, op.first_name || ' ' || op.last_name,
         fn.name,
         case when mp.born_on is not null and mp.born_on = op.born_on
              then 'Zelfde naam en geboortedatum'
              else 'Zelfde naam' end
  from persons mp
  join persons op
    on op.network_id <> mp.network_id
   and (mp.born_on is null or op.born_on is null or mp.born_on = op.born_on)
   and (
        lower(regexp_replace(coalesce(mp.first_name,'') || coalesce(mp.last_name,''), '\s', '', 'g'))
          = lower(regexp_replace(coalesce(op.first_name,'') || coalesce(op.last_name,''), '\s', '', 'g'))
     or (mp.birth_name is not null and op.birth_name is not null
         and lower(mp.birth_name) = lower(op.birth_name))
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

-- Bevestig dat twee nodes dezelfde persoon zijn (koppelt de families).
create or replace function public.bevestig_persoon_match(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare a uuid; b uuid;
begin
  if p_a = p_b then raise exception 'Ongeldige match.'; end if;
  a := least(p_a, p_b); b := greatest(p_a, p_b);
  if not exists (
    select 1 from persons where id in (p_a, p_b) and network_id in (select my_networks())
  ) then
    raise exception 'Je mag deze match niet bevestigen.';
  end if;
  insert into person_links (person_a, person_b, confirmed_by)
    values (a, b, me())
  on conflict (person_a, person_b) do nothing;
end $$;
grant execute on function public.bevestig_persoon_match(uuid, uuid) to authenticated;
revoke execute on function public.bevestig_persoon_match(uuid, uuid) from anon;

-- Ontdekte familie (§10): mensen uit een ANDERE familie die nu bereikbaar zijn
-- via een bevestigde koppeling — met het pad (mijn kant → brug → hun kant).
create or replace function public.ontdekte_familie(me uuid)
returns table(ontdekt_id uuid, ontdekt_naam text, ander_familie text,
              brug_naam text, mijn_kant text, hun_kant text)
language sql stable security definer set search_path to 'public' as $$
  with mijn_net as (select network_id as n from persons where id = me),
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
$$;
grant execute on function public.ontdekte_familie(uuid) to authenticated;
revoke execute on function public.ontdekte_familie(uuid) from anon;
