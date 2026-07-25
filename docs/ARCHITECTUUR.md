# Fullkin — Architectuurbeslissingen

Afgeleid van Masterdocument V3.0 (juli 2026). Dit document legt vast *waarom*
het schema is zoals het is, zodat latere keuzes de kern niet ondermijnen.

## Status

Fase 1 — eerste verticale doorsnede werkend en geverifieerd in de browser
(25 juli 2026). Supabase-project `fbphiwipvhmkvthmgvhv` (EU, eu-west-1). Zes
migraties toegepast; security advisor schoon (alleen bewuste WARNs, zie onder).
Een testfamilie van drie generaties bevestigt dat de afgeleide relatielabels
(grootouder, oom/tante, neef/nicht) in alle richtingen kloppen, en dat een
`DELETE` op relaties niets doet.

**Fase 1 is compleet en end-to-end getest.** De volledige kern loopt: inloggen →
familiekaart → familielid toevoegen → uitnodigen → claimen → collecte starten →
bijdragen → afrekenen met 5%-splitsing → anonimiteitsweergave.

De collecte "Verjaardag van Kwame" bewees de kernbelofte: Kofi gaf €5, Ama €200,
Abena €0,75 anoniem. De pagina toont totaal €205,75 en drie namen (waarvan één
"Een familielid"), maar nergens een individueel bedrag. De 5%-splitsing klopt op
de cent, met de afrondingsrest naar de ontvanger.

Openstaand voor productie: Stripe-sleutels invullen (`.env.local`) zodat de
echte Checkout-flow en webhook lopen; nu draait de collecte in dev-modus waarin
bijdragen handmatig worden afgerekend via `settle_contribution`. En: geld gaat
nu naar het platform-account; om het conform sectie 8 rechtstreeks naar de
ontvanger te laten gaan is Stripe Connect-onboarding van de begunstigde nodig.

## De vier beslissingen die vastliggen

### 1. Persoon ≠ gebruiker

`persons` staat los van `auth.users`. Opa Emmanuel (70, Accra, geen smartphone)
is een volwaardige persoon op de familiekaart, aangemaakt door zijn kleinkind
via `managed_by`. Als hij ooit zelf inlogt claimt hij hetzelfde record via
`claimed_by` — zonder dataverlies.

Zonder deze scheiding valt de helft van de doelgroep uit het product. Dit is de
eerste beslissing die je nooit meer terugdraait.

### 2. Alleen ouder-kind en partner worden opgeslagen

`relationships.kind` kent twee waarden. Broer, zus, neef, nicht, oom, tante,
oudtante — allemaal afgeleid via `relation_label()` uit de ouder-graaf.

Dit is wat "jij hoeft nooit een stamboom te tekenen" technisch betekent. Ieder
familielid voert zijn eigen vier of vijf directe relaties in; de kaart van 186
personen ontstaat vanzelf uit de overlap.

### 3. Er is geen delete

Een `RULE ... DO INSTEAD NOTHING` op `relationships` en `contact_states` maakt
verwijderen fysiek onmogelijk, ook via de service role, ook via een bug.

De Wet van Fullkin is geen tekst in de UI maar een eigenschap van de database:

> "Familie kun je niet verwijderen. Alleen de afstand tussen jullie kan kleiner worden."

Wat gebruikers zoeken als ze "verwijderen" willen, vinden ze in
`contact_states`: `verbonden` → `stil` → `herstellend`. De persoon blijft altijd
zichtbaar op de kaart.

### 4. Bedragen verlaten de database niet

De regel uit sectie 7.1 — *iedereen ziet WIE, niemand ziet HOEVEEL* — is
geïmplementeerd als RLS-policy, niet als UI-keuze:

- `contributions` SELECT geeft uitsluitend je eigen rijen terug.
- De familie leest bijdragen via twee views: `collection_contributors` (namen,
  geen bedrag) en `collection_totals` (som, geen individuele bedragen).
- Alleen de Stripe-webhook (service role) schrijft bedragen en statussen.

De oma die €0,75 geeft en de oom die €200 geeft staan naast elkaar in dezelfde
lijst. Geen schaamte, geen druk, geen jaloezie. Als dit ooit lekt is het
kernidee van het product kapot.

