# FULLKIN — Matching Architecture (P1.12)

_Hoe Fullkin kandidaat-verbindingen tussen families vindt. Nu bewust eenvoudig; het
model is voorbereid op schaal zonder premature complexiteit. **De finale beslissing
blijft altijd menselijk.**_

## Principe

> Kandidaat-generatie is een suggestie. **Bevestigen doet een mens.** Er wordt nooit
> automatisch samengevoegd.

- Bevestigen: `bevestig_persoon_match(p_a, p_b)` — valideert dat het paar een echte
  kandidaat is en dat de aanroeper één kant bezit (P1.8), maakt dan een `person_links`-rij.
- Afwijzen: `wijs_match_af(p_a, p_b)` — onthoudt "niet dezelfde persoon" in
  `person_match_decisions` (P1.11); wordt niet opnieuw voorgesteld.

## Nu — kandidaat-generatie (`mogelijke_matches`)

### Kandidaat-generatie + fuzzy blocking

Een paar (mp in mijn netwerk, op in een ander netwerk) komt in aanmerking als
`op.network_id <> mp.network_id` en één van:

1. `naam_norm(voornaam+achternaam)` gelijk, of
2. gelijke genormaliseerde `birth_name` (dekt gewijzigde/meisjesnaam), of
3. **fuzzy**: `similarity(naam_norm(...), naam_norm(...)) > 0.4` (pg_trgm — spelvarianten/typefouten).

`naam_norm` normaliseert (kleine letters, accenten/leestekens/spaties/tussenvoegsels weg),
zodat "O'Brien", "obrien" en "Obrien" samenvallen. Een GIN-trigram-index
(`persons_naam_trgm`) versnelt de fuzzy vergelijking.

### Confidence-score (`match_score`, 0–100) — geïmplementeerd

Elk kandidaat-paar krijgt een gewogen score:

| Signaal | Bijdrage |
|---|---|
| Naam: exacte naam **of** exacte geboortenaam | +55 |
| Naam: fuzzy (trigram-similariteit) | `round(45 × similarity)` |
| Geboortedatum gelijk | +30 |
| Geboortejaar dichtbij (≤ 366 dagen) | +12 |
| Geboortedatum duidelijk verschillend | **−40** (drukt valse positieven weg) |
| Families al verbonden (bestaande brug) | +15 |
| Zelfde woonplaats / zelfde land | +6 / +3 |

Het naam-onderdeel neemt het **beste** van exact/geboortenaam/fuzzy. De som wordt geklemd
op 0–100. **Drempel = 45**: alleen daarboven wordt een paar getoond. `mogelijke_matches`
**rangschikt aflopend op score** en geeft de score + een leesbare reden (`signaal`) terug;
de UI toont een label ("Sterke match / Waarschijnlijk / Mogelijk" + percentage).

**Dezelfde score is de poort in `bevestig_persoon_match`** (score ≥ 45), zodat precies de
getoonde kandidaten bevestigbaar zijn — en niets daarbuiten (P1.8).

### Later — probabilistisch / op schaal

- **Blocking-keys** verfijnen bij groot volume (bv. `naam_norm(achternaam)` + geboortejaar)
  om de vergelijkingsruimte verder te snoeien.
- **Gedeelde-verwanten-signaal** verfijnen: niet alleen "families al verbonden", maar
  concrete gedeelde ouders/kinderen/partner meewegen.
- **Gewichten kalibreren** op echte bevestig/afwijs-data (de `person_match_decisions`-
  historie is de labelset), eventueel een probabilistisch/ML-model.

Wat **niet** verandert: geen automatische merge; `person_links` ontstaat alleen na
menselijke bevestiging; afwijzingen blijven onthouden.

## Testdekking

`tests/matching.test.mjs` (score/fuzzy/drempel/rangschikking),
`tests/discovery.test.mjs` (matching → koppeling → ontdekking → privacy),
`tests/rejection.test.mjs` (afwijzing persistent), `tests/authz.test.mjs`
(kandidaat-validatie + IDOR). Zie `TESTING_SETUP.md`.
