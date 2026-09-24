-- Partner-nudge: toon een zetje om je eigen kant te bouwen aan wie hier via een
-- partner verbonden is maar zelf geen ouders in deze familie heeft — en die nog
-- geen eigen familie heeft gesticht, en niet de keeper van deze familie is.
create or replace function public.partner_nudge(me uuid)
returns table(toon boolean, partner_naam text)
language sql stable security definer set search_path to 'public' as $$
  with fam as (select label, first_name from family_map(me))
  select
    (
      exists(select 1 from fam where label = 'partner')
      and not exists(select 1 from fam where label = 'ouder')
      and not exists(
        select 1 from memberships m
        where m.person_id = me and m.role = 'co_founder' and m.revoked_at is null
      )
      and not exists(
        select 1 from family_subscriptions fs
        join persons p2 on p2.network_id = fs.network_id
        where p2.claimed_by = auth.uid()
      )
    ),
    (select first_name from fam where label = 'partner' order by first_name limit 1);
$$;
grant execute on function public.partner_nudge(uuid) to authenticated;
