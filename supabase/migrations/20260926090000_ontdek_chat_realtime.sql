-- CONNECT realtime — live nieuwe berichten in het ontdek-gesprek.
--
-- Realtime (postgres_changes) respecteert RLS: de abonnee ontvangt alleen rijen die hij
-- via een SELECT-policy mag lezen. Daarom een SELECT-policy voor deelnemers, plus de tabel
-- in de supabase_realtime-publicatie. STUREN blijft uitsluitend via stuur_ontdek_bericht
-- (er komt géén INSERT-policy), dus de validatie/autorisatie blijft server-side afgedwongen.

drop policy if exists ontdek_berichten_read on public.ontdek_berichten;
create policy ontdek_berichten_read on public.ontdek_berichten
  for select to authenticated
  using (
    exists (
      select 1 from public.ontdek_gesprekken g
      where g.id = ontdek_berichten.gesprek_id
        and (g.persoon_a = me() or g.persoon_b = me())
    )
  );

-- Publiceer INSERTs zodat de client live nieuwe berichten binnenkrijgt.
alter publication supabase_realtime add table public.ontdek_berichten;
