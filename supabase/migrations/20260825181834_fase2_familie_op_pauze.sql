-- Fase 2: een lid-gestichte familie gaat op pauze (alleen-lezen) als het
-- €0,99/mnd-abonnement definitief eindigt. Originele families (zonder
-- family_subscriptions-rij) kunnen nooit bevriezen.

create or replace function public.netwerk_bevroren(p_net uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from family_subscriptions
    where network_id = p_net and status <> 'actief'
  );
$$;
grant execute on function public.netwerk_bevroren(uuid) to authenticated;

drop function if exists public.mijn_families();
create function public.mijn_families()
returns table(network_id uuid, name text, is_active boolean, bevroren boolean)
language sql stable security definer set search_path to 'public' as $$
  select fn.id, fn.name,
         fn.id = (select network_id from active_network where auth_uid = auth.uid()),
         exists(select 1 from family_subscriptions fs
                where fs.network_id = fn.id and fs.status <> 'actief')
  from family_networks fn
  where fn.id in (select p.network_id from persons p where p.claimed_by = auth.uid())
  order by fn.created_at asc;
$$;
grant execute on function public.mijn_families() to authenticated;

create or replace function public.heractiveer_familie_abonnement(
  p_net uuid, p_person uuid, p_sub_id text, p_customer text, p_amount int default 99
) returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if exists (select 1 from family_subscriptions where network_id = p_net) then
    update family_subscriptions
      set status = 'actief', stripe_subscription_id = p_sub_id,
          stripe_customer_id = p_customer, canceled_at = null
      where network_id = p_net;
  else
    insert into family_subscriptions
      (network_id, person_id, amount_cents, stripe_subscription_id, stripe_customer_id, status)
      values (p_net, p_person, p_amount, p_sub_id, p_customer, 'actief');
  end if;
end;
$$;
revoke all on function public.heractiveer_familie_abonnement(uuid,uuid,text,text,int) from public, authenticated, anon;
