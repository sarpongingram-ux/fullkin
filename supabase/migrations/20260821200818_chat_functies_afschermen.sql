-- Interne helper + triggerfuncties horen niet via de REST-API aanroepbaar te
-- zijn. Triggers blijven gewoon vuren (die draaien als eigenaar), maar niemand
-- kan ze meer rechtstreeks aanroepen om bijv. nep-systeemberichten te plaatsen.
revoke execute on function public.chat_systeembericht(uuid, text, public.chat_message_type, uuid) from anon, authenticated;
revoke execute on function public.trg_chat_collecte() from anon, authenticated;
revoke execute on function public.trg_chat_droom() from anon, authenticated;
revoke execute on function public.trg_chat_nieuw_lid() from anon, authenticated;
revoke execute on function public.trg_chat_rad() from anon, authenticated;

-- Deze worden wél door de ingelogde app gebruikt (RLS/rpc), dus alleen anon
-- de toegang ontnemen.
revoke execute on function public.ensure_tak_chats() from anon;
revoke execute on function public.kan_bij_room(uuid) from anon;
revoke execute on function public.start_direct(uuid) from anon;
