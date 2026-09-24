# FULLKIN — Test-setup & veilige testomgeving

_Doel: Fullkin testen zonder echte familiedata, reproduceerbaar en resetbaar, zodat
een externe reviewer elke kernflow zelf kan nalopen._

---

## 1. Omgevingen

| Omgeving | Status | DB | Aanbeveling |
|---|---|---|---|
| Productie | live (`fullkin.vercel.app`) | Supabase project `fbphiwipvhmkvthmgvhv` | bevat echte familiedata — **niet** als testomgeving gebruiken |
| Staging | **nog niet ingericht** | — | Supabase **branch** of tweede project + Vercel preview + Stripe testmodus |

**Aanbevolen staging (P0):** maak een Supabase-branch (geïsoleerde DB, zelfde schema/migraties)
en koppel een Vercel preview-deploy eraan met eigen env-vars. Zo raakt testen nooit
productie. (Kan ik provisionen op jouw akkoord — er kunnen kosten aan een branch zitten.)

Tot staging er is, is de veilige tussenoplossing: **volledig genamespacete testdata**
(netwerknaam begint met `TEST — …`) die na afloop wordt verwijderd. De seed hieronder
is zo gebouwd.

---

## 2. Secrets & env-vars (nooit in Git)

Vereiste variabelen (Vercel + lokaal `.env.local`, niet committen):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only: settlement, uploads, oprichter-dashboard)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (**testmodus** voor test)
- `NEXT_PUBLIC_APP_URL`
- `FULLKIN_FOUNDER_EMAIL` (optioneel; gate voor `/app/meer/cijfers`)

Controleer met `git log -p -- .env*` dat er nooit secrets zijn gecommit. `.env.local`
staat in `.gitignore`.

---

## 3. Deterministische seed-familie

Bestand: [`supabase/seed/test_family.sql`](supabase/seed/test_family.sql) — de familie
**"Carter"** (netwerk `TEST — Carter`). Resetbaar: het script verwijdert eerst een
bestaande `TEST — Carter` en bouwt 'm opnieuw op.

Structuur (17 personen, 3 generaties):
- Gen 1: George Carter + Helen Carter (geb. Adams)
- Gen 2: Daniel+Anita, Michael+Sophia, Sarah Wilson (geb. Carter)+Peter
- Gen 3: James+Nadia → Leah; Rebecca; Tom (halfbroer, Daniel + Linda); Michelle, David; Emma

Dekt: parent, child, sibling, **half-sibling**, grandparent, grandchild,
great-grandparent, uncle/aunt, cousin, partner, gewijzigde achternaam, geboortenaam,
en een niet-gemodelleerde former partner (Linda — zie audit Z5).

**Laden / resetten** (op een staging/branch-DB):
```bash
psql "$STAGING_DATABASE_URL" -f supabase/seed/test_family.sql
```
Of via de Supabase SQL-editor: plak de inhoud en voer uit. Opnieuw uitvoeren = reset.

**Volledig verwijderen** (namespace-safe):
```sql
do $$ declare net uuid; begin
  select id into net from family_networks where name='TEST — Carter';
  if net is null then return; end if;
  delete from person_links where person_a in (select id from persons where network_id=net)
     or person_b in (select id from persons where network_id=net);
  alter table relationships disable rule relationships_no_delete;
  delete from relationships where network_id=net;
  alter table relationships enable rule relationships_no_delete;
  delete from persons where network_id=net;
  delete from family_networks where id=net;
end $$;
```

---

## 4. Bewijs — relatie-engine geverifieerd op de seed

Op 24 sep 2026 is de seed geladen, de engine gecontroleerd vanuit **James** en daarna
opgeruimd. Resultaten (`relation_label` / `relation_route`):

| Familielid | Label | Uitleg |
|---|---|---|
| Daniel / Anita | ouder | directe voorouder, 1 gen. terug |
| Rebecca | broer of zus | delen dezelfde ouder: Daniel |
| Tom (halfbroer) | broer of zus* | delen dezelfde ouder: Daniel — *half niet onderscheiden (Z12) |
| Michelle / David | neef of nicht | gemeenschappelijke voorouder Helen; via Daniel resp. Michael |
| Emma | neef of nicht | via Daniel resp. Sarah |
| George / Helen | grootouder | directe voorouder, 2 gen. terug |
| Michael / Sarah | oom of tante | gemeenschappelijke voorouder Helen |
| Nadia | partner | jullie zijn partners |
| Leah | kind | directe nakomeling, 1 gen. verder |

Node-voor-node pad (`relatie_pad`) James → Michelle:
**James → Daniel → Helen → Michael → Michelle** ✅ (cousin).

Conclusie: de kern van de relatie-engine is correct. Enige inhoudelijke gap: half-sibling
(Z12). Cosmetisch: route noemt één grootouder (Z13).

---

## 5. Handmatige end-to-end kernflow (reviewer-checklist)

Op een schone staging met testaccounts (twee e-mailadressen die je beheert):

1. Account A → onboarding (`/app/opbouw`): moeder, vader, broer/zus → magic moment op home.
2. A nodigt B uit (native share / link `/welkom/<token>`).
3. B registreert via de link → **claimt** het bestaande profiel (geen duplicaat).
4. B voegt eigen ouders/kinderen toe.
5. Zorg dat A en B een gedeelde persoon hebben (zelfde naam/geboortenaam) →
   `/app/ontdek` toont "Mogelijke match" → bevestig.
6. A ziet op home "Je familie is groter geworden" → opent ontdekt familielid →
   ziet relatie-pad → **Zeg hallo**.
7. B ziet "Familie zei hallo" op `/app/ontdek`.

Meet ondertussen via **Meer → 📊 Groei-cijfers** (oprichter): families, leden,
acceptatiegraad, koppelingen, groeten.

---

## 6. Nog te doen voor volwaardige testbaarheid (P0)

- Geautomatiseerde tests (relatie-engine + matching) op deze seed.
- Echte staging-branch provisionen (isolatie).
- CI die de tests draait vóór deploy.
