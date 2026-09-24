# CHATGPT — Reviewer handoff

Handoff voor de onafhankelijke reviewer (ChatGPT met repo-toegang, zonder interactieve
browser). Alles hieronder is bewijs uit een echte browsergestuurde live-audit.

## Commit & omgeving
- **Commit onder test:** `9bef86d` (main). App-code laatst gewijzigd in `e282464` (former_partner).
- **Live app:** https://fullkin.vercel.app
- **Repo:** https://github.com/sarpongingram-ux/fullkin (public)

## Waar alles staat
| Artefact | Locatie |
|---|---|
| Live UX-audit-rapport | `FULLKIN_LIVE_UX_AUDIT.md` |
| Technische/product-audit | `FULLKIN_AUDIT.md` (v1.1) |
| Test-setup + reviewer-checklist | `TESTING_SETUP.md` |
| Screenshots (mobiel + desktop) | `audit/live-2026-09-24/{mobile,desktop}/*.png` |
| Console/network/timings | `audit/live-2026-09-24/{mobile,desktop}/*.json` |
| Playwright-test + config | `e2e/live-audit.spec.ts`, `playwright.config.ts` |
| Unit/integratietests | `tests/relatie-engine.test.mjs`, `tests/discovery.test.mjs`, `tests/claim.test.mjs` |
| DB-logica (SQL) | Supabase-functies (`relation_label`, `relation_route`, `relatie_pad`, `mogelijke_matches`, `ontdekte_familie`, `ontdekt_profiel`, `claim_invite`) |

## PASS/FAIL (live, mobiel 390×844 + desktop 1440×900)
Login ✅ · Thuis/magic-moment ✅ · Michelle discovery ✅ · Michelle pad ✅ · Kojo matching ✅ ·
David discovery ✅ · Familie ✅ · Relatie-uitleg ✅ · Mobiel (geen overflow) ✅ ·
Console-errors ✅ (0) · Network ≥400 ✅ (0). **2 passed.**

## P0 / P1 / P2
- **P0:** geen.
- **P1:** geen in de geteste flow.
- **P2:** O1 gender-neutrale labels · O2 stroeve zin op ontdekt-profiel · O3 "Zeg hallo" is eenrichting (CONNECT deels) · O4 `relation_route` noemt één voorouder. (Details in `FULLKIN_LIVE_UX_AUDIT.md`.)

## Bekende beperkingen / niet live getest
- **BUILD / INVITE** niet in deze live-run (INVITE vereist een tweede echte gebruiker + e-mail). CLAIM en de relatie-engine zijn wél gedekt door de unit/integratietests (`npm test`, 27 checks).
- **Traces/video's zijn NIET gecommit** (ze bevatten de login-POST met wachtwoord + sessiecookies). Ze zijn lokaal reproduceerbaar via `npx playwright test`.
- **Accessibility** = smoke (role-based selectors op knoppen/links werkten → accessible names aanwezig; login-inputs hebben labels). Geen volledige as-tree-audit.
- Eén snelle netwerkverbinding; geen throttling.

## Demo-data-mutaties door deze test
De live-audit heeft de match **Kojo Mensah** bevestigd → er ontstond een `person_link`
(KojoA↔KojoC) → **David** werd ontdekt. **Deze mutatie is na de audit teruggedraaid**
(de Kojo-koppeling is verwijderd), zodat het demo-account weer in de begintoestand staat
(Michelle al ontdekt; Kojo weer als openstaande "mogelijke match"). De human-reviewer ziet
dus dezelfde uitgangssituatie.

## Reproduceren
```bash
# Unit/integratie (27 checks) tegen staging:
npm test                     # env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY
# Live browser-audit:
FULLKIN_DEMO_EMAIL=… FULLKIN_DEMO_PASSWORD=… npx playwright test
```

## Onafhankelijke oordeelsvorming voor de reviewer
1. Lees `FULLKIN_LIVE_UX_AUDIT.md` + bekijk `audit/live-2026-09-24/**/*.png`.
2. Inspecteer `e2e/live-audit.spec.ts` (wat is precies geassert) en de SQL-functies.
3. Draai zelf `npm test` en (met creds) de Playwright-audit.
4. Beoordeel of de conclusies kloppen met de screenshots en de code.
