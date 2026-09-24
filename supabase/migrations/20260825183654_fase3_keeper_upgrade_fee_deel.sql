-- Fase 3: Family Keeper-upgrade (€4,99/mnd). De upgraded keeper verdient 2% van
-- elke geldstroom in zijn familie; dat loopt op als saldo (uitbetaling later via
-- Connect). De ontvanger krijgt altijd 95%; de 2% komt uit het platformdeel.

create table if not exists keeper_upgrades (
  network_id             uuid primary key references family_networks(id) on delete cascade,
  person_id              uuid not null references persons(id) on delete cascade,
  amount_cents           integer not null default 499,
  stripe_subscription_id text unique,
  stripe_customer_id     text,
  status                 pot_sub_status not null default 'actief',
  created_at             timestamptz not null default now(),
  canceled_at            timestamptz
);
alter table keeper_upgrades enable row level security;
drop policy if exists keeper_upgrades_read on keeper_upgrades;
create policy keeper_upgrades_read on keeper_upgrades for select
  using (network_id in (select network_id from persons where claimed_by = auth.uid()));

-- Heeft deze familie een actieve keeper-upgrade?
create or replace function public.heeft_keeper_upgrade(p_net uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from keeper_upgrades where network_id = p_net and status = 'actief');
$$;
grant execute on function public.heeft_keeper_upgrade(uuid) to authenticated;

-- Wie is de (betaalde) Family Keeper van deze familie?
create or replace function public.keeper_van(p_net uuid)
returns uuid language sql stable security definer set search_path to 'public' as $$
  select person_id from keeper_upgrades where network_id = p_net and status = 'actief' limit 1;
$$;
grant execute on function public.keeper_van(uuid) to authenticated;

-- Opgebouwd keeper-saldo (som van het keeper-deel over alle bijdragen).
create or replace function public.keeper_saldo(p_net uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(co_founder_cents), 0)::int
  from transaction_splits where network_id = p_net;
$$;
grant execute on function public.keeper_saldo(uuid) to authenticated;

-- Activeer/vernieuw de keeper-upgrade na betaling (intern, via service role).
create or replace function public.activeer_keeper_upgrade(
  p_net uuid, p_person uuid, p_sub_id text, p_customer text, p_amount int default 499
) returns void language plpgsql security definer set search_path to 'public' as $$
begin
  insert into keeper_upgrades
    (network_id, person_id, amount_cents, stripe_subscription_id, stripe_customer_id, status)
    values (p_net, p_person, p_amount, p_sub_id, p_customer, 'actief')
  on conflict (network_id) do update set
    person_id = excluded.person_id,
    amount_cents = excluded.amount_cents,
    stripe_subscription_id = excluded.stripe_subscription_id,
    stripe_customer_id = excluded.stripe_customer_id,
    status = 'actief', canceled_at = null;
end;
$$;
revoke all on function public.activeer_keeper_upgrade(uuid,uuid,text,text,int) from public, authenticated, anon;

-- Afrekening wordt netwerk-bewust: 2% keeper-deel alleen bij actieve upgrade.
create or replace function public.settle_contribution(p_contribution uuid, p_intent text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare
  c      contributions%rowtype;
  net_id uuid;
  heeft  boolean;
  gross  int; cf int; rh int; fp int; pf int; net_amt int;
begin
  select * into c from contributions where id = p_contribution;
  if not found then
    raise exception 'Bijdrage % niet gevonden', p_contribution;
  end if;
  if c.status = 'betaald' then
    return;
  end if;

  select network_id into net_id from collections where id = c.collection_id;

  update contributions
    set status = 'betaald', paid_at = now(),
        stripe_payment_intent = coalesce(p_intent, stripe_payment_intent)
    where id = p_contribution;

  gross := c.amount_cents;
  heeft := exists(select 1 from keeper_upgrades where network_id = net_id and status = 'actief');

  fp := (gross * 100) / 10000;   -- 1% familiepot (altijd)
  rh := 0;                        -- rolhouders: gereserveerd voor later
  if heeft then
    cf := (gross * 200) / 10000;  -- 2% Family Keeper
    pf := (gross * 200) / 10000;  -- 2% platform
  else
    cf := 0;                      -- geen keeper-deel zonder upgrade
    pf := (gross * 400) / 10000;  -- 4% platform
  end if;
  net_amt := gross - cf - rh - fp - pf;  -- 95% (restcent naar de ontvanger)

  insert into transaction_splits (
    contribution_id, network_id, gross_cents,
    co_founder_cents, role_holder_cents, family_pot_cents,
    platform_cents, net_cents
  ) values (
    c.id, net_id, gross, cf, rh, fp, pf, net_amt
  );

  if fp > 0 then
    insert into pot_ledger (network_id, kind, amount_cents, contribution_id, description)
    values (net_id, 'transactie_1pct', fp, c.id, 'Automatische 1% van een bijdrage')
    on conflict (contribution_id) where kind = 'transactie_1pct' do nothing;
  end if;
end;
$function$;