## Geldstroom

Bijdragen gaan via Stripe Connect **rechtstreeks** van betaler naar de rekening
van de ontvanger. Fullkin houdt geen saldo van derden aan.

Dit is bewust: zodra geld van anderen op het platform blijft staan kom je in het
domein van PSD2 en e-money, met vergunningplicht. De Familie Pot (fase 2) moet
op dezelfde manier worden ontworpen of expliciet juridisch worden geregeld.

Verdeling per transactie (sectie 8) wordt vastgelegd in `transaction_splits`,
niet berekend bij uitlezing — als de percentages ooit wijzigen mag dat nooit met
terugwerkende kracht gelden. De afrondingsrest gaat naar de ontvanger, nooit
naar het platform.

## Openstaand risico — bewust geaccepteerd

Het Rad (sectie 7.5) is naar Nederlands recht waarschijnlijk een
vergunningplichtig kansspel: deelnemers betalen in, er is een prijzenpot, de
winnaar wordt door toeval bepaald, en een commerciële partij verdient eraan. Dat
lootjes worden verdiend *door bij te dragen* versterkt de koppeling tussen inleg
en winkans.

De oprichter is hierop gewezen en heeft besloten volledig te bouwen. Mitigatie
in de bouw: het Rad komt achter een feature-flag per land, wat sowieso nodig is
voor de gefaseerde landenlancering uit sectie 13.

Actiepunt buiten de code: kansspeljurist raadplegen vóór fase 3 live gaat.

## Roadmap

| Fase | Periode | Inhoud | Status |
|---|---|---|---|
| 1 — De Kern | Maand 1-3 | Familiekaart, uitnodigen, profielen, collecte, uitbetaling | **Compleet** (Stripe-sleutels nog invullen) |
| 2 — De Economie | Maand 4-7 | Droom Wallet, Familie Pot, rollen, Co-Founder dashboard | Droom Wallet, rollen + dashboard werkend; Familie Pot + Business Droom volgen |
| 3 — Het Feest | Maand 8-11 | Het Rad, De Stem, titels, videocall | Juridisch geblokkeerd |
| 4 — De Schaal | Maand 12-20 | Ambassadeurs, meertaligheid, mobiele app | |
| 5 — Infrastructuur | Jaar 3+ | Medische partnerships, bank partnerships | |

## Stack

Next.js + Supabase + Stripe Connect, web eerst. React Native volgt in fase 4 op
dezelfde backend. Web eerst omdat het sneller itereert en direct testbaar is met
echte familie — geen App Store review tussen jou en je eerste transactie.

## Bewust geaccepteerde security-warnings

De Supabase advisor meldt 5 WARNs van het type "authenticated kan deze SECURITY
DEFINER functie aanroepen". Dit is nodig en veilig:

- `me()`, `my_networks()`, `has_role()` draaien *binnen* de RLS-policies. Zonder
  SECURITY DEFINER krijg je oneindige policy-recursie. Ze geven alleen de eigen
  identiteit/netwerken terug.
- `collection_contributors()`, `collection_total()` zijn de anonimiteitsgrens.
  Ze aggregeren langs de contributions-RLS heen, met een netwerkcheck erin, en
  geven nooit een individueel bedrag terug.

## Lokaal draaien

```
cd ~/Desktop/fullkin
PORT=3210 npm run dev      # http://localhost:3210
```

Demo-logins (alleen dev-database): `kofi@fullkin.test` en
`kwame@fullkin.test`, beide wachtwoord `fullkin-demo-2026`.

**Let op — e-mailbevestiging.** De uitnodigings-claim laat een nieuwe gebruiker
zijn account aanmaken en direct zijn plek claimen. Dat werkt alleen naadloos als
e-mailbevestiging in Supabase Auth uitstaat (Authentication → Providers → Email
→ "Confirm email" uit), óf als we later magic links gebruiken. Staat bevestiging
aan, dan toont de claim-pagina netjes "bevestig je e-mail en open de link
opnieuw". De demo-accounts zijn via SQL vooraf bevestigd om dit te omzeilen.

Env staat in `.env.local` (niet in git). Na een migratie de types
hergenereren en `src/lib/types/database.ts` bijwerken.
