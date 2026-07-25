// Kiest de uitbetaalprovider op basis van het land van de ontvanger.
//
// Stripe Connect dekt EU/VK. Voor Afrika (en andere landen die Stripe niet
// uitbetaalt) is Flutterwave nodig — die laag komt later, maar de keuze zit
// hier al zodat de rest van de app provider-onafhankelijk is.

export type PayoutProvider = "stripe" | "flutterwave"

// Landen waar Stripe Connect Express uitbetaling ondersteunt (kernset).
const STRIPE_LANDEN = new Set([
  "NL", "BE", "DE", "FR", "GB", "ES", "IT", "IE", "PT", "AT", "LU",
  "FI", "SE", "DK", "NO", "PL", "CZ", "GR", "RO", "HU", "BG", "HR",
  "SK", "SI", "EE", "LV", "LT", "CY", "MT", "CH", "US", "CA", "AU",
])

// Landen waar we via Flutterwave uitbetalen (mobile money / lokale banken).
const FLUTTERWAVE_LANDEN = new Set([
  "GH", "NG", "KE", "UG", "TZ", "ZA", "RW", "ZM", "CI", "SN", "CM",
])

export function kiesProvider(country: string): PayoutProvider {
  const c = country.toUpperCase()
  if (STRIPE_LANDEN.has(c)) return "stripe"
  if (FLUTTERWAVE_LANDEN.has(c)) return "flutterwave"
  // Onbekend: probeer Stripe; die weigert het land desnoods zelf.
  return "stripe"
}

// Landen die de gebruiker in de UI kan kiezen bij het instellen van uitbetaling.
export const UITBETAAL_LANDEN: { code: string; naam: string; provider: PayoutProvider }[] = [
  { code: "NL", naam: "Nederland", provider: "stripe" },
  { code: "BE", naam: "België", provider: "stripe" },
  { code: "DE", naam: "Duitsland", provider: "stripe" },
  { code: "GB", naam: "Verenigd Koninkrijk", provider: "stripe" },
  { code: "FR", naam: "Frankrijk", provider: "stripe" },
  { code: "GH", naam: "Ghana", provider: "flutterwave" },
  { code: "NG", naam: "Nigeria", provider: "flutterwave" },
  { code: "KE", naam: "Kenia", provider: "flutterwave" },
  { code: "SR", naam: "Suriname", provider: "flutterwave" },
]
