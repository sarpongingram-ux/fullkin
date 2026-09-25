-- CONNECT tweeweg-chat — nieuwe meldingssoort voor een bericht van een ontdekt familielid.
-- (Aparte migratie: een enum-waarde moet gecommit zijn vóór hij gebruikt wordt.)
alter type notification_kind add value if not exists 'ontdek_bericht';
