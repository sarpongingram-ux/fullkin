# FULLKIN — Family Data Provenance (P1.13)

_Families kunnen het oneens zijn over relaties (biologisch vs. adoptie, samengestelde
gezinnen, ex-partners, gevoelige banden). Dit beschrijft welke herkomst Fullkin nú
vastlegt en een **minimaal** model voor betwisting — zonder de bestaande graaf te breken._

## Wat er nu al is (geïmplementeerd)

Herkomst is grotendeels al herleidbaar:

| Object | Herkomst-velden | Betekenis |
|---|---|---|
| `relationships` | `created_by` (auth-user), `created_at`, `origin` | Wie legde de relatie, wanneer, en van welke aard (`biological`, `adoptive`, `step`, `foster`, `donor`, `chosen`). |
| `persons` | `created_by`, `created_at`, `claimed_by`, `managed_by` | Wie voerde de persoon op; wie is het zelf (geclaimd); wie beheert een profiel zonder eigen account. |
| `person_links` (cross-family) | `confirmed_by`, `created_at` | Wie bevestigde dat twee nodes dezelfde persoon zijn. |
| `person_match_decisions` | `decided_by`, `decided_at`, `decision` | Wie besloot bevestigen/afwijzen van een cross-family match (P1.11). |

Dus **wie / wanneer / welke aard** is voor relaties al aanwezig. `origin` dekt expliciet
de gevoelige gevallen (adoptie, stief, donor, gekozen familie), zodat een relatie niet
ten onrechte als biologisch geldt.

## Minimaal betwistings-model (voorstel, nog niet gebouwd)

Vandaag is er geen "disputed"-status. Voorgesteld, additief en niet-brekend:

```sql
-- Voorstel (niet in deze sprint geïmplementeerd):
alter type ... ;  -- geen enum-wijziging nodig
create table relationship_provenance (
  relationship_id uuid primary key references relationships(id) on delete cascade,
  status text not null default 'accepted' check (status in ('accepted','disputed')),
  disputed_by uuid references persons(id),
  disputed_reason text,
  updated_at timestamptz not null default now()
);
-- + RPC's betwist_relatie(rel) / herstel_relatie(rel), en tonen in de UI als
--   "door een familielid betwist" i.p.v. hard verwijderen.
```

Ontwerpuitgangspunten:

- **Geen zware moderatie.** Een betwisting verbergt of verwijdert niets automatisch; ze
  markeert een relatie als omstreden zodat de familie het zelf oplost.
- **Additief.** Aparte tabel; de bestaande graaf en engine blijven ongewijzigd (een
  relatie zonder rij = impliciet `accepted`).
- **Belangrijk voor**: biologisch vs. adoptie/stief, samengestelde gezinnen, ex-partners
  (`former_partner` bestaat al), en gevoelige banden — precies waar families verschillen.
- **RLS**: alleen leden van het betrokken netwerk; tonen met wie/waarom voor transparantie.

## Aanbeveling

De huidige velden (`created_by`, `created_at`, `origin`, `confirmed_by`, `decided_by`)
dekken de kern-provenance al. Bouw het betwistings-model pas wanneer echte families er om
vragen; het bovenstaande houdt dat een kleine, veilige, additieve stap.
