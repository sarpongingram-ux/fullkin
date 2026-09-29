# Matching-kalibratie

_Hoe we de matching-score (zie `MATCHING_ARCHITECTURE.md`) datagedreven afstemmen op de
echte beslissingen van families — en waarom de gewichten nú nog niet wijzigen._

## Waarom nog niet numeriek kalibreren

Kalibreren betekent de gewichten/drempel afstemmen op gelabelde voorbeelden: paren die de
familie **bevestigde** (positief) en **afwees** (negatief). Op dit moment is er te weinig
data (bij de laatste run: 1 bevestigd, 0 afgewezen). Gewichten fitten op zo weinig
voorbeelden is overfitten, geen kalibratie. Daarom: **de gewichten blijven ongewijzigd** en
we bouwen het fundament zodat kalibratie betrouwbaar wordt zodra de data groeit.

## Wat er nu is (het fundament)

1. **Complete labelset.** `bevestig_persoon_match` legt een bevestiging nu óók vast als
   `person_match_decisions.decision = 'confirmed'` (naast `person_links`). Samen met de
   `'rejected'`-beslissingen (via "Nee, ander persoon") staan positieven én negatieven zo op
   één plek — de trainingsdata voor kalibratie.
2. **Evaluatiefunctie** `matching_kalibratie()` (service_role): zet de huidige `match_score`
   af tegen die historie en geeft per label (bevestigd/afgewezen) de score-verdeling, de
   nauwkeurigheid op de drempel, en — bij een schone scheiding — een voorgestelde drempel.
3. **Script** `scripts/kalibreer-matching.mjs`: draait de evaluatie en geeft een leesbaar
   advies (of meldt dat er nog te weinig data is).

```bash
node --env-file=.env.local scripts/kalibreer-matching.mjs
```

## Het kalibratieproces (zodra er data is)

1. Draai het script. Streef naar ≥ ~10 bevestigd én ~10 afgewezen (`genoeg_data`).
2. **Schone scheiding** (hoogste afwijzing < laagste bevestiging): neem de voorgestelde
   drempel over — werk `45` bij op de plekken die `match_score` gebruiken
   (`mogelijke_matches`, `bevestig_persoon_match`) via een additieve migratie.
3. **Overlap**: bevestigd en afgewezen overlappen in score → de gewichten missen een
   onderscheidend signaal. Bekijk welke voorbeelden fout vallen en pas de relatieve
   gewichten aan in `match_score` (naam / geboortedatum / gedeelde verwanten / locatie).
   Draai het script opnieuw en herhaal.
4. Houd elke wijziging in Git (migratie) en laat de clean-build + tests groen blijven.

## Huidige status

Laatste run: **1 bevestigd (score 93), 0 afgewezen** → `genoeg_data = false`. Geen
wijziging aan de gewichten. Herhaal wanneer families meer matches beoordeeld hebben.
