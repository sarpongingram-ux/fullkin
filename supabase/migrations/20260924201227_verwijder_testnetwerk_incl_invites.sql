-- Teardown ook invites + notifications (FK naar persons) opruimen.
create or replace function public.verwijder_testnetwerk(p_net_naam text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare net uuid;
begin
  if p_net_naam not like 'TEST — %' then
    raise exception 'Alleen TEST-netwerken mogen zo verwijderd worden.';
  end if;
  select id into net from family_networks where name = p_net_naam;
  if net is null then return; end if;
  delete from person_links
    where person_a in (select id from persons where network_id = net)
       or person_b in (select id from persons where network_id = net);
  delete from notifications where network_id = net;
  delete from invites where network_id = net;
  alter table relationships disable rule relationships_no_delete;
  delete from relationships where network_id = net;
  alter table relationships enable rule relationships_no_delete;
  delete from persons where network_id = net;
  delete from family_networks where id = net;
end $$;
