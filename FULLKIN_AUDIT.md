# FULLKIN — Technische & product-audit

_Opgesteld door Claude Code (implementatie-engineer) als onafhankelijk auditeerbaar
document. Peildatum: 24 sep 2026. Doel: een externe reviewer (ChatGPT) kan elke
belangrijke flow zelf nalopen._

Missie: **families verbonden houden en familieleden ontdekken die je nog niet kent.**
Kernloop: BUILD → INVITE → CLAIM → MATCH → DISCOVER → CONNECT → GROW.

---

## 0. Architectuur in het kort

| Laag | Keuze |
|---|---|
| Frontend | Next.js 16 (App Router), server components + server actions, Tailwind, mobile-first (`max-w-md`, `BottomNav`) |
| Backend | Supabase (Postgres 17), RLS + SECURITY DEFINER RPC's, `@supabase/ssr` |
| Auth | Supabase Auth; middleware `src/proxy.ts`; `me()` mapt `auth.uid()` → `persons`-node |
| Betalen | Stripe (Checkout, subscriptions, **Connect** destination charges + transfers), webhook `/api/stripe/webhook` |
| Hosting | Vercel (regio `dub1`, naast Supabase eu-west) |
| Types | `src/lib/types/database.ts`, hergegenereerd na elke migratie |

Relatie-model (fundament, matcht Fase 4/5 van de brief):
- `persons` (nodes): `first_name, last_name, birth_name, born_on, died_on, city, country, photo_url, claimed_by, managed_by, network_id`.
- `relationships` (edges): `kind ∈ {parent, partner}`, `origin ∈ {biological, adoptive, step, foster, donor, chosen}`, `from_person, to_person`.
- Afgeleide relaties via `ancestors_of` / `descendants_of` → `relation_label(me,other)` (label), `relation_route(me,other)` (uitleg), `relatie_pad(me,other)` (node-voor-node pad), `family_map(me)` (perspectief).
- **Siblings worden afgeleid** uit gedeelde ouders (niet apart opgeslagen). ✅

---

## 1. Sterke punten (behouden)

1. **Zuiver persons+relationships-model**, niet rond achternamen. Relaties worden
   automatisch berekend; getest: half-zus via gedeelde moeder gaf correct pad
   `Jij → Grace Serwaa → Vida`.
2. **Persoonlijk perspectief** via `family_map(me)` — dezelfde graph, ander middelpunt (Fase 6). ✅
3. **Claim profile** (`claim_invite`): placeholder-nodes bestaan vóór een account; bij
   claimen wordt géén tweede profiel gemaakt (binnen een netwerk afgedwongen). ✅ (Fase 7)
4. **Cross-family discovery met menselijke bevestiging** (`person_links`,
   `mogelijke_matches`, `bevestig_persoon_match`, `ontdekte_familie`) — nooit auto-merge,
   audittrail via `person_links.confirmed_by`. ✅ (Fase 8)
5. **Privacy-voorwaarts**: bedragen nooit zichtbaar onder 3 gevers; ontdekte familieleden
   tonen alleen naam + pad, geen geboortedatum/contact (`ontdekt_profiel`); RLS per netwerk.
6. **Wrijvingsloze groei-loop**: snelle onboarding (`/app/opbouw`), native share-invite,
   magic moments op home.
7. Werkt live, mobiel-first, gedeployed.

---

## 2. Zwaktes & technische schuld (eerlijk)

