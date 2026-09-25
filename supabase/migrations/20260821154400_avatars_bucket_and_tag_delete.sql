-- Publieke bucket voor profielfoto's. Publiek leesbaar; uploaden mag alleen een
-- ingelogde gebruiker, en alleen in de map van een eigen netwerk.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_insert" on storage.objects;
create policy "avatars_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]::uuid in (select my_networks())
  );

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]::uuid in (select my_networks())
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]::uuid in (select my_networks())
  );

-- Tags weghalen: de tagger zelf, de uploader van de herinnering, of de Family
-- Keeper. (Er was alleen een insert-policy; verwijderen was dus geblokkeerd.)
drop policy if exists "tags_delete" on album_tags;
create policy "tags_delete" on album_tags
  for delete
  using (
    tagged_by = me()
    or album_item_id in (
      select ai.id from album_items ai
      where ai.uploaded_by = me() or has_role(ai.network_id, 'co_founder'::family_role)
    )
  );
