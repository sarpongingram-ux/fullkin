-- Refund/dispute-afhandeling: statuswaarde voor een betwiste (disputed) bijdrage.
-- (Aparte migratie: een enum-waarde moet gecommit zijn vóór hij gebruikt wordt.)
alter type contribution_status add value if not exists 'betwist';
