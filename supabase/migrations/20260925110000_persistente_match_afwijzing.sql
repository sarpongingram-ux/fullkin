-- P1.11 — Persistente match-afwijzing.
--
-- "Nee, ander persoon" verborg tot nu toe alleen de UI-kaart; na refresh kwam dezelfde
-- suggestie terug. Nu onthouden we de beslissing in person_match_decisions, en
-- mogelijke_matches stelt een afgewezen paar niet opnieuw voor. Ruimte voor latere
-- herbeoordeling blijft (een rij kan overschreven worden).

create table if not exists public.person_match_decisions (
  id uuid primary key default gen_random_uuid(),
  person_a uuid not null references public.persons(id) on delete cascade,
  person_b uuid not null references public.persons(id) on delete cascade,
  decision text not null check (decision in ('confirmed','rejected')),
  decided_by uuid references public.persons(id),
  decided_at timestamptz not null default now(),
  constraint person_match_decisions_norm check (person_a < person_b),
  constraint person_match_decisions_pair unique (person_a, person_b)
);

-- RLS aan, geen policies: alleen SECURITY DEFINER-functies (en service_role) mogen erbij.
alter table public.person_match_decisions enable row level security;

-- Afwijzen: onthoudt dat twee nodes NIET dezelfde persoon zijn.
create or replace function public.wijs_match_af(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid;
begin
  if p_a = p_b then raise exception 'Ongeldige match.'; end if;
  a := least(p_a, p_b); b := greatest(p_a, p_b);
  -- Zelfde autorisatie als bevestigen: aanroeper bezit één kant, verschillende families.
  if auth.role() <> 'service_role' and not exists (
    select 1 from persons pa, persons pb
    where pa.id = p_a and pb.id = p_b
      and pa.network_id <> pb.network_id
      and (pa.network_id in (select my_networks()) or pb.network_id in (select my_networks()))
  ) then
    raise exception 'Je mag deze match niet beoordelen.';
  end if;
  insert into person_match_decisions (person_a, person_b, decision, decided_by)
  values (a, b, 'rejected', me())
  on conflict (person_a, person_b)
    do update set decision = 'rejected', decided_by = me(), decided_at = now();
end $$;
revoke execute on function public.wijs_match_af(uuid,uuid) from anon;
grant execute on function public.wijs_match_af(uuid,uuid) to authenticated, service_role;

-- mogelijke_matches: sluit afgewezen paren uit (naast reeds bevestigde links).
create or replace function public.mogelijke_matches(me uuid)
returns table(mijn_id uuid, mijn_naam text, ander_id uuid, ander_naam text, ander_familie text, signaal text)
language sql stable security definer set search_path to 'public'
as $function$
  with mijn_net as (
    select network_id as n from persons
    where id = me and mag_vantage(me)
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
    and not exists (
      select 1 from person_match_decisions d
      where d.person_a = least(mp.id, op.id) and d.person_b = greatest(mp.id, op.id)
        and d.decision = 'rejected'
    )
  order by mp.first_name;
$function$;
