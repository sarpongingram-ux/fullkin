-- Fullkin — Meldingen
--
-- Kleine, warme signalen: iemand reageerde op je herinnering, tagde je op een
-- foto, of nomineerde je bij De Stem. Je ziet alleen je eigen meldingen.

create type notification_kind as enum (
  'album_reactie', 'album_opmerking', 'album_tag',
  'stem_nominatie', 'stem_winst'
);

create table notifications (
  id                  uuid primary key default gen_random_uuid(),
  network_id          uuid not null references family_networks(id),
  recipient_person_id uuid not null references persons(id),
  actor_person_id     uuid references persons(id),
  kind                notification_kind not null,
  subject_type        text,
  subject_id          uuid,
  read_at             timestamptz,
  created_at          timestamptz not null default now()
);
create index on notifications (recipient_person_id, created_at desc);

alter table notifications enable row level security;

-- Je ziet en beheert alleen je eigen meldingen.
create policy notif_read on notifications for select using (recipient_person_id = me());
create policy notif_update on notifications for update
  using (recipient_person_id = me()) with check (recipient_person_id = me());

-- ---------------------------------------------------------------------------
-- meld — plaatst een melding voor een familielid. Actor = de ingelogde
-- gebruiker (niet te vervalsen). Nooit jezelf melden, nooit buiten je netwerk.
-- ---------------------------------------------------------------------------

create or replace function meld(
  p_recipient uuid,
  p_kind notification_kind,
  p_subject_type text,
  p_subject_id uuid
)
returns void
language plpgsql security definer set search_path = public as $$
declare actor uuid; net uuid;
begin
  actor := me();
  if actor is null or p_recipient is null or p_recipient = actor then
    return;
  end if;
  select network_id into net from persons where id = p_recipient;
  if net is null or net not in (select my_networks()) then
    return;
  end if;
  insert into notifications
    (network_id, recipient_person_id, actor_person_id, kind, subject_type, subject_id)
  values (net, p_recipient, actor, p_kind, p_subject_type, p_subject_id);
end;
$$;

revoke execute on function meld(uuid, notification_kind, text, uuid) from public, anon;
grant execute on function meld(uuid, notification_kind, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- markeer_meldingen_gelezen — zet al mijn ongelezen meldingen op gelezen.
-- ---------------------------------------------------------------------------

create or replace function markeer_meldingen_gelezen()
returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now()
  where recipient_person_id = me() and read_at is null;
$$;

revoke execute on function markeer_meldingen_gelezen() from public, anon;
grant execute on function markeer_meldingen_gelezen() to authenticated;
