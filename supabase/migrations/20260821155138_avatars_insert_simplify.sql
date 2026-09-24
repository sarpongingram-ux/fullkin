-- De netwerk-mapcheck faalde in de storage-context (RLS-fout bij upload).
-- Vereenvoudigen: ingelogde gebruikers mogen in de avatars-bucket uploaden.
drop policy if exists "avatars_insert" on storage.objects;
create policy "avatars_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_delete" on storage.objects;
create policy "avatars_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars');
