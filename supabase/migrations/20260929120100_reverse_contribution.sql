-- Refund/dispute-afhandeling: draai een bijdrage én haar grootboek-effecten terug.
--
-- settle_contribution zet een bijdrage op 'betaald' en boekt de 5%-split
-- (transaction_splits: keeper 2% via co_founder_cents, pot 1%) + een pot_ledger-regel
-- 'transactie_1pct'. Bij een refund/dispute moet dat teruggedraaid worden, anders tellen
-- keeper-saldo en familiepot geld mee dat is terugbetaald/betwist.
--
-- reverse_contribution zet de status en verwijdert de split + de gekoppelde pot-regel.
-- Balansen (keeper_saldo = som co_founder_cents; pot = som pot_ledger) kloppen daarna
-- vanzelf. Een later gewonnen dispute wordt hersteld door settle_contribution opnieuw aan
-- te roepen (die maakt de split + pot-regel opnieuw aan).

create or replace function public.reverse_contribution(
  p_contribution uuid, p_status contribution_status
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update contributions set status = p_status where id = p_contribution;
  delete from transaction_splits where contribution_id = p_contribution;
  delete from pot_ledger where contribution_id = p_contribution and kind = 'transactie_1pct';
end;
$$;
revoke execute on function public.reverse_contribution(uuid, contribution_status) from public, anon, authenticated;
grant execute on function public.reverse_contribution(uuid, contribution_status) to service_role;
