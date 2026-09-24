-- Eigen chatberichten kunnen bewerken. edited_at markeert een bewerkt bericht.
alter table chat_messages add column if not exists edited_at timestamptz;

drop policy if exists chat_messages_update on chat_messages;
create policy chat_messages_update on chat_messages for update
  using (sender_id = me() and kan_bij_room(room_id))
  with check (sender_id = me());
