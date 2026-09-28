import { getStripe } from "./server"
import { createServiceClient } from "@/lib/supabase/service"

// Boekt een business-teruggave na terugkeer van Stripe (of via de webhook). Verifieert dat
// de betaling écht 'paid' is en boekt dan via de service role: de teruggave + een credit op
// de familiepot. Idempotent via de payment intent (unieke stripe_ref).
export async function settleBusinessGiveBackFromSession(
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

  const business = session.metadata?.give_back_business
  const person = session.metadata?.give_back_person
  const amount = Number(session.metadata?.give_back_amount ?? 0)
  if (!business || !person || !amount) return false

  try {
    const svc = createServiceClient()
    const { error } = await svc.rpc("settle_business_give_back", {
      p_business: business,
      p_person: person,
      p_amount: amount,
      p_ref: (session.payment_intent as string) ?? sessionId,
    })
    return !error
  } catch {
    return false
  }
}
