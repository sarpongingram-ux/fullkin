import { getStripe } from "@/lib/stripe/server"
import { createServiceClient } from "@/lib/supabase/service"
import type Stripe from "stripe"

// Stripe-webhook. Bij een geslaagde betaling wordt de bijdrage afgerekend:
// status op 'betaald' en de 5%-verdeling vastgelegd (settle_contribution).
export async function POST(req: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return new Response("Stripe niet geconfigureerd", { status: 503 })
  }

  const sig = req.headers.get("stripe-signature")
  if (!sig) return new Response("Geen signature", { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return new Response("Ongeldige signature", { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const contributionId = session.metadata?.contribution_id
    if (contributionId) {
      const supabase = createServiceClient()
      const { error } = await supabase.rpc("settle_contribution", {
        p_contribution: contributionId,
        p_intent: (session.payment_intent as string) ?? null,
      })
      if (error) {
        return new Response("Afrekenen mislukt", { status: 500 })
      }
    }
  }

  return new Response("ok")
}
