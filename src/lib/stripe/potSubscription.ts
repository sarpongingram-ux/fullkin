import { getStripe } from "./server"
import { createServiceClient } from "@/lib/supabase/service"
import type Stripe from "stripe"

// Handelt de terugkeer van een abonnements-checkout af: legt het abonnement vast
// en boekt de eerste maandbetaling in het grootboek. Idempotent, het abonnement
// via zijn Stripe-id, de boeking via de factuur-id (dezelfde ref als de webhook).
export async function settlePotSubscriptionFromSession(
  sessionId: string,
): Promise<boolean> {
  const stripe = getStripe()
  if (!stripe) return false

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.latest_invoice"],
    })
  } catch {
    return false
  }

  if (session.mode !== "subscription" || session.status !== "complete") {
    return false
  }

  const network = session.metadata?.sub_network
  const person = session.metadata?.sub_person
  const amount = Number(session.metadata?.sub_amount ?? 0)
  if (!network || !person || !amount) return false

  const sub = session.subscription as Stripe.Subscription | null
  if (!sub) return false
  const customer =
    typeof session.customer === "string" ? session.customer : session.customer?.id

  const svc = createServiceClient()

  // Abonnement vastleggen (eenmalig per Stripe-abonnement).
  const { data: bestaand } = await svc
    .from("pot_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle()
  if (!bestaand) {
    await svc.from("pot_subscriptions").insert({
      network_id: network,
      person_id: person,
      amount_cents: amount,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customer ?? null,
      status: "actief",
    })
  }

  // Eerste maandbetaling boeken (idempotent via factuur-id).
  const invoice = sub.latest_invoice as Stripe.Invoice | null
  if (invoice?.id) {
    const bedrag = invoice.amount_paid > 0 ? invoice.amount_paid : amount
    await svc.rpc("record_pot_maandbijdrage", {
      p_network: network,
      p_person: person,
      p_amount: bedrag,
      p_ref: invoice.id,
    })
  }

  return true
}
