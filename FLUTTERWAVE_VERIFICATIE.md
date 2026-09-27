# Flutterwave-uitbetaling — verificatieprocedure (testmode)

_De code staat klaar (economie 3/3); de echte geldbeweging zit achter een key-check. Dit
document beschrijft hoe we end-to-end verifiëren zodra de Flutterwave TEST-key er is, en
houdt de uitkomsten bij._

## 1. Key aanleveren (eigenaar)

Zet de **TEST**-secret-key in `~/Desktop/fullkin/.env.local` (staat in `.gitignore`,
nooit committen, niet in de chat plakken):

```
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxx
```

Te vinden in het Flutterwave-dashboard → Settings → API Keys (testmode aan). Gebruik
uitsluitend de `FLWSECK_TEST-…`-key, nooit de live-key.

## 2. Directe transfer-verificatie

```bash
node --env-file=.env.local scripts/verifieer-flutterwave.mjs
```

Doet een echte testmode-transfer via de productiemodule (`flutterwaveTransfer`) en print de
volledige API-respons. Standaard: NGN-bankoverschrijving naar Flutterwave's testrekening
(`044` / `0690000031`). Overschrijfbaar via env-vars (zie de kop van het script) voor
mobile money (bv. Ghana MTN) of andere valuta.

Zonder key slaat het script netjes over (exit 0).

## 3. Wat er gecontroleerd/gefinaliseerd wordt

- [ ] `flutterwaveConfigured()` = true; transfer geeft een id + status (geen `notConfigured`).
- [ ] Correcte **payload**: bankcode/rekening (bank) of netwerk/telefoon (mobile money) —
      veldnamen (`account_bank`/`account_number`) matchen Flutterwave's testmode.
- [ ] **FX/amount-semantiek**: het keeper-saldo is in EUR; bevestig hoe Flutterwave
      `debit_currency` + `amount` + payout-`currency` verwacht (converteert het zelf, of
      moet het bedrag in de payout-valuta?). Zo nodig `src/lib/payout/flutterwave.ts` aanpassen.
- [ ] **Keeper-uitbetaalflow** (`betaalKeeperUit`) op een TEST-familie: saldo via
      `transaction_splits` → uitbetaling via Flutterwave-testmode → `keeper_payouts` vastgelegd
      met de transfer-id; tweede poging geblokkeerd (dubbel-uitbetaal-bescherming).
- [ ] Een geautomatiseerde testmode-test toevoegen (gated op de key, buiten de standaard
      CI-suite) zodat regressies zichtbaar blijven.

## 4. Uitkomsten

_(In te vullen tijdens de verificatie-run.)_

| Check | Resultaat | Notitie |
|---|---|---|
| Directe transfer (bank NGN) | — | — |
| Directe transfer (mobile money GHS) | — | — |
| FX/amount-semantiek | — | — |
| Keeper-uitbetaalflow end-to-end | — | — |

## 5. Naar live

Pas ná een geslaagde testmode-verificatie: live-key als env-var in de productieomgeving
(Vercel), en een kleine echte proefuitbetaling. Niet eerder.
