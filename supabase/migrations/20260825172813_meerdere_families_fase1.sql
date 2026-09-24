-- Fase 1: meerdere families per persoon.
-- Een lid kan een tweede familie (vader-/moederskant) stichten en ertussen wisselen.

-- 1) Welke familie is 'actief' voor een gebruiker (de wisselaar). Alleen
--    SECURITY DEFINER-functies raken deze tabel aan, dus RLS aan zonder policies.
create table if not exists active_network (
  auth_uid   uuid primary key references auth.users(id) on delete cascade,
  network_id uuid not null references family_networks(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table active_network enable row level security;

-- 2) Abonnement per lid-gestichte familie (€0,99/mnd). Markeert tevens dat een
--    familie 'lid-gesticht' is (originele families hebben hier geen rij).
create table if not exists family_subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  network_id             uuid not null references family_networks(id) on delete cascade,
  person_id              uuid not null references persons(id) on delete cascade,
  amount_cents           integer not null default 99,
  stripe_subscription_id text unique,
  stripe_customer_id     text,
  status                 pot_sub_status not null default 'actief',
  created_at             timestamptz not null default now(),
  canceled_at            timestamptz
);
alter table family_subscriptions enable row level security;

-- Leden mogen de abonnementsstatus van hun eigen families zien.
drop policy if exists family_subs_read on family_subscriptions;
create policy family_subs_read on family_subscriptions
  for select using (network_id in (select network_id from persons where claimed_by = auth.uid()));

-- 3) me() wordt netwerk-bewust: de persoon in de ACTIEVE familie, anders de
--    oudste geclaimde persoon (achterwaarts compatibel met één familie).
create or replace function public.me()
returns uuid language sql stable security definer set search_path to 'public' as $$
  select p.id from persons p
  where p.claimed_by = auth.uid()
  order by
    (p.network_id = (select network_id from active_network where auth_uid = auth.uid())) desc nulls last,
    p.created_at asc
  limit 1;
$$;

-- 4) Alle families waar ik een geclaimde persoon in heb (voor de wisselaar).
create or replace function public.mijn_families()
returns table(network_id uuid, name text, is_active boolean)
language sql stable security definer set search_path to 'public' as $$
  select fn.id, fn.name,
         fn.id = (select network_id from active_network where auth_uid = auth.uid())
  from family_networks fn
  where fn.id in (select p.network_id from persons p where p.claimed_by = auth.uid())
  order by fn.created_at asc;
$$;

-- 5) Actieve familie kiezen (alleen als ik daar echt een persoon in heb).
create or replace function public.zet_actieve_familie(p_net uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from persons where claimed_by = auth.uid() and network_id = p_net) then
    raise exception 'Je hoort niet bij deze familie.';
  end if;
  insert into active_network (auth_uid, network_id, updated_at)
    values (auth.uid(), p_net, now())
  on conflict (auth_uid) do update set network_id = excluded.network_id, updated_at = now();
end;
$$;

-- 6) Een lid sticht een nieuwe familie (na betaling). Wordt door de service role
--    aangeroepen vanuit de webhook/afhandeling. Idempotent via het Stripe-abo-id.
create or replace function public.stich_familie_als_lid(
  p_auth uuid, p_family_name text, p_country text,
  p_first text, p_last text, p_city text,
  p_sub_id text, p_customer text, p_amount int default 99
)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare net uuid; pid uuid; room uuid; bestaand uuid;
begin
  -- Al aangemaakt voor dit abonnement? Dan die familie teruggeven.
  select network_id into bestaand from family_subscriptions
    where stripe_subscription_id = p_sub_id;
  if bestaand is not null then return bestaand; end if;

  if length(trim(coalesce(p_family_name,''))) = 0
     or length(trim(coalesce(p_first,''))) = 0
     or length(trim(coalesce(p_last,''))) = 0 then
    raise exception 'Familienaam en je eigen naam zijn verplicht.';
  end if;

  insert into family_networks (name, home_country)
    values (trim(p_family_name), nullif(trim(coalesce(p_country,'')),''))
    returning id into net;

  insert into persons (network_id, first_name, last_name, city, claimed_by, created_by)
    values (net, trim(p_first), trim(p_last),
            nullif(trim(coalesce(p_city,'')),''), p_auth, p_auth)
    returning id into pid;

  -- De stichter runt zijn familie volledig (co_founder = Family Keeper-rechten).
  -- Dat deze keeper 'tijdelijk' is, blijkt uit de family_subscriptions-rij.
  insert into memberships (network_id, person_id, role)
    values (net, pid, 'co_founder');

  insert into chat_rooms (network_id, type, name)
    values (net, 'familie', 'Familie ' || trim(p_family_name))
    returning id into room;
  insert into chat_messages (room_id, sender_id, message_text, message_type)
    values (room, null,
      'Welkom in de familiechat. Dit is jullie eigen veilige ruimte — alleen voor familie. 💛',
      'systeem');

  insert into family_subscriptions
    (network_id, person_id, amount_cents, stripe_subscription_id, stripe_customer_id, status)
    values (net, pid, p_amount, p_sub_id, p_customer, 'actief');

  -- De stichter landt meteen in zijn nieuwe familie.
  insert into active_network (auth_uid, network_id, updated_at)
    values (p_auth, net, now())
  on conflict (auth_uid) do update set network_id = excluded.network_id, updated_at = now();

  return net;
end;
$$;

-- Rechten: wisselen/lijst voor ingelogde gebruikers; stichten alleen intern.
revoke all on function public.stich_familie_als_lid(uuid,text,text,text,text,text,text,text,int) from public, authenticated, anon;
grant execute on function public.zet_actieve_familie(uuid) to authenticated;
grant execute on function public.mijn_families() to authenticated;
