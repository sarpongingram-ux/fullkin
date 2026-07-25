import { getStripe } from "./server"
import { createServiceClient } from "@/lib/supabase/service"

// Rekent een bijdrage af op basis van een Stripe Checkout-sessie.
//
// Wordt aangeroepen wanneer de betaler terugkeert van Stripe (success_url).
// We vragen de sessie op bij Stripe (met de secret key) en rekenen alleen af
// als de betaling écht 'paid' is — de gebruiker kan dit niet vervalsen.
// Idempotent: settle_contribution doet niets bij een al afgerekende bijdrage.
//
// Draait naast de webhook: dit is de directe route (meteen na betalen), de
// webhook is de vangnet-route (als de betaler de tab sluit vóór de redirect).
export async function settleFromSession(sessionId: string): Promise<boolean> {
  const stripe = getStripe()
  if (!stripe) return false

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    return false
  }
  if (session.payment_status !== "paid") return false

  const contributionId = session.metadata?.contribution_id
  if (!contributionId) return false

  try {
    const svc = createServiceClient()
    const { error } = await svc.rpc("settle_contribution", {
      p_contribution: contributionId,
      p_intent: (session.payment_intent as string) ?? null,
    })
    return !error
  } catch {
    // service_role-sleutel ontbreekt nog, of settle faalde. Stil: de bijdrage
    // blijft 'wachtend', net als in dev-modus.
    return false
  }
}
