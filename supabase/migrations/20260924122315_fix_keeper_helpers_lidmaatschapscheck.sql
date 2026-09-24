-- Beveiligingsfix: keeper-hulpfuncties lekten financiële/abonnementsstatus van
-- een familie aan wie er niet bij hoort (SECURITY DEFINER zonder lidmaatschaps-
-- check). Nu geven ze alleen data terug als de aanroeper een geclaimde persoon
-- in dat netwerk heeft. En intrekken voor anon.

create or replace function public.keeper_saldo(p_net uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select case
    when exists (select 1 from persons where claimed_by = auth.uid() and network_id = p_net)
    then coalesce((select sum(co_founder_cents) from transaction_splits where network_id = p_net), 0)::int
    else null end;
$$;

create or replace function public.keeper_van(p_net uuid)
returns uuid language sql stable security definer set search_path to 'public' as $$
  select case
    when exists (select 1 from persons where claimed_by = auth.uid() and network_id = p_net)
    then (select person_id from keeper_upgrades where network_id = p_net and status = 'actief' limit 1)
    else null end;
$$;

create or replace function public.heeft_keeper_upgrade(p_net uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select case
    when exists (select 1 from persons where claimed_by = auth.uid() and network_id = p_net)
    then exists (select 1 from keeper_upgrades where network_id = p_net and status = 'actief')
    else false end;
$$;

create or replace function public.netwerk_bevroren(p_net uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select case
    when exists (select 1 from persons where claimed_by = auth.uid() and network_id = p_net)
    then exists (select 1 from family_subscriptions where network_id = p_net and status <> 'actief')
    else false end;
$$;

-- Anon hoeft deze nooit aan te roepen.
revoke execute on function public.keeper_saldo(uuid) from anon;
revoke execute on function public.keeper_van(uuid) from anon;
revoke execute on function public.heeft_keeper_upgrade(uuid) from anon;
revoke execute on function public.netwerk_bevroren(uuid) from anon;
revoke execute on function public.mijn_families() from anon;
revoke execute on function public.zet_actieve_familie(uuid) from anon;
revoke execute on function public.partner_nudge(uuid) from anon;

-- Trigger-functies en interne systeembericht-functie horen niet in de RPC-API.
revoke execute on function public.trg_chat_collecte() from anon, authenticated;
revoke execute on function public.trg_chat_droom() from anon, authenticated;
revoke execute on function public.trg_chat_nieuw_lid() from anon, authenticated;
revoke execute on function public.trg_chat_rad() from anon, authenticated;
revoke execute on function public.chat_systeembericht(uuid, text, public.chat_message_type, uuid) from anon, authenticated;
