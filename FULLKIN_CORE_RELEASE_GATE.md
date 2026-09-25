# FULLKIN — Core Loop Release Gate (P1.16)

_Geautomatiseerde poort voor de kernloop. Geen stage krijgt PASS zonder een echte test.
Laatste lokale run: **85/85 checks** (7 suites), 0 mislukt. Datum: 25 sep 2026._

## Kernloop: BUILD → INVITE → CLAIM → MATCH → DISCOVER → CONNECT → GROW

| Stage | Automated | Status | Bewijs (test) |
|---|:--:|:--:|---|
| **BUILD** | yes | **PASS** | `graph.test.mjs` (`add_family_member`, alle relatietypes + placeholder-ouder), `core-loop-two-users.test.mjs` (A bouwt moeder/vader/broer) |
| **INVITE** | yes | **PASS** | `core-loop-two-users.test.mjs` (A maakt uitnodiging), `claim.test.mjs` (`invite_preview`) |
| **CLAIM** | yes | **PASS** | `claim.test.mjs` (6), `authz.test.mjs` (race/hergebruik/verlopen/ongeldig), `core-loop-two-users.test.mjs` (B claimt) |
| **MATCH** | yes | **PASS** | `discovery.test.mjs` (kandidaat→koppeling), `authz.test.mjs` (kandidaat-validatie/forged-link), `rejection.test.mjs` (afwijzing) |
| **DISCOVER** | yes | **PASS** | `discovery.test.mjs` (`ontdekte_familie`/`ontdekt_profiel` + privacy), `authz.test.mjs` (IDOR-grens) |
| **CONNECT** | partial | **PARTIAL** | `zeg_hallo`/`mijn_begroetingen` bestaan (eenrichting-wave); `authz.test.mjs` dekt de begroetingen-grens. **Tweeweg-chat met een ontdekt familielid is nog niet gebouwd** (bewuste follow-up, live-audit O3). |
| **GROW** | yes | **PASS** | `core-loop-two-users.test.mjs` (B breidt de gedeelde familie uit; A ziet het nieuwe lid met correct relatiepad) |

## Reproductie & integriteit (poort-voorwaarden)

| Voorwaarde | Status | Bewijs |
|---|:--:|---|
| Verse DB uit `supabase/migrations/*` | **PASS** | CI-job `db-reproduction` (groen, ~2 min) + `SCHEMA_DRIFT_AUDIT.md` (fidelity 62/62) |
| Groene CI = tests écht gedraaid | **PASS** | `core-tests` faalt luid bij ontbrekende secrets (geen silent skip) |
| Geen orphan bij partial failure | **PASS** | `graph.test.mjs` (transactionele `add_family_member`) |
| Graph-integriteit (cross-network/cykels/dubbel) | **PASS** | `graph.test.mjs` (9 guard-checks) |
| Cross-family privacy (IDOR) | **PASS** | `authz.test.mjs` (8 negatieve checks) |
| Afhankelijkheden zonder critical/high | **PASS** | `npm audit` = 0 (`DEPENDENCY_SECURITY_AUDIT.md`) |

## Hoe de poort draait

- Lokaal: `npm run test:local` → print `FULLKIN CORE TESTS: PASS — N/N checks executed`.
- CI: `.github/workflows/test.yml`
  - `core-tests` — de 7 suites tegen de staging-DB (vereist `STAGING_SUPABASE_*` secrets).
  - `db-reproduction` — verse DB uit migraties + schema-assertie (geen secrets nodig).

## Bekende, bewust openstaande punten

- **CONNECT** is deels: eenrichtings-"zeg hallo" bestaat; volwaardige tweeweg-communicatie
  met ontdekte familieleden is een volgende stap (geen P1-defect).
- `core-tests` in CI staat rood tot `STAGING_SUPABASE_SERVICE_ROLE_KEY` als GitHub-secret
  is gezet (credential-actie voor de eigenaar). Lokaal draaien alle 85 checks groen.
