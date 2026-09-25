# FULLKIN — Database Reproduction (P1.3)

_Bewijs dat een lege database volledig en correct kan worden opgebouwd uit
`supabase/migrations/*`._

## Wat wordt bewezen

> Clone repo → migraties toepassen → seed → **Fullkin-core werkt.**

Twee onafhankelijke bewijzen:

1. **Fidelity (lokaal, uitgevoerd):** elk van de 62 migratiebestanden is genormaliseerd
   vergeleken met de exact toegepaste SQL in productie
   (`supabase_migrations.schema_migrations`). Resultaat: **62/62 identiek**. De
   migratiemap ís dus letterlijk de historie die productie heeft opgebouwd, in een
   afhankelijkheids-correcte volgorde. Zie `SCHEMA_DRIFT_AUDIT.md`.

2. **Clean build (CI, `db-reproduction`-job):** een verse lokale Supabase-stack bouwt de
   database op uit uitsluitend `supabase/migrations/*` (+ seed) en een assertie
   controleert dat het kernschema bestaat.

## Lokaal reproduceren

Vereist Docker + de Supabase CLI (`brew install supabase/tap/supabase`).

```bash
supabase start                 # bouwt een verse DB uit supabase/migrations/* + seed
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -v ON_ERROR_STOP=1 -f tests/db-reproduction.sql
supabase stop --no-backup
```

`supabase start` past alle 62 migraties toe op een lege database en draait daarna de
seed (`supabase/seed/test_family.sql` → de deterministische Carter-familie). Faalt een
migratie, dan faalt `supabase start`.

## Wat de assertie controleert (`tests/db-reproduction.sql`)

- **Kern-tabellen:** `family_networks`, `persons`, `relationships`, `invites`,
  `person_links`, `begroetingen`, `memberships`, `notifications`.
- **Relatie-engine:** `ancestors_of`, `descendants_of`, `siblings_of`, `relation_label`,
  `relation_route`, `relatie_pad`.
- **Discovery:** `mogelijke_matches`, `bevestig_persoon_match`, `ontdekte_familie`,
  `ontdekt_profiel`, `naam_norm`.
- **Core UX:** `familie_vorm`, `partner_nudge`.
- **Claim:** `invite_preview`, `claim_invite`.
- **Autorisatie/fixtures:** `me`, `my_networks`, `has_role`, `mag_vantage`,
  `laad_testfamilie`, `verwijder_testnetwerk`.
- **Enum:** `relationship_kind` bevat `former_partner`.
- **RLS:** élke `public`-tabel heeft RLS ingeschakeld (regressiebewaking).
- **Seed:** de Carter-familie is geladen (≥ 17 personen).

## CI

De job `db-reproduction` in `.github/workflows/test.yml` draait bovenstaande bij elke push
en PR. Hij heeft **geen secrets** nodig (volledig lokaal in de runner) en draait daarom
ook op fork-PR's — zo krijgt elke bijdrage een echt reproductie-signaal.

## Status

- Fidelity 62/62: **PASS** (lokaal geverifieerd, 25 sep 2026).
- Clean build in CI: geverifieerd via de `db-reproduction`-job — zie de laatste run in
  `CHATGPT_REVIEW.md` (commit-SHA + run-URL).

> Lokaal kon de clean build op deze machine niet gedraaid worden (geen Docker); daarom
> draait hij in CI, waar Docker beschikbaar is. De fidelity-controle is machine-
> onafhankelijk en is wél lokaal uitgevoerd.
