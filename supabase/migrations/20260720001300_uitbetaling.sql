-- Fullkin — Uitbetaling: provider-onafhankelijke laag
--
-- Geld gaat direct naar de ontvanger, niet naar het platform. Elke ontvanger
-- koppelt één keer een uitbetaalaccount. De provider hangt af van het land:
-- Stripe Connect (Express) voor EU/VK, Flutterwave voor Afrika (later).
--
-- Deze tabel is bewust provider-agnostisch, zodat Flutterwave er als tweede
-- provider naast Stripe in past zonder herbouw.

create type payout_provider as enum ('stripe', 'flutterwave');
create type payout_status   as enum ('onboarding', 'ready', 'restricted');

create table payout_accounts (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references persons(id),
  network_id   uuid not null references family_networks(id),
  provider     payout_provider not null,
  external_id  text not null,              -- Stripe acct_… of Flutterwave subaccount id
  status       payout_status not null default 'onboarding',
  country      text,                        -- ISO-land, bepaalt de provider-keuze
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (person_id, provider)
);

create index on payout_accounts (person_id);
create index on payout_accounts (network_id) where status = 'ready';

alter table payout_accounts enable row level security;

-- Je ziet uitbetaalaccounts binnen je netwerk (nodig om te weten of een
-- begunstigde al geld kan ontvangen). Het external_id is geen geheim: het is
-- een account-referentie, geen sleutel.
create policy pa_read on payout_accounts for select
  using (network_id in (select my_networks()));

-- Je koppelt alleen je eigen uitbetaalaccount.
create policy pa_write on payout_accounts for insert
  with check (person_id = me() and network_id in (select my_networks()));

create policy pa_update on payout_accounts for update
  using (person_id = me());

-- Kan deze persoon geld ontvangen? (Handig voor de betaalflow.)
create or replace function payout_ready(p uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from payout_accounts
    where person_id = p and status = 'ready'
  );
$$;

revoke execute on function payout_ready(uuid) from public, anon;
grant execute on function payout_ready(uuid) to authenticated;
