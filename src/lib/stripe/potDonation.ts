import { getStripe } from "./server"
import { createServiceClient } from "@/lib/supabase/service"

// Boekt een pot-donatie na terugkeer van Stripe. Verifieert dat de betaling
// écht 'paid' is en boekt dan via de service role in het grootboek. Idempotent
// via de payment intent (unieke stripe_ref in pot_ledger).
export async function settlePotDonationFromSession(
  sessionId: string,
): Promise<boolean> {
  const stripe = getStripe()
  if (!stripe) return false

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    return false
  }
  if (session.payment_status !== "paid") return false

  const network = session.metadata?.pot_network
  const person = session.metadata?.pot_person
  const amount = Number(session.metadata?.pot_amount ?? 0)
  if (!network || !person || !amount) return false

  try {
    const svc = createServiceClient()
    const { error } = await svc.rpc("record_pot_donation", {
      p_network: network,
      p_person: person,
      p_amount: amount,
      p_ref: (session.payment_intent as string) ?? sessionId,
    })
    return !error
  } catch {
    return false
  }
}
