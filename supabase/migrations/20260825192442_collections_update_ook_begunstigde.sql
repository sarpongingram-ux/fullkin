-- De begunstigde mag een collecte voor zichzelf ook stoppen/verwijderen
-- (belangrijk voor de automatische verjaardagpot).
drop policy if exists collections_update on collections;
create policy collections_update on collections for update
  using (
    started_by = me()
    or beneficiary_id = me()
    or has_role(network_id, 'co_founder')
    or has_role(network_id, 'events_manager')
  );
