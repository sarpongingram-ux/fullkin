// FULLKIN — payout-routing + Flutterwave-key-check (pure logica, geen DB/netwerk).
// Draait op Node 24 (type-stripping van de .ts-modules).
//
// Gebruik:  node tests/payout-routing.test.mjs
import { kiesProvider } from "../src/lib/payout/provider.ts"
import { valutaVoorLand, flutterwaveConfigured, flutterwaveTransfer } from "../src/lib/payout/flutterwave.ts"

let pass = 0, fail = 0
const check = (n, c) => { if (c) { pass++; console.log(`  ✓ ${n}`) } else { fail++; console.log(`  ✗ ${n}`) } }

async function main() {
  // Routing
  check("GH → flutterwave", kiesProvider("GH") === "flutterwave")
  check("NG → flutterwave", kiesProvider("NG") === "flutterwave")
  check("SR (Suriname) → flutterwave", kiesProvider("SR") === "flutterwave")
  check("NL → stripe", kiesProvider("NL") === "stripe")
  check("US → stripe", kiesProvider("US") === "stripe")
  check("onbekend land → stripe (fallback)", kiesProvider("ZZ") === "stripe")

  // Valuta
  check("valuta GH = GHS", valutaVoorLand("GH") === "GHS")
  check("valuta NG = NGN", valutaVoorLand("NG") === "NGN")
  check("valuta SR = USD", valutaVoorLand("SR") === "USD")
  check("valuta onbekend = USD", valutaVoorLand("ZZ") === "USD")

  // Key-check: zonder FLUTTERWAVE_SECRET_KEY geen configuratie en geen geldbeweging.
  const heeftKey = !!process.env.FLUTTERWAVE_SECRET_KEY
  check("flutterwaveConfigured() = false zonder key", heeftKey || flutterwaveConfigured() === false)
  const res = await flutterwaveTransfer({
    amountMajor: 10, currency: "GHS", reference: "test-ref", narration: "test",
    method: "mobile_money", momoNetwork: "MTN", phone: "0240000000",
  })
  check("transfer zonder key = notConfigured (geen netwerk-call)", heeftKey || (res.ok === false && res.notConfigured === true))

  console.log(`\nResultaat payout-routing: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch((e) => { console.error("Testfout:", e.message); process.exit(2) })
