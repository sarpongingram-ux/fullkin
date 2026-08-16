-- Fullkin — Fase 3: Het Rad (sectie 7.5 + 7.8)
--
-- Eén keer per jaar draait de familie het Rad. Alleen actieve leden doen mee,
-- gewogen op hun lootjes (hoe meer je voor de familie doet, hoe groter je kans).
-- De prijs is de Familie Pot. De winnaar kiest wat ermee gebeurt.
--
-- LET OP — juridisch: dit is naar Nederlands recht waarschijnlijk een
-- vergunningplichtig kansspel. Bewust gebouwd op verzoek van de oprichter;
-- vóór echte lancering hoort hier een kansspeljurist naar te kijken. In
-- productie zetten we het Rad achter een feature-flag per land.

create type rad_status as enum ('getrokken', 'besloten');
create type rad_choice as enum ('zelf', 'gunnen', 'pot', 'dromen');

create table rad_draws (
  id                  uuid primary key default gen_random_uuid(),
  network_id          uuid not null references family_networks(id),
  year                int  not null,
  winner_person_id    uuid references persons(id),
  prize_cents         bigint not null,
  status              rad_status not null default 'getrokken',
  choice              rad_choice,
  recipient_person_id uuid references persons(id),   -- bij 'gunnen'
  created_at          timestamptz not null default now(),
  decided_at          timestamptz,
  unique (network_id, year)
);

alter table rad_draws enable row level security;
create policy rad_read on rad_draws for select
  using (network_id in (select my_networks()));

-- ---------------------------------------------------------------------------
-- rad_lootjes — de lootjes per actief lid, transparant (sectie 7.8).
-- ---------------------------------------------------------------------------

create or replace function rad_lootjes()
returns table (person_id uuid, first_name text, last_name text, lootjes int)
language sql stable security definer set search_path = public as $$
  with net as (
    select network_id as id from persons where claimed_by = auth.uid() limit 1
  )
  select
    p.id, p.first_name, p.last_name,
    (1
      + (select count(*) from invites i where i.invited_by = p.id)
      + (select count(*) from contributions c where c.contributor_id = p.id and c.status = 'betaald')
      + (case when exists (select 1 from dreams d where d.person_id = p.id and d.status = 'actief') then 1 else 0 end)
      + (select count(*) from pot_ledger pl where pl.person_id = p.id and pl.kind = 'donatie')
      + (select count(*) from business_updates bu
           join business_dreams bd on bd.id = bu.business_id
           where bd.person_id = p.id)
    )::int
  from persons p
  where p.network_id = (select id from net)
    and p.claimed_by is not null
  order by p.first_name;
$$;

revoke execute on function rad_lootjes() from public, anon;
grant execute on function rad_lootjes() to authenticated;

-- ---------------------------------------------------------------------------
-- draai_rad — trekt de winnaar, gewogen op lootjes. Eén trekking per jaar
-- (idempotent). De prijs is het huidige pot-saldo op het moment van trekken.
-- ---------------------------------------------------------------------------

create or replace function draai_rad()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  net uuid; jaar int; bestaand uuid; totaal int; drempel numeric;
  winnaar uuid; pot bigint;
begin
  select network_id into net from persons where claimed_by = auth.uid() limit 1;
  if net is null then raise exception 'Geen netwerk gevonden'; end if;

  jaar := extract(year from now())::int;
  select id into bestaand from rad_draws where network_id = net and year = jaar;
  if bestaand is not null then return bestaand; end if;

  with l as (
    select p.id as pid,
      (1
        + (select count(*) from invites i where i.invited_by = p.id)
        + (select count(*) from contributions c where c.contributor_id = p.id and c.status = 'betaald')
        + (case when exists (select 1 from dreams d where d.person_id = p.id and d.status = 'actief') then 1 else 0 end)
        + (select count(*) from pot_ledger pl where pl.person_id = p.id and pl.kind = 'donatie')
        + (select count(*) from business_updates bu
             join business_dreams bd on bd.id = bu.business_id where bd.person_id = p.id)
      )::int as lootjes
    from persons p where p.network_id = net and p.claimed_by is not null
  )
  select sum(lootjes) into totaal from l;
  if totaal is null or totaal = 0 then
    raise exception 'Geen actieve leden met lootjes om te trekken';
  end if;

  drempel := random() * totaal;

  with l as (
    select p.id as pid,
      (1
        + (select count(*) from invites i where i.invited_by = p.id)
        + (select count(*) from contributions c where c.contributor_id = p.id and c.status = 'betaald')
        + (case when exists (select 1 from dreams d where d.person_id = p.id and d.status = 'actief') then 1 else 0 end)
        + (select count(*) from pot_ledger pl where pl.person_id = p.id and pl.kind = 'donatie')
        + (select count(*) from business_updates bu
             join business_dreams bd on bd.id = bu.business_id where bd.person_id = p.id)
      )::int as lootjes
    from persons p where p.network_id = net and p.claimed_by is not null
  ),
  cum as (
    select pid, sum(lootjes) over (order by pid rows unbounded preceding) as c from l
  )
  select pid into winnaar from cum where c > drempel order by c limit 1;

  select coalesce(sum(amount_cents), 0) into pot from pot_ledger where network_id = net;

  insert into rad_draws (network_id, year, winner_person_id, prize_cents, status)
  values (net, jaar, winnaar, pot, 'getrokken')
  returning id into bestaand;
  return bestaand;
end;
$$;

revoke execute on function draai_rad() from public, anon;
grant execute on function draai_rad() to authenticated;

-- ---------------------------------------------------------------------------
-- beslis_rad — de winnaar kiest wat er met de prijs gebeurt (sectie 7.5):
-- zelf houden, gunnen aan familielid, terugzetten in de pot, of verdelen over
-- dromen. Bij uitkeren wordt de pot met de prijs verlaagd (grootboek-boeking).
-- Alleen de winnaar mag beslissen.
-- ---------------------------------------------------------------------------

create or replace function beslis_rad(p_draw uuid, p_choice rad_choice, p_recipient uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  d rad_draws%rowtype; winner_uid uuid;
begin
  select * into d from rad_draws where id = p_draw;
  if not found then raise exception 'Trekking niet gevonden'; end if;
  if d.status = 'besloten' then return; end if;

  select claimed_by into winner_uid from persons where id = d.winner_person_id;
  if winner_uid is null or winner_uid <> auth.uid() then
    raise exception 'Alleen de winnaar kan beslissen';
  end if;

  update rad_draws
    set choice = p_choice,
        recipient_person_id = case when p_choice = 'gunnen' then p_recipient else null end,
        status = 'besloten',
        decided_at = now()
    where id = p_draw;

  -- Bij uitkeren verlaat het geld de pot (grootboek-boeking). Bij 'pot'
  -- (terugzetten) blijft alles staan.
  if p_choice in ('zelf', 'gunnen', 'dromen') and d.prize_cents > 0 then
    insert into pot_ledger (network_id, kind, amount_cents, person_id, description)
    values (
      d.network_id, 'uitkering', -d.prize_cents,
      case when p_choice = 'gunnen' then p_recipient else d.winner_person_id end,
      'Uitkering Rad ' || d.year
    );
  end if;
end;
$$;

revoke execute on function beslis_rad(uuid, rad_choice, uuid) from public, anon;
grant execute on function beslis_rad(uuid, rad_choice, uuid) to authenticated;
