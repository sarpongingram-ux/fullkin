import { getStripe } from "./server"
import { createServiceClient } from "@/lib/supabase/service"
import type Stripe from "stripe"

// Handelt de terugkeer/webhook van een familie-abonnement af: maakt de nieuwe
// familie aan met de betaler als (tijdelijke) keeper. Idempotent via het
// Stripe-abonnement-id, zodat webhook én succes-redirect elkaar niet dubbelen.
export async function settleExtraFamilieFromSession(
  sessionId: string,
): Promise<string | null> {
  const stripe = getStripe()
  if (!stripe) return null

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })
  } catch {
    return null
  }

  if (session.mode !== "subscription" || session.status !== "complete") {
    return null
  }
  const m = session.metadata ?? {}
  if (m.soort !== "extra_familie" || !m.auth_uid) return null

  const sub = session.subscription as Stripe.Subscription | null
  if (!sub) return null
  const customer =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null

  const svc = createServiceClient()
  const { data, error } = await svc.rpc("stich_familie_als_lid", {
    p_auth: m.auth_uid,
    p_family_name: m.fam_name ?? "",
    p_country: m.fam_country ?? "",
    p_first: m.fam_first ?? "",
    p_last: m.fam_last ?? "",
    p_city: m.fam_city ?? "",
    p_sub_id: sub.id,
    p_customer: customer ?? "",
    p_amount: Number(m.fam_amount ?? 99),
  })
  if (error) return null
  return (data as string) ?? null
}

// Handelt de heractivering van een bevroren familie af: het abonnement wordt
// vernieuwd en de familie gaat weer 'actief'. Maakt GEEN nieuwe familie.
export async function settleHeractiveringFromSession(
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
  if (m.soort !== "heractiveer_familie" || !m.net || !m.person) return false

  const sub = session.subscription as Stripe.Subscription | null
  if (!sub) return false
  const customer =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null

  const svc = createServiceClient()
  const { error } = await svc.rpc("heractiveer_familie_abonnement", {
    p_net: m.net,
    p_person: m.person,
    p_sub_id: sub.id,
    p_customer: customer ?? "",
    p_amount: 99,
  })
  return !error
}