| # | Zwakte | Impact | Prio |
|---|---|---|---|
| Z1 | **Geen geautomatiseerde tests.** De relatie-engine is alleen ad-hoc via SQL getest. | Grootste blokker voor "onafhankelijk auditeerbaar". | **P0** |
| Z2 | **Geen staging-omgeving.** Eén Supabase-project + Vercel-prod; testdata is tot nu toe op prod aangemaakt/verwijderd. | Risico op vervuiling echte familiedata. | **P0** |
| Z3 | **Duplicate-matching = exacte genormaliseerde naam/geboortenaam.** Geen fuzzy (pg_trgm niet geïnstalleerd), geen confidence-score, gebruikt nog niet gedeelde ouders/kinderen als signaal. | Mist typfouten; kan false positives geven op schaal. | P1 |
| Z4 | **Matching schaalt niet.** `mogelijke_matches` doet een cross-join op genormaliseerde naam over álle netwerken, zonder index/blocking. | Bij miljoenen nodes onhoudbaar. | P1 |
| Z5 | **`former_partner` niet gemodelleerd** (`relationship_kind` = alleen parent/partner). Hertrouwen/ex-partner kan niet correct worden vastgelegd. | Onvolledig relatie-ontologie (Fase 4). | P1 |
| Z6 | **Cross-network relatie is compositie via de brug** (`mijn_kant`/`hun_kant`), geen volledige cross-graph engine. Verre cross-network relaties krijgen een grof label. | Discovery-uitleg soms grof. | P2 |
| Z7 | **Geen per-veld privacy/zichtbaarheid** en **geen minderjarigen/consent** (Fase 4/§18). | Privacy onvolledig voor schaal. | P1 |
| Z8 | **Veel SECURITY DEFINER-RPC's**; advisor flagde ze. De gevoelige (keeper-saldo, systeem/trigger-functies) zijn afgeschermd, maar een volledige audit per functie ontbreekt. | Beveiligingsoppervlak. | P1 |
| Z9 | **Geen error-monitoring** (Sentry o.i.d.); terugkerende PostgREST "Thread killed by timeout" in logs (nog niet herleid). | Blinde vlek bij incidenten. | P1 |
| Z10 | **`relatie_pad` = recursieve BFS (depth ≤ 8)** — prima voor families, onbegrensd op enorme verbonden graphs. | Performance op schaal. | P2 |
| Z11 | **Economie-laag** (collectes/pot/keeper/Stripe/Connect) vergroot oppervlak + **regelgeving** (PSD2/BTW). Niet kern van deze missie. | Afleiding + juridisch. | P2 (secundair houden) |
| Z12 | ~~Half-siblings worden niet onderscheiden.~~ **OPGELOST (24 sep 2026):** `relation_label`/`relation_route` tellen gedeelde ouders → 2 = "broer of zus", 1 = "halfbroer of halfzus". Gedekt door de testsuite. | — | ✅ done |
| Z13 | **`relation_route` noemt één gemeenschappelijke voorouder** ("voorouder is Helen") i.p.v. beide grootouders bij volle neven/nichten; bij oom/tante is de "tak"-naam soms de persoon zelf ("aan de kant van Michael via Michael"). | Cosmetisch, iets verwarrend. | P2 |

---

## 3. Risico's per categorie

- **Relatie-integriteit:** siblings afgeleid uit gedeelde ouders is correct, maar hangt
  af van juist ingevoerde ouder-edges; ontbrekende ouder → geen sibling/oom-detectie.
  `former_partner`-gat kan tot verkeerde "huidige partner"-aannames leiden.
- **Privacy/security:** RLS per netwerk is solide; het eerder gevonden keeper-IDOR-lek is
  gedicht (lidmaatschapscheck). Restrisico: per-veld zichtbaarheid en minderjarigen
  ontbreken; discovery onthult namen over families heen (bewust, maar zonder opt-out).
- **Groei-loop:** invite → claim → match → discover werkt end-to-end (bewezen op
  dataniveau), maar is nog niet met echte, onafhankelijke gebruikers getest.
- **Schaalbaarheid:** matching en enkele RPC's zijn niet geïndexeerd/geoptimaliseerd voor
  miljoenen nodes; nu prima voor pilotgrootte.

---

## 4. Aanbevelingen — P0 / P1 / P2

**P0 (nodig om onafhankelijk te kunnen auditen):**
- ✅ **Gedaan:** geautomatiseerde tests (`npm test`, 20 checks) — relatie-engine
  (`tests/relatie-engine.test.mjs`, 12) én matching+discovery+privacy
  (`tests/discovery.test.mjs`, 8: `mogelijke_matches` → koppeling → `ontdekte_familie`
  → `ontdekt_profiel` gating → geen dubbele match). Seedt en ruimt zelf op via
  `laad_testfamilie`/`verwijder_testnetwerk`. **CI:** `.github/workflows/test.yml` draait
  ze bij elke push/PR tegen een STAGING-DB (skipt netjes zonder staging-secrets).
  Nog te doen: claim-flow onder test; echte staging provisionen.
- Deterministische, resetbare **seed-familie** (zie `supabase/seed/test_family.sql`).
- **Staging/test-isolatie** (Supabase-branch of tweede project) zodat testen nooit
  prod-familiedata raakt. Zie `TESTING_SETUP.md`.

**P1:**
- Matching: confidence-score + gedeelde-ouder/kind-signalen + fuzzy (pg_trgm) + index op
  genormaliseerde naam.
- `former_partner` toevoegen aan `relationship_kind`.
- Per-veld zichtbaarheid + minderjarigen/consent.
- Error-monitoring; PostgREST-timeouts herleiden.

**P2:**
- Volledige cross-graph relatie-engine (label over netwerken heen).
- Economie/juridisch (PSD2/BTW) vóór live geld; economie secundair houden in de UX.

---

## 5. Bewijs / reproduceerbaarheid voor de reviewer

- Kernfuncties zijn SQL en te inspecteren via `pg_get_functiondef`.
- De §25-scenario (twee families die een oom delen → nicht ontdekt) is op dataniveau
  gedraaid en daarna opgeruimd; herhaalbaar via `supabase/seed/test_family.sql` + de
  matching/discovery-RPC's.
- `TESTING_SETUP.md` beschrijft hoe je een schone omgeving opzet, de seed laadt/reset en
  de flows naloopt.
