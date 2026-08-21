// Privacyregel voor opgehaalde bedragen (collectes én dromen).
//
// Een opgehaald totaal mag pas zichtbaar zijn zodra er genoeg gevers zijn:
// - bij 1 gever is het totaal zijn eigen bedrag;
// - bij 2 kan de één de ander uitrekenen (totaal − eigen bijdrage);
// - vanaf 3 kan niemand (ook een mede-gever niet) nog een individueel bedrag
//   terugrekenen.
//
// Dit is dezelfde wet als "namen zichtbaar, bedragen nooit" — overal gelijk.
export const TOTAAL_DREMPEL = 3

export function totaalZichtbaar(aantalGevers: number): boolean {
  return aantalGevers >= TOTAAL_DREMPEL
}
