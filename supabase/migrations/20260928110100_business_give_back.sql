-- Business-droom: "teruggeven aan de familie" in ECHT geld.
--
-- Voorheen was give_back alleen beschrijvende tekst. Nu kan de ondernemer een bedrag
-- toezeggen (give_back_pledge_cents) én daadwerkelijk terugbetalen aan de FAMILIEPOT
-- (echte Stripe-betaling, geboekt als 'teruggave'). Elke teruggave is transparant zichtbaar
-- voor de familie (in tegenstelling tot anonieme bijdragen).

alter table public.business_dreams add column if not exists give_back_pledge_cents int;

create table if not exists public.business_give_backs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_dreams(id) on delete cascade,
  network_id uuid not null references public.family_networks(id),
  person_id uuid not null references public.persons(id),
  amount_cents int not null check (amount_cents > 0),
  stripe_ref text,
  created_at timestamptz not null default now(),
  constraint business_give_backs_ref_uniek unique (stripe_ref)
);
alter table public.business_give_backs enable row level security;

-- Transparant: familieleden zien de teruggaven. Schrijven kan alleen via de settle-functie.
create policy bgb_read on public.business_give_backs for select
  using (network_id in (select my_networks()));
grant select on public.business_give_backs to authenticated;

-- Boekt een teruggave na een geslaagde betaling: legt de teruggave vast én crediteert de
-- familiepot. Idempotent via stripe_ref (dubbel boeken = één regel, één pot-credit).
create or replace function public.settle_business_give_back(
  p_business uuid, p_person uuid, p_amount int, p_ref text
) returns void language plpgsql security definer set search_path = public as $$
declare net uuid; naam text;
begin
  select network_id, name into net, naam from business_dreams where id = p_business;
  if net is null then raise exception 'Business Droom niet gevonden.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Ongeldig bedrag.'; end if;

  insert into business_give_backs (business_id, network_id, person_id, amount_cents, stripe_ref)
    values (p_business, net, p_person, p_amount, p_ref)
  on conflict (stripe_ref) do nothing;

  if found then
    insert into pot_ledger (network_id, kind, amount_cents, person_id, stripe_ref, description)
      values (net, 'teruggave', p_amount, p_person, p_ref,
              'Teruggave uit ' || coalesce(naam, 'business'));
  end if;
end;
$$;
revoke execute on function public.settle_business_give_back(uuid,uuid,int,text) from public, anon, authenticated;
grant execute on function public.settle_business_give_back(uuid,uuid,int,text) to service_role;

-- Voortgang: toegezegd, gegeven, aantal. Netwerk-gebonden.
create or replace function public.business_give_back_totaal(bid uuid)
returns table (toegezegd_cents int, gegeven_cents int, aantal int)
language sql stable security definer set search_path = public as $$
  select
    b.give_back_pledge_cents,
    coalesce((select sum(amount_cents) from business_give_backs where business_id = bid), 0)::int,
    (select count(*) from business_give_backs where business_id = bid)::int
  from business_dreams b
  where b.id = bid and b.network_id in (select my_networks());
$$;
revoke execute on function public.business_give_back_totaal(uuid) from public, anon;
grant execute on function public.business_give_back_totaal(uuid) to authenticated, service_role;
