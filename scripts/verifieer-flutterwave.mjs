// Handmatige END-TO-END verificatie van Flutterwave-uitbetaling — TESTMODE.
//
// Draait alleen iets als FLUTTERWAVE_SECRET_KEY (een TEST-key: FLWSECK_TEST-…) gezet is;
// anders slaat het netjes over (exit 0). Gebruikt de ECHTE payout-module, zodat we de
// werkelijke API-respons zien en de payload/FX zo nodig kunnen bijstellen.
//
// Gebruik:
//   node --env-file=.env.local scripts/verifieer-flutterwave.mjs
//
// Optioneel overschrijven via env-vars (Flutterwave-testwaarden):
//   FLW_TEST_METHOD=bank|mobile_money
//   FLW_TEST_CURRENCY=NGN|GHS|...        FLW_TEST_AMOUNT=100
//   bank:         FLW_TEST_BANK_CODE=044 FLW_TEST_ACCOUNT=0690000031
//   mobile money: FLW_TEST_MOMO_NETWORK=MTN FLW_TEST_PHONE=0245000000
import {
  flutterwaveConfigured,
  flutterwaveTransfer,
  valutaVoorLand,
} from "../src/lib/payout/flutterwave.ts"

if (!flutterwaveConfigured()) {
  console.log(
    "⏭  FLUTTERWAVE_SECRET_KEY ontbreekt.\n" +
      "   Zet je TEST-key (FLWSECK_TEST-…) in .env.local en draai opnieuw:\n" +
      "     node --env-file=.env.local scripts/verifieer-flutterwave.mjs",
  )
  process.exit(0)
}

const key = process.env.FLUTTERWAVE_SECRET_KEY ?? ""
if (!/_TEST/i.test(key) && !/TEST-/i.test(key)) {
  console.error(
    "✋ Dit lijkt GEEN test-key. Gebruik uitsluitend de FLWSECK_TEST-…-key voor verificatie — nooit de live-key.",
  )
  process.exit(1)
}

console.log("valuta-check: GH →", valutaVoorLand("GH"), "| NG →", valutaVoorLand("NG"), "| SR →", valutaVoorLand("SR"))

const method = process.env.FLW_TEST_METHOD ?? "bank"
const gemeenschappelijk = {
  amountMajor: Number(process.env.FLW_TEST_AMOUNT ?? (method === "bank" ? 100 : 5)),
  reference: `fullkin-verify-${Date.now()}`,
  narration: "Fullkin testverificatie",
}
const input =
  method === "mobile_money"
    ? {
        ...gemeenschappelijk,
        method: "mobile_money",
        currency: process.env.FLW_TEST_CURRENCY ?? "GHS",
        momoNetwork: process.env.FLW_TEST_MOMO_NETWORK ?? "MTN",
        phone: process.env.FLW_TEST_PHONE ?? "0245000000",
      }
    : {
        ...gemeenschappelijk,
        method: "bank",
        currency: process.env.FLW_TEST_CURRENCY ?? "NGN",
        // Flutterwave's klassieke testrekening (Access Bank NGN).
        bankCode: process.env.FLW_TEST_BANK_CODE ?? "044",
        accountNumber: process.env.FLW_TEST_ACCOUNT ?? "0690000031",
      }

console.log("\n→ Flutterwave testmode transfer:", JSON.stringify(input, null, 2))
const res = await flutterwaveTransfer(input)
console.log("\n← Resultaat:", JSON.stringify(res, null, 2))

if (res.ok) {
  console.log(`\n✅ Transfer aangemaakt bij Flutterwave (id ${res.id}, status ${res.status}).`)
  console.log(
    "   Controleer de payout-valuta/FX: het keeper-saldo is in EUR. Klopt debit_currency/amount\n" +
      "   in src/lib/payout/flutterwave.ts met wat Flutterwave verwacht? Pas zo nodig aan en herhaal.",
  )
} else {
  console.log(
    "\n❌ Transfer niet aangemaakt. Gebruik de foutboodschap hierboven om de payload te fixen\n" +
      "   (bankcode / mobiele-geld-code / valuta / veldnamen) in src/lib/payout/flutterwave.ts.",
  )
}
process.exit(res.ok ? 0 : 1)
