# FULLKIN — Schema Drift Audit (P1.1)

_Vergelijking van het databaseschema zoals vastgelegd in Git-migraties versus de
werkelijk toegepaste historie in staging en productie. Datum: 25 sep 2026._

## Kernbevinding

**Ernstige drift, nu opgelost.** De Git-map `supabase/migrations/` bevatte **25**
migraties; productie en staging hebben er **62**. **37 migraties waren live toegepast
(via de Supabase-MCP/dashboard) maar nooit teruggeschreven naar Git** — inclusief de
volledige chat-laag, de avatars-bucketfixes, de economie-fases (`meerdere_families_fase1`,
`fase2_familie_op_pauze`, `fase3_keeper_upgrade_fee_deel`, `keeper_payouts`), de hele
cross-family discovery (`cross_family_discovery`, `matching_toleranter_v2`,
`ontdekt_profiel_privacy`, `zeg_hallo_begroetingen`), `former_partner` en de IDOR-fix
`fix_keeper_helpers_lidmaatschapscheck`.

Bovendien weken **2** bestaande Git-bestanden inhoudelijk af van wat productie draaide
(`kaart`, `security_hardening` — de laatste miste enkele `revoke ... from anon`-regels).

### Status na deze sprint

| Meting | Voor | Na |
|---|---:|---:|
| Migraties in Git | 25 | **62** |
| Migraties in productie | 62 | 62 |
| Migraties in staging | 62 | 62 |
| Git-bestanden die afwijken van productie-SQL | 2 (+37 ontbrekend) | **0** |
| Fidelity (bestand == exact toegepaste SQL, genormaliseerd) | 23/62 | **62/62** |

Productie en staging waren al identiek (62/62, zelfde versies en namen). Git is nu met
beide gesynchroniseerd.

## Methode

1. `list_migrations` op productie (`fbphiwipvhmkvthmgvhv`) en staging
   (`iuhozabjtufooklobzvi`) → 62 identieke migraties in beide.
2. De exact toegepaste SQL is uit `supabase_migrations.schema_migrations.statements`
   gehaald (de bron van waarheid) en de 37 ontbrekende migraties zijn als bestanden
   weggeschreven met hun echte versienummer + naam.
3. Elk van de 62 bestanden is genormaliseerd (commentaar/witruimte) vergeleken met de
   toegepaste SQL. De 2 afwijkende bestanden zijn overschreven met de productie-SQL.
   Eindresultaat: **62/62 verbatim gelijk**.
4. Volgorde gecontroleerd: de heropgebouwde `rad_transfer`/`beslis_rad_transfer` (echte
   versie `2026-08-16`) sorteren ná de oorspronkelijke `2026-07-20`-bestanden; ze hangen
   alleen af van `rad_draws`/`pot_ledger` (eerder aangemaakt) en worden door geen latere
   migratie aangeroepen → veilige volgorde voor een verse build.

## Objectniveau (productie, = staging, nu = Git)

| Objecttype | Aantal | Reproduceerbaar uit Git |
|---|---:|:--:|
| Tabellen (`public`) | 38 | ✅ |
| Tabellen met RLS aan | 38 / 38 | ✅ |
| RLS-policies (`public`) | 75 | ✅ |
| Functies (`public`) | 73 | ✅ |
| Enums (`public`) | 22 | ✅ |
| Triggers (`public`, niet-intern) | 4 | ✅ |

### Specifiek gecontroleerde objecten uit de opdracht

| Object | Git migration (nu) | Staging | Production | Status |
|---|---|:--:|:--:|---|
| `person_links` (tabel) | `cross_family_discovery` | ✅ | ✅ | in sync |
| `mogelijke_matches` | `cross_family_discovery` + `matching_toleranter_v2` + `hardening_discovery_authz` | ✅ | ✅ | in sync |
| `bevestig_persoon_match` | `cross_family_discovery` + `hardening_discovery_authz` | ✅ | ✅ | in sync |
| `ontdekte_familie` | `cross_family_discovery` + `hardening_discovery_authz` | ✅ | ✅ | in sync |
| `ontdekt_profiel` | `ontdekt_profiel_privacy` + `hardening_discovery_authz` | ✅ | ✅ | in sync |
| `relatie_pad` | `relatie_pad_visueel` + `hardening_discovery_authz` | ✅ | ✅ | in sync |
| `zeg_hallo` / `mijn_begroetingen` / `begroetingen` | `zeg_hallo_begroetingen` (+ `hardening_discovery_authz`) | ✅ | ✅ | in sync |
| `familie_vorm` | `familie_vorm_magic_moment` | ✅ | ✅ | in sync |
| `partner_nudge` | `partner_nudge` | ✅ | ✅ | in sync |
| `former_partner` (enumwaarde `relationship_kind`) | `relationship_kind_former_partner` + `former_partner_engine_en_seed` | ✅ | ✅ | in sync |
| `relationship_kind` = `parent \| partner \| former_partner` | idem | ✅ | ✅ | opgelost (was `parent \| partner` in oude types) |
| Enums (22), indexes, constraints, triggers, RLS, grants/revokes | volledige 62-migratieset | ✅ | ✅ | in sync |

## De 37 heropgebouwde migraties (waren alleen in de DB)

Chat-laag: `rad_transfer`, `beslis_rad_transfer`, `avatars_bucket_and_tag_delete`,
`avatars_insert_simplify`, `avatars_select_policy`, `familiechat`,
`start_familie_met_chat`, `takchat`, `direct_berichten`, `chat_systeemberichten`,
`chat_functies_afschermen`, `family_dreams_contributor_count`,
`notification_kind_uitnodiging_geaccepteerd`, `claim_invite_notificatie`,
`fix_chat_rls_recursie`, `chat_bericht_bewerken`.

Economie + discovery + engine: `meerdere_families_fase1`,
`je_kent_al_verbonden_en_chat_contact`, `fase2_familie_op_pauze`,
`fase3_keeper_upgrade_fee_deel`, `partner_nudge`, `auto_verjaardag_collectes`,
`collectie_status_verwijderd`, `collections_update_ook_begunstigde`,
`fix_keeper_helpers_lidmaatschapscheck`, `keeper_payouts`, `familie_vorm_magic_moment`,
`cross_family_discovery`, `ontdekt_profiel_privacy`, `zeg_hallo_begroetingen`,
`matching_toleranter_v2`, `relatie_pad_visueel`, `half_sibling_onderscheid`,
`test_fixture_functies`, `verwijder_testnetwerk_incl_invites`,
`relationship_kind_former_partner`, `former_partner_engine_en_seed`.

## Preventie van nieuwe drift

- De clean-DB reproductie in CI (`db-reproduction`, zie `DATABASE_REPRODUCTION.md`) bouwt
  elke push/PR een verse DB uit `supabase/migrations/*` en faalt als het schema niet
  reproduceerbaar is.
- Nieuw beleid: schema-wijzigingen gaan voortaan **eerst** als migratiebestand naar Git,
  daarna toegepast — niet andersom.

## Family Economy (beschermde scope)

Alle economie-objecten (`family_subscriptions`, `keeper_upgrades`, `keeper_payouts`,
`pot_ledger`, `pot_subscriptions`, `collections`, `contributions`, `dreams`,
`business_dreams`, `transaction_splits`, `payout_accounts`, …) zijn intact en nu volledig
in Git gereproduceerd. Er is niets uit de economie-laag verwijderd.
