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

Een paar (mp in mijn netwerk, op in een ander netwerk) is een kandidaat als:

1. `op.network_id <> mp.network_id` (cross-family), en
2. **naam-signaal**: `naam_norm(voornaam+achternaam)` gelijk, **of** gelijke
   genormaliseerde `birth_name` (dekt gewijzigde/meisjesnaam), en
3. **geboortedatum verenigbaar**: één van beide `born_on` is leeg, of ze zijn gelijk, en
4. nog niet bevestigd (`person_links`) en niet afgewezen (`person_match_decisions`).

`naam_norm` maakt matching toleranter (kleine letters, accenten/leestekens/spaties weg),
zodat "O'Brien", "obrien" en "Obrien" samenvallen.

Het `signaal`-veld benoemt waaróm iets een kandidaat is ("Zelfde naam en geboortedatum",
"Zelfde geboortenaam", "Zelfde naam") — transparantie voor de gebruiker.

## Beschikbare signalen (voor toekomstige scoring)

Al aanwezig op `persons` / de graaf en bruikbaar voor een confidence-score:

- genormaliseerde voor- + achternaam, `birth_name`;
- `born_on` (geboortedatum);
- ouders, kinderen, partner (uit `relationships`) → gedeelde-verwanten-signaal;
- locatie (`city`, `country`);
- uitnodigingscontext (wie nodigde wie uit, gedeeld netwerk);
- reeds bevestigde bruggen in de buurt van het paar.

## Later — confidence / probabilistisch (ontworpen, nog niet gebouwd)

Wanneer volume dat vraagt, zonder de UX te compliceren:

1. **Blocking keys** voor schaal: kandidaten eerst groeperen op goedkope sleutels
   (bv. `naam_norm(achternaam)` + geboortejaar) i.p.v. alle-tegen-alle vergelijken.
2. **Fuzzy matching**: `pg_trgm` (trigram-similarity) of Levenshtein op naam/birth_name
   voor spelvarianten, met een drempel.
3. **Confidence-score** (0–100) uit gewogen signalen: naam-similarity, geboortedatum-
   nabijheid, gedeelde ouders/kinderen/partner, locatie, uitnodigingscontext. Tonen bij de
   suggestie ("waarschijnlijk dezelfde persoon — 3 gedeelde signalen").
4. **Ranking** i.p.v. harde filter: hoogste confidence eerst; lage confidence verbergen.

Wat **niet** verandert: geen automatische merge; `person_links` ontstaat alleen na
menselijke bevestiging; afwijzingen blijven onthouden.

## Testdekking

`tests/discovery.test.mjs` (matching → koppeling → ontdekking → privacy),
`tests/rejection.test.mjs` (afwijzing persistent), `tests/authz.test.mjs`
(kandidaat-validatie + IDOR). Zie `TESTING_SETUP.md`.
