-- Keeper-uitbetalingen: elke overboeking van het opgebouwde 2%-saldo naar de
-- gekoppelde Stripe-rekening van de keeper. Beschikbaar = verdiend - uitbetaald.
create table if not exists keeper_payouts (
  id                 uuid primary key default gen_random_uuid(),
  network_id         uuid not null references family_networks(id) on delete cascade,
  person_id          uuid not null references persons(id) on delete cascade,
  amount_cents       integer not null,
  stripe_transfer_id text unique,
  created_at         timestamptz not null default now()
);
alter table keeper_payouts enable row level security;
drop policy if exists keeper_payouts_read on keeper_payouts;
create policy keeper_payouts_read on keeper_payouts for select
  using (network_id in (select network_id from persons where claimed_by = auth.uid()));

-- Beschikbaar keeper-saldo = verdiend (2%) minus reeds uitbetaald. Met
-- lidmaatschapscheck (geen lek naar andere families).
create or replace function public.keeper_beschikbaar(p_net uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select case
    when exists (select 1 from persons where claimed_by = auth.uid() and network_id = p_net)
    then coalesce((select sum(co_founder_cents) from transaction_splits where network_id = p_net), 0)::int
       - coalesce((select sum(amount_cents) from keeper_payouts where network_id = p_net), 0)::int
    else 0 end;
$$;
grant execute on function public.keeper_beschikbaar(uuid) to authenticated;
revoke execute on function public.keeper_beschikbaar(uuid) from anon;
