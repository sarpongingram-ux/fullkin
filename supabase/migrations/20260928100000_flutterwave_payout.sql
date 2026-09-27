-- Economie 3/3 — Flutterwave-uitbetaling (structurele opzet).
--
-- Ontvangers in Afrika/Suriname kunnen niet via Stripe Connect uitbetaald worden. Deze
-- migratie legt de DB-basis: routing/status blijft in payout_accounts (netwerk-leesbaar),
-- maar de GEVOELIGE ontvangergegevens (bankrekening / mobile money) komen in een APARTE,
-- eigenaar-only tabel — payout_accounts.pa_read is netwerk-breed, dus daar horen geen
-- rekeningnummers. De echte Flutterwave-API-calls zitten in code achter een key-check;
-- deze migratie beweegt geen geld.

-- Valuta/routing-hint op het uitbetaalaccount (niet gevoelig).
alter table public.payout_accounts add column if not exists currency text;

-- Gevoelige ontvangergegevens: alleen de eigenaar (en service_role) mag erbij.
create table if not exists public.payout_details (
  person_id uuid primary key references public.persons(id) on delete cascade,
  provider payout_provider not null default 'flutterwave',
  method text not null check (method in ('bank','mobile_money')),
  currency text not null,
  account_name text not null,
  bank_code text,
  account_number text,
  momo_network text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payout_details enable row level security;

-- Eigenaar-only (NIET netwerk-breed): rekeninggegevens blijven privé.
drop policy if exists pd_select on public.payout_details;
create policy pd_select on public.payout_details for select to authenticated using (person_id = me());
drop policy if exists pd_insert on public.payout_details;
create policy pd_insert on public.payout_details for insert to authenticated with check (person_id = me());
drop policy if exists pd_update on public.payout_details;
create policy pd_update on public.payout_details for update to authenticated
  using (person_id = me()) with check (person_id = me());

grant select, insert, update on public.payout_details to authenticated;
-- service_role bypasst RLS en leest de gegevens alleen op het moment van uitbetalen.
