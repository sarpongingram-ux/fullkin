-- Fullkin — Fase 2: Rolstructuur + Co-Founder dashboard (secties 9 en 10)
--
-- Rollen ontstaan organisch op familiegrootte. Het dashboard vertaalt de rauwe
-- data (leden, collectes, splitsingen, dromen) naar de vier blokken en de
-- Netwerksterkte-score die de Family Keeper elke ochtend ziet.

-- ---------------------------------------------------------------------------
-- family_roles — de acht rollen, hun drempel, of ze ontgrendeld zijn, en wie
-- ze houdt. Drempel = aantal leden in het netwerk (sectie 10).
-- ---------------------------------------------------------------------------

create or replace function family_roles()
returns table (
  role        family_role,
  drempel     int,
  ontgrendeld boolean,
  houder_id   uuid,
  houder_naam text
)
language sql stable security definer set search_path = public as $$
  with net as (
    select network_id as id from persons where claimed_by = auth.uid() limit 1
  ),
  cnt as (
    select count(*) as n from persons where network_id = (select id from net)
  ),
  cat(role, drempel) as (values
    ('co_founder'::family_role, 1),
    ('events_manager'::family_role, 50),
    ('verhalen_manager'::family_role, 150),
    ('pot_beheerder'::family_role, 150),
    ('connector'::family_role, 300),
    ('welzijn_manager'::family_role, 300),
    ('mediator'::family_role, 500),
    ('archivaris'::family_role, 500)
  )
  select
    cat.role,
    cat.drempel,
    (select n from cnt) >= cat.drempel,
    p.id,
    p.first_name || ' ' || p.last_name
  from cat
  left join memberships m
    on m.network_id = (select id from net) and m.role = cat.role and m.revoked_at is null
  left join persons p on p.id = m.person_id
  order by cat.drempel, cat.role;
$$;

revoke execute on function family_roles() from public, anon;
grant execute on function family_roles() to authenticated;

-- ---------------------------------------------------------------------------
-- cofounder_dashboard — alle cijfers voor het motiverende dashboard in één rij.
-- SECURITY DEFINER om over contributions/splits te aggregeren; netwerk = het
-- netwerk van de ingelogde gebruiker.
-- ---------------------------------------------------------------------------

create or replace function cofounder_dashboard()
returns table (
  leden_totaal               int,
  leden_deelnemend           int,
  leden_sluimerend           int,
  leden_onbekend             int,
  groei_maand                int,
  volume_totaal_cents        bigint,
  volume_maand_cents         bigint,
  volume_jaar_cents          bigint,
  cofounder_verdienste_cents bigint,
  rolpool_cents              bigint,
  pot_saldo_cents            bigint,
  dromen_actief              int,
  dromen_bereikt             int,
  netwerksterkte             int
)
language sql stable security definer set search_path = public as $$
  with net as (
    select network_id as id from persons where claimed_by = auth.uid() limit 1
  ),
  mem as (
    select p.id, p.claimed_by, p.created_at,
      exists(select 1 from contributions c where c.contributor_id = p.id and c.status = 'betaald') as bijgedragen,
      exists(select 1 from dreams d where d.person_id = p.id and d.status = 'actief') as heeft_droom
    from persons p where p.network_id = (select id from net)
  ),
  splits as (
    select * from transaction_splits where network_id = (select id from net)
  ),
  drm as (
    select d.id, d.target_cents,
      coalesce((select sum(amount_cents) from contributions c
                where c.collection_id = d.collection_id and c.status = 'betaald'), 0) as raised
    from dreams d where d.network_id = (select id from net) and d.status = 'actief'
  )
  select
    (select count(*) from mem)::int,
    (select count(*) from mem where claimed_by is not null and (bijgedragen or heeft_droom))::int,
    (select count(*) from mem where claimed_by is not null and not (bijgedragen or heeft_droom))::int,
    (select count(*) from mem where claimed_by is null)::int,
    (select count(*) from mem where created_at >= date_trunc('month', now()))::int,
    coalesce((select sum(gross_cents) from splits), 0)::bigint,
    coalesce((select sum(gross_cents) from splits where created_at >= date_trunc('month', now())), 0)::bigint,
    coalesce((select sum(gross_cents) from splits where created_at >= date_trunc('year', now())), 0)::bigint,
    coalesce((select sum(co_founder_cents) from splits), 0)::bigint,
    coalesce((select sum(role_holder_cents) from splits), 0)::bigint,
    coalesce((select sum(family_pot_cents) from splits), 0)::bigint,
    (select count(*) from drm)::int,
    (select count(*) from drm where raised >= target_cents)::int,
    -- Netwerksterkte 0-100 (heuristiek): verbinding + economie-activiteit +
    -- dromen + volume per lid. Transparant, niet magisch.
    least(100, greatest(0, round(
        0.35 * (100.0 * (select count(*) from mem where claimed_by is not null) / greatest(1, (select count(*) from mem)))
      + 0.25 * (100.0 * (select count(*) from mem where bijgedragen) / greatest(1, (select count(*) from mem)))
      + 0.20 * least(100, 100.0 * (select count(*) from drm) / greatest(1, (select count(*) from mem where claimed_by is not null)))
      + 0.20 * least(100, (coalesce((select sum(gross_cents) from splits), 0) / 100.0) / greatest(1, (select count(*) from mem)))
    )))::int;
$$;

revoke execute on function cofounder_dashboard() from public, anon;
grant execute on function cofounder_dashboard() to authenticated;
