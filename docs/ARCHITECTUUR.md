# Fullkin — Architectuurbeslissingen

Afgeleid van Masterdocument V3.0 (juli 2026). Dit document legt vast *waarom*
het schema is zoals het is, zodat latere keuzes de kern niet ondermijnen.

## Status

Fase 1 in aanbouw. Migraties geschreven, **nog niet gedraaid** — er was geen
database beschikbaar bij het schrijven. Alles hieronder is ontwerp, geen
geverifieerd gedrag.

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
| 1 — De Kern | Maand 1-3 | Familiekaart, uitnodigen, profielen, collecte, uitbetaling | In aanbouw |
| 2 — De Economie | Maand 4-7 | Droom Wallet, Familie Pot, rollen, Co-Founder dashboard | |
| 3 — Het Feest | Maand 8-11 | Het Rad, De Stem, titels, videocall | Juridisch geblokkeerd |
| 4 — De Schaal | Maand 12-20 | Ambassadeurs, meertaligheid, mobiele app | |
| 5 — Infrastructuur | Jaar 3+ | Medische partnerships, bank partnerships | |

## Stack

Next.js + Supabase + Stripe Connect, web eerst. React Native volgt in fase 4 op
dezelfde backend. Web eerst omdat het sneller itereert en direct testbaar is met
echte familie — geen App Store review tussen jou en je eerste transactie.
