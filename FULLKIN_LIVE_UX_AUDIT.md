# FULLKIN — Live UX-audit (Playwright, echte productie-app)

_Browsergestuurde end-to-end audit tegen de live app. Geen mocks. Geen productcode
gewijzigd om iets te verhullen. Bugs zijn gedocumenteerd, niet gefixt._

## Environment
| | |
|---|---|
| Live URL | https://fullkin.vercel.app |
| Browser | Chromium (Playwright headless, v1.63) |
| Mobiel (primair) | 390 × 844 |
| Desktop | 1440 × 900 |
| Datum | 24 sep 2026 |
| Commit onder test | `9bef86d` (main; app-code identiek aan `e282464`, laatste code-deploy) |
| Account | `demo.reviewer@fullkin.app` (via `FULLKIN_DEMO_EMAIL`/`FULLKIN_DEMO_PASSWORD`, niet in Git) |
| Test | `e2e/live-audit.spec.ts` · config `playwright.config.ts` |
| Artifacts | `audit/live-2026-09-24/{mobile,desktop}/` (screenshots + json); traces/video lokaal (gitignored — bevatten de login-POST) |

## Test results (PASS / FAIL)

Beide viewports: **2 passed**. Alle soft-asserts geslaagd; geen console-errors; geen netwerkfouten ≥400.

| Flow | Resultaat | Bewijs |
|---|---|---|
| Login | ✅ PASS | `01-login.png`, `02-home.png`; login→home 3,7s (mobiel) / 2,3s (desktop) |
| Thuis — magic moment | ✅ PASS | `02-home.png` (leden/herkend/generaties + "groter geworden"-banner) |
| Michelle discovery (Ontdek) | ✅ PASS | `03-discover.png` — "Michelle Boateng" zichtbaar |
| Michelle relatie-uitleg + pad | ✅ PASS | `04-michelle-profile.png`, `05-michelle-path.png` — "Jij → je oom of tante Yaw → …" |
| Kojo matching | ✅ PASS | `06-kojo-before.png`, `07-kojo-after.png` — "Ja, dezelfde persoon" (1,5s) |
| David discovery (na Kojo) | ✅ PASS | `08-david-discovered.png` — David verschijnt |
| Familie | ✅ PASS | `09-familie.png` |
| Relatie-uitleg op profiel | ✅ PASS | `10-persoon-relatie.png` — "Hoe zijn jullie familie?" |
| Mobiel — horizontale overflow | ✅ PASS | scrollWidth ≤ clientWidth |
| Console-errors | ✅ PASS | `mobile/console-errors.json` = `[]` |
| Network (≥400) | ✅ PASS | `mobile/network-errors.json` = `[]` |

## Exact waargenomen UX (wat werkelijk gebeurde)

1. **Landing → login:** `/` toont de app; `/inloggen` toont "Welkom terug", Google-knop + e-mail/wachtwoord. Login met het demo-account leidt door naar `/app` in ~3,7s (mobiel).
2. **Thuis:** de hero "Je familie krijgt vorm" met drie getallen (familieleden / relaties automatisch herkend / generaties), gevolgd door de banner **"Je familie is groter geworden"** met een aantal, plus de primaire knop **"Nodig familie uit"**.
3. **Ontdek:** toont **Michelle Boateng** als ontdekt familielid met een "Bekijk →"-link, plus een sectie "Mogelijke matches" met **Kojo Mensah**.
4. **Michelle-profiel:** kop met naam + "uit de familie Demo — familie Boateng", kaart **"Hoe zijn jullie familie?"** met **"Michelle is het kind van je oom of tante Yaw"** en het node-pad **"Jij → je oom of tante Yaw → Yaw's kind Michelle"**, een knop **"Zeg hallo tegen Michelle 👋"**, en een privacy-regel dat geboortedatum/contact verborgen blijven.
5. **Kojo-match:** "Ja, dezelfde persoon" → na ~1,5s ververst de lijst en verschijnt **David** als nieuw ontdekt familielid.
6. **Familie / profiel:** de stamboom en een persoonsprofiel met de "Hoe zijn jullie familie?"-uitleg.

**Audit-vraag "is onmiddellijk begrijpelijk dat Fullkin automatisch nieuwe verbindingen vond?"** — Ja: zowel de home-banner ("je familie is groter geworden") als het Ontdek-scherm benoemen expliciet nieuw ontdekte familieleden, met een leesbaar pad dat de verwantschap uitlegt.

