// Flutterwave-uitbetaling (transfers) voor ontvangers buiten de Stripe-landen.
//
// VEILIG: alle echte API-calls zitten achter een key-check. Zonder
// FLUTTERWAVE_SECRET_KEY doet dit niets (geen netwerk-call, geen geldbeweging) en geeft
// het { notConfigured: true } terug. Zet de test-secret-key als env-var om end-to-end te
// verifiëren in Flutterwave-testmode.

const FLW_BASE = "https://api.flutterwave.com/v3"

export function flutterwaveConfigured(): boolean {
  return !!process.env.FLUTTERWAVE_SECRET_KEY
}

// Standaard-valuta per land (Flutterwave-payout-valuta). Suriname heeft geen lokale
// Flutterwave-valuta → USD-bankoverschrijving.
const VALUTA: Record<string, string> = {
  GH: "GHS", NG: "NGN", KE: "KES", UG: "UGX", TZ: "TZS",
  ZA: "ZAR", RW: "RWF", ZM: "ZMW", CI: "XOF", SN: "XOF", CM: "XAF",
  SR: "USD",
}
export function valutaVoorLand(country: string): string {
  return VALUTA[country.toUpperCase()] ?? "USD"
}

export type FlutterwaveTransferInput = {
  amountMajor: number // bedrag in hele valuta-eenheden (bv. 12.50)
  currency: string // payout-valuta (bv. GHS)
  reference: string // unieke idempotentie-referentie
  narration: string
  method: "bank" | "mobile_money"
  bankCode?: string | null
  accountNumber?: string | null
  momoNetwork?: string | null
  phone?: string | null
}

export type FlutterwaveTransferResult =
  | { ok: true; id: string; status: string }
  | { ok: false; notConfigured?: true; fout?: string }

// Voert een Flutterwave-transfer uit. Bank: account_bank = bankcode. Mobile money:
// account_bank = de mobiele-geld-code (bv. MPS/MTN), account_number = telefoon.
export async function flutterwaveTransfer(
  input: FlutterwaveTransferInput,
): Promise<FlutterwaveTransferResult> {
  const key = process.env.FLUTTERWAVE_SECRET_KEY
  if (!key) return { ok: false, notConfigured: true }

  const body: Record<string, unknown> = {
    amount: input.amountMajor,
    currency: input.currency,
    narration: input.narration,
    reference: input.reference,
    // De keeper-saldi zijn in EUR; laat Flutterwave converteren naar de payout-valuta.
    // (De exacte FX-/amount-semantiek wordt bevestigd bij de test-key-verificatie.)
    debit_currency: "EUR",
  }
  if (input.method === "bank") {
    body.account_bank = input.bankCode
    body.account_number = input.accountNumber
  } else {
    body.account_bank = input.momoNetwork
    body.account_number = input.phone
  }

  try {
    const res = await fetch(`${FLW_BASE}/transfers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as {
      status?: string
      message?: string
      data?: { id?: number | string; status?: string }
    }
    if (json?.status === "success" && json?.data?.id != null) {
      return { ok: true, id: String(json.data.id), status: json.data.status ?? "NEW" }
    }
    return { ok: false, fout: json?.message ?? "Flutterwave-overboeking mislukt." }
  } catch (e) {
    return { ok: false, fout: e instanceof Error ? e.message : "Netwerkfout bij Flutterwave." }
  }
}
