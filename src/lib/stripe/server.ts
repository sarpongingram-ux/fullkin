import Stripe from "stripe"

// Stripe-client. Geeft null terug zolang er geen sleutel is ingesteld, zodat de
// collecte in dev-modus kan draaien zonder Stripe-account.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}

export function stripeIngesteld(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}
