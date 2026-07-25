-- Fullkin — Afrekenen van een bijdrage
--
-- Wanneer een betaling binnenkomt (via de Stripe-webhook, die met de service
-- role draait) wordt de bijdrage op 'betaald' gezet en de 5%-verdeling
-- vastgelegd. Dit gebeurt in één functie zodat het atomair en idempotent is:
-- een webhook die per ongeluk twee keer binnenkomt mag niet dubbel splitsen.
--
-- Alleen de service role mag dit aanroepen. Geen enkele ingelogde gebruiker kan
-- zijn eigen bijdrage op 'betaald' zetten zonder echt te betalen.

create or replace function settle_contribution(p_contribution uuid, p_intent text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  c      contributions%rowtype;
  s      record;
  net_id uuid;
begin
  select * into c from contributions where id = p_contribution;
  if not found then
    raise exception 'Bijdrage % niet gevonden', p_contribution;
  end if;

  -- Idempotent: al afgerekend? Dan niets doen.
  if c.status = 'betaald' then
    return;
  end if;

  select network_id into net_id from collections where id = c.collection_id;

  update contributions
    set status = 'betaald',
        paid_at = now(),
        stripe_payment_intent = coalesce(p_intent, stripe_payment_intent)
    where id = p_contribution;

  select * into s from compute_split(c.amount_cents);

  insert into transaction_splits (
    contribution_id, network_id, gross_cents,
    co_founder_cents, role_holder_cents, family_pot_cents,
    platform_cents, net_cents
  ) values (
    c.id, net_id, c.amount_cents,
    s.co_founder, s.role_holder, s.family_pot,
    s.platform, s.net
  );
end;
$$;

revoke execute on function settle_contribution(uuid, text) from public, anon, authenticated;
grant execute on function settle_contribution(uuid, text) to service_role;
