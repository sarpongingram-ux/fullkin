-- Fullkin — Opslag voor het Familiealbum
--
-- Privébucket, alleen voor ingelogde familieleden. Bestanden liggen in een map
-- per netwerk: {network_id}/{bestand}. De policies laten je alleen bij bestanden
-- van je eigen netwerk. Geen publieke toegang. Max 50MB, foto's (v1).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'family-album', 'family-album', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lezen: alleen bestanden in een map (netwerk) waar je lid van bent.
create policy album_storage_read on storage.objects for select to authenticated
using (
  bucket_id = 'family-album'
  and (((storage.foldername(name))[1])::uuid) in (select my_networks())
);

-- Uploaden: alleen naar je eigen netwerk-map.
create policy album_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'family-album'
  and (((storage.foldername(name))[1])::uuid) in (select my_networks())
);
