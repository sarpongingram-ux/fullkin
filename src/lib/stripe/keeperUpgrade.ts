import { getStripe } from "./server"
import { createServiceClient } from "@/lib/supabase/service"
import type Stripe from "stripe"

// Handelt de Family Keeper-upgrade (€4,99/mnd) af: legt vast dat deze familie een
// betaalde keeper heeft, die vanaf nu 2% van elke geldstroom verdient.
export async function settleKeeperUpgradeFromSession(
  sessionId: string,
): Promise<boolean> {
  const stripe = getStripe()
  if (!stripe) return false

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })
  } catch {
    return false
  }
  if (session.mode !== "subscription" || session.status !== "complete") {
    return false
  }
  const m = session.metadata ?? {}
  if (m.soort !== "keeper_upgrade" || !m.net || !m.person) return false

  const sub = session.subscription as Stripe.Subscription | null
  if (!sub) return false
  const customer =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null

  const svc = createServiceClient()
  const { error } = await svc.rpc("activeer_keeper_upgrade", {
    p_net: m.net,
    p_person: m.person,
    p_sub_id: sub.id,
    p_customer: customer ?? "",
    p_amount: 499,
  })
  return !error
}
