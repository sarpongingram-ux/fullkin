-- De storage-API kan bij het opslaan intern de objecten-tabel raadplegen.
-- Zonder select-policy gedraagt dat zich anders voor gewone gebruikers dan
-- voor de service-rol. Een leesregel voor de avatars-bucket voorkomt dat.
drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');
