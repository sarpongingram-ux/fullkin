-- Business-droom "teruggeven aan de familie" — nieuwe grootboeksoort voor de familiepot.
-- (Aparte migratie: een enum-waarde moet gecommit zijn vóór hij gebruikt wordt.)
alter type pot_entry_kind add value if not exists 'teruggave';
