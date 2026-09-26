-- CONNECT realtime — fix voor de leespolicy.
--
-- De vorige SELECT-policy deed een subquery op ontdek_gesprekken, maar die tabel heeft RLS
-- zonder policy → onder de gebruiker leverde de subquery niets op, dus las niemand berichten.
-- Oplossing: een SECURITY DEFINER-helper die het deelnemerschap controleert (bypasst RLS op
-- ontdek_gesprekken), plus een expliciete SELECT-grant voor authenticated (nodig voor
-- PostgREST én realtime).

create or replace function public.is_ontdek_deelnemer(p_gesprek uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from ontdek_gesprekken g
    where g.id = p_gesprek and (g.persoon_a = me() or g.persoon_b = me())
  );
$$;
revoke execute on function public.is_ontdek_deelnemer(uuid) from anon;
grant execute on function public.is_ontdek_deelnemer(uuid) to authenticated, service_role;

drop policy if exists ontdek_berichten_read on public.ontdek_berichten;
create policy ontdek_berichten_read on public.ontdek_berichten
  for select to authenticated
  using (is_ontdek_deelnemer(gesprek_id));

grant select on public.ontdek_berichten to authenticated;
