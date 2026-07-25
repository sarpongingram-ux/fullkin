-- Fullkin — Functies niet aanroepbaar door anon.
--
-- Postgres geeft nieuwe functies standaard EXECUTE aan de rol `public`, waar
-- `anon` van erft. Intrekken van `anon` alleen helpt dus niet; we trekken in
-- van `public` en geven expliciet aan `authenticated`.

revoke execute on function me()                          from public;
revoke execute on function my_networks()                 from public;
revoke execute on function has_role(uuid, family_role)   from public;
revoke execute on function collection_contributors(uuid) from public;
revoke execute on function collection_total(uuid)        from public;

grant execute on function me()                          to authenticated;
grant execute on function my_networks()                 to authenticated;
grant execute on function has_role(uuid, family_role)   to authenticated;
grant execute on function collection_contributors(uuid) to authenticated;
grant execute on function collection_total(uuid)        to authenticated;
