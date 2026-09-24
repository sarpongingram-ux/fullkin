-- "Zeg hallo" (§11): een vriendelijke, eenrichtings-groet naar een ontdekt
-- familielid. Geen open DM-kanaal — alleen een warme wave die de ander ziet.
create table if not exists begroetingen (
  id           uuid primary key default gen_random_uuid(),
  van_persoon  uuid not null references persons(id) on delete cascade,
  naar_persoon uuid not null references persons(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (van_persoon, naar_persoon)
);
alter table begroetingen enable row level security;
drop policy if exists begroetingen_read on begroetingen;
create policy begroetingen_read on begroetingen for select using (
  van_persoon in (select id from persons where claimed_by = auth.uid())
  or naar_persoon in (select id from persons where claimed_by = auth.uid())
);

-- Groet een ontdekt familielid (alleen wie echt bereikbaar is via een koppeling).
create or replace function public.zeg_hallo(p_naar uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare mij uuid;
begin
  mij := me();
  if mij is null then raise exception 'Je bent niet ingelogd.'; end if;
  if not exists (select 1 from ontdekte_familie(mij) where ontdekt_id = p_naar) then
    raise exception 'Je kunt deze persoon niet groeten.';
  end if;
  insert into begroetingen (van_persoon, naar_persoon) values (mij, p_naar)
  on conflict (van_persoon, naar_persoon) do nothing;
end $$;
grant execute on function public.zeg_hallo(uuid) to authenticated;
revoke execute on function public.zeg_hallo(uuid) from anon;

-- Groeten die IK heb ontvangen (met naam + familie van de groeter, en of ik al
-- teruggroette).
create or replace function public.mijn_begroetingen(me uuid)
returns table(van_id uuid, van_naam text, van_familie text, wederzijds boolean)
language sql stable security definer set search_path to 'public' as $$
  select b.van_persoon, p.first_name || ' ' || p.last_name, fn.name,
         exists (select 1 from begroetingen b2
                 where b2.van_persoon = me and b2.naar_persoon = b.van_persoon)
  from begroetingen b
  join persons p on p.id = b.van_persoon
  join family_networks fn on fn.id = p.network_id
  where b.naar_persoon = me
  order by b.created_at desc;
$$;
grant execute on function public.mijn_begroetingen(uuid) to authenticated;
revoke execute on function public.mijn_begroetingen(uuid) from anon;
