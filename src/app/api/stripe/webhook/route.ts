import { getStripe } from "@/lib/stripe/server"
import { createServiceClient } from "@/lib/supabase/service"
import {
  settleExtraFamilieFromSession,
  settleHeractiveringFromSession,
} from "@/lib/stripe/extraFamilie"
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

    // Een lid sticht een nieuwe familie (€0,99/mnd): familie aanmaken.
    if (session.metadata?.soort === "extra_familie") {
      const net = await settleExtraFamilieFromSession(session.id)
      if (!net) return new Response("Familie aanmaken mislukt", { status: 500 })
      return new Response("ok")
    }

    // Een bevroren familie wordt opnieuw geactiveerd.
    if (session.metadata?.soort === "heractiveer_familie") {
      const ok = await settleHeractiveringFromSession(session.id)
      if (!ok) return new Response("Heractiveren mislukt", { status: 500 })
      return new Response("ok")
    }

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

  // Maandelijkse bijdrage: elke geslaagde abonnementsfactuur (ook de
  // vervolgmaanden) wordt in het grootboek geboekt. Idempotent via factuur-id.
  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice
    const subId = (invoice as unknown as { subscription: string | null }).subscription
    if (subId && invoice.id) {
      const svc = createServiceClient()
      const { data: sub } = await svc
        .from("pot_subscriptions")
        .select("network_id, person_id, amount_cents")
        .eq("stripe_subscription_id", subId)
        .maybeSingle()
      if (sub) {
        const bedrag =
          invoice.amount_paid > 0 ? invoice.amount_paid : sub.amount_cents
        const { error } = await svc.rpc("record_pot_maandbijdrage", {
          p_network: sub.network_id,
          p_person: sub.person_id,
          p_amount: bedrag,
          p_ref: invoice.id,
        })
        if (error) return new Response("Boeken mislukt", { status: 500 })
      }

      // Een familie-abonnement dat weer betaalt → familie weer 'actief'
      // (ontdooien na een eerder betaalprobleem).
      await svc
        .from("family_subscriptions")
        .update({ status: "actief", canceled_at: null })
        .eq("stripe_subscription_id", subId)
    }
  }

  // Abonnement definitief beëindigd → lid-gestichte familie op pauze.
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    const svc = createServiceClient()
    await svc
      .from("family_subscriptions")
      .update({
        status: "geannuleerd",
        canceled_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", sub.id)
  }

  return new Response("ok")
}