## Bugs

**Geen P0- of P1-productbugs in de geteste flow.** Login, discovery, matching→David, en de relatie-uitleg werken; nul console-errors, nul netwerkfouten ≥400, geen horizontale overflow op mobiel.

Wel de volgende **P2 / observaties** (niet gefixt, per opdracht):

| # | Severity | Observatie | Waar |
|---|---|---|---|
| O1 | P2 | Relatie-labels zijn gender-neutraal ("oom of tante", "neef of nicht", "broer of zus"). Correct maar iets onpersoonlijk; zonder geslacht op `persons` niet te vermijden. | Michelle-profiel, familie |
| O2 | P2 | Zin "Michelle is het kind van je oom of tante Yaw" is grammaticaal wat stroef; "je nicht" zou warmer zijn (label bestaat al: neef/nicht). | `05-michelle-path.png` |
| O3 | P2 | "Zeg hallo" is eenrichting; er is (bewust) nog geen tweeweg-contact/chat met een ontdekt familielid. CONNECT is dus deels. | Michelle-profiel |
| O4 | P2 | `relation_route` noemt bij volle neven/nichten één gemeenschappelijke voorouder i.p.v. beide (bekend, audit Z13). | profiel-uitleg |

_Test-methodologie-noot (geen productbug):_ de eerste run faalde op een te brede
selector (`getByText("Michelle")` → strict-mode, meerdere treffers). Opgelost door
de test te verfijnen (rol/relatie-scoped locators) — de productie-UI is niet gewijzigd.

## Core-loop assessment (op basis van bewijs)

| Stap | Bewezen in deze live-audit? |
|---|---|
| BUILD | ⚠️ niet live getest (demo-account is voorgevuld). Wél gedekt door `npm test` (relatie-engine) + tweede leeg account beschikbaar voor handmatige onboarding. |
| INVITE | ⚠️ niet in deze live-run (vereist tweede echte gebruiker). Native-share-knop aanwezig. |
| CLAIM | ⚠️ niet live (demo pre-geclaimd). Wél end-to-end gedekt door `tests/claim.test.mjs` (6 checks). |
| MATCH | ✅ bewezen: Kojo herkend als mogelijke match, bevestigd. |
| DISCOVER | ✅ bewezen: Michelle (voorgekoppeld) én David (na bevestiging) ontdekt met correct pad. |
| CONNECT | ◑ deels: "Zeg hallo" aanwezig; geen volledige tweeweg-communicatie. |
| GROW | ◑ impliciet: uitnodigen + ontdekken aanwezig; echte virale groei niet meetbaar in één demo. |

## High-level consumer quality (op observaties)
- **Snelheid:** goed — alle interacties < ~1,6s, login→home 2,3–3,7s. Geen merkbare haperingen.
- **Duidelijkheid:** de kern (familie groeit + hoe ben je verbonden) is expliciet en in gewone taal.
- **Emotie:** "je familie is groter geworden" + het pad "Jij → … → Michelle" landt het "aha".
- **Polish:** nul console/netwerk-fouten, geen mobiele overflow — technisch net.
- **Trust:** privacy zichtbaar gecommuniceerd (geboortedatum/contact verborgen bij ontdekten).

## Top 10 verbeteringen (geen fixes uitgevoerd)
1. Geslacht optioneel op `persons` → warmere labels (oom/tante, neef/nicht, broer/zus).
2. Zinsbouw op ontdekt-profiel verfijnen ("je nicht Michelle" i.p.v. "het kind van je oom of tante").
3. Tweeweg-contact na "Zeg hallo" (bevestiging/terug-groeten die tot chat leidt) → CONNECT afmaken.
4. `relation_route` beide gemeenschappelijke voorouders noemen (Z13).
5. Live BUILD/INVITE/CLAIM in een geautomatiseerde multi-user e2e opnemen.
6. Duplicate-matching: confidence-score + gedeelde-ouder-signalen tonen bij een match.
7. Onboarding-empty-state voor een vers account visueel testen (tweede demo-account).
8. Accessibility: volledige as-tree-audit (deze run deed alleen een smoke-check).
9. Performance onder tragere netwerken meten (nu snelle CI-lijn).
10. Lege/rand-states (geen ontdekten, geen matches) expliciet ontwerpen en testen.

_Einde live UX-audit._
