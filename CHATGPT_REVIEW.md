# CHATGPT — Reviewer handoff (P1 Core Hardening Sprint)

Onafhankelijke-reviewer-handoff. Alles hieronder is met echt bewijs onderbouwd (CI-runs,
auth-gebaseerde tests, DB-inspectie), niet cosmetisch.

## Commit & omgeving
- **Branch / PR:** `p1-core-hardening` → **PR #1**
  (https://github.com/sarpongingram-ux/fullkin/pull/1)
- **Basis:** `main` @ `b2a599c`.
- **Live app:** https://fullkin.vercel.app · **Repo:** https://github.com/sarpongingram-ux/fullkin (public)
- **Omvang:** 58 files, +3568 / −447. Waarvan 37 heropgebouwde migraties (schema-drift) +
  3 nieuwe migraties.

## Nieuwe migraties (toegepast op productie én staging)
1. `20260925090000_hardening_discovery_authz.sql` — IDOR/privacy + claim-locking (P1.8/1.9/1.10)
2. `20260925100000_graph_integriteit_en_add_family_member.sql` — transactionele build + graph-guards (P1.6/1.7)
3. `20260925110000_persistente_match_afwijzing.sql` — `person_match_decisions` + `wijs_match_af` (P1.11)

## Belangrijkste gewijzigde bestanden
- App: `src/app/app/acties.ts` (nu via transactionele RPC), `src/app/app/ontdek/acties.ts`
  + `MatchKnop.tsx` (persistente afwijzing), `src/lib/types/database.ts` (hergegenereerd).
- Tests: `tests/run-all.mjs`, `tests/authz.test.mjs`, `tests/graph.test.mjs`,
  `tests/rejection.test.mjs`, `tests/core-loop-two-users.test.mjs`, `tests/db-reproduction.sql`.
- CI/infra: `.github/workflows/test.yml`, `supabase/config.toml`, `package.json`.

## Security — gevonden & opgelost
| # | Bevinding | Ernst | Fix | Bewijs |
|---|---|---|---|---|
| S1 | **IDOR / cross-family privacy-lek**: `mogelijke_matches`/`ontdekt_profiel`/`ontdekte_familie`/`relatie_pad`/`relation_route`/`mijn_begroetingen` vertrouwden de caller-supplied `me`-UUID zonder eigenaarscontrole → een ingelogde gebruiker kon een andere familie uitlezen | **P1** | `mag_vantage()` guard (service_role of eigen netwerk) | `authz.test.mjs` (8 negatieve checks) |
| S2 | **Forged cross-family link**: `bevestig_persoon_match` valideerde niet dat het paar een echte kandidaat was | **P1** | kandidaat-validatie in de RPC | `authz.test.mjs` |
| S3 | **Claim race**: `claim_invite` miste rijvergrendeling | **P1** | `FOR UPDATE` op invite + persoon | `authz.test.mjs` (gelijktijdige claim) |
| S4 | **Orphan nodes**: build maakte persoon vóór edges (partial failure → losse node) | **P1** | transactionele `add_family_member()` | `graph.test.mjs` |
| S5 | **Graph-integriteit**: geen guards tegen cross-network relaties, ouder-cykels, dubbele edges, ongenormaliseerde `former_partner` | **P1** | constraints + BEFORE-trigger | `graph.test.mjs` (9 checks) |
| S6 | **Afhankelijkheden**: 1 critical (Next.js RCE/SSRF) + 6 high + 1 moderate | **P1** | gecontroleerde upgrade → 0 vulnerabilities | `DEPENDENCY_SECURITY_AUDIT.md` |
| S7 | **Schema drift**: 37 migraties alleen in de DB, niet in Git | **P1** | heropgebouwd, fidelity 62/62 | `SCHEMA_DRIFT_AUDIT.md` |

## Tests uitgevoerd — 85 checks (7 suites), lokaal 85/85 PASS
`relatie-engine` 13 · `discovery` 8 · `claim` 6 · `authz` 19 · `graph` 25 ·
`rejection` 5 · `core-loop-two-users` 9. Runner: `FULLKIN CORE TESTS: PASS — 85/85`.

De `authz`, `graph` en `core-loop`-suites gebruiken **echte ingelogde gebruikers** (geen
service-role-shortcut), de enige manier om autorisatie/loop echt te bewijzen.

## CI-status (PR #1)
- **`db-reproduction`** — verse DB uit `supabase/migrations/*` + seed + schema-assertie:
  **PASS** (~2 min, geen secrets nodig). Bewijst P1.3.
- **`core-tests`** — 85 checks tegen staging: **rood tot `STAGING_SUPABASE_SERVICE_ROLE_KEY`
  is gezet** (credential-actie voor de eigenaar). Dit is P1.4 in actie: geen silent skip —
  de job faalt luid ("Vereiste testconfiguratie ontbreekt: SUPABASE_SERVICE_ROLE_KEY").
- Vercel preview-deploy: PASS (build werkt op Next 16.3.6).

## Live UX-audit (Playwright, eerder)
Zie `FULLKIN_LIVE_UX_AUDIT.md`: 2 passed, 0 console-errors, 0 netwerkfouten ≥400,
login→home 2,3–3,7s. Geen P0/P1-productbugs in de geteste flow.

## Resterende P1/P2 & bekende beperkingen
- **CONNECT is deels** (P2): eenrichtings-"zeg hallo"; volwaardige tweeweg-chat met
  ontdekte familieleden is nog niet gebouwd (bewuste follow-up).
- **`core-tests` CI** groen pas na het zetten van de staging-service-role-secret.
- **Matching op schaal** (confidence/fuzzy) is ontworpen, niet gebouwd — `MATCHING_ARCHITECTURE.md`.
- **Provenance/betwisting** minimaal model voorgesteld, niet gebouwd — `FAMILY_DATA_PROVENANCE.md`
  (huidige velden dekken wie/wanneer/aard al).
- Cosmetisch: `relation_route` noemt bij volle neven/nichten één gemeenschappelijke
  voorouder (Z13).
- Lokale clean-build kon niet op deze machine (geen Docker) → draait in CI.

## Documenten
`SCHEMA_DRIFT_AUDIT.md`, `DATABASE_REPRODUCTION.md`, `MATCHING_ARCHITECTURE.md`,
`FAMILY_DATA_PROVENANCE.md`, `DEPENDENCY_SECURITY_AUDIT.md`, `FULLKIN_CORE_RELEASE_GATE.md`,
`TESTING_SETUP.md`, `FULLKIN_AUDIT.md`, `FULLKIN_LIVE_UX_AUDIT.md`.

## Family Economy
Volledig intact. Niets uit de economie-laag verwijderd; alle economie-objecten zijn nu ook
in Git gereproduceerd (waren deel van de drift).
