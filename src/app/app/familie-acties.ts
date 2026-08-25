"use server"

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type Stripe from "stripe"

// Wissel van actieve familie. me() en alle schermen volgen daarna dit netwerk.
export async function wisselFamilie(
  networkId: string,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("zet_actieve_familie", {
    p_net: networkId,
  })
  if (error) return { ok: false, fout: "Wisselen lukte niet." }
  revalidatePath("/app", "layout")
  return { ok: true }
}

// Heractiveer een bevroren familie: start het €0,99/mnd-abonnement opnieuw. Na
// betaling gaat de familie weer 'actief' (geen nieuwe familie).
export async function heractiveerFamilie(
  networkId: string,
): Promise<{ ok: false; fout: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  // Mijn persoon in díe familie (niet per se de actieve familie).
  const { data: mij } = await supabase
    .from("persons")
    .select("id")
    .eq("claimed_by", user.id)
    .eq("network_id", networkId)
    .maybeSingle()
  if (!mij) return { ok: false, fout: "Je hoort niet bij deze familie." }

  const stripe = getStripe()
  if (!stripe) {
    return { ok: false, fout: "Betalen kan nu niet — Stripe ontbreekt." }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3210"
  const meta = {
    soort: "heractiveer_familie",
    net: networkId,
    person: mij.id,
    auth_uid: user.id,
  }
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Fullkin — je familie heractiveren" },
          unit_amount: 99,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    metadata: meta,
    subscription_data: { metadata: meta },
    success_url: `${appUrl}/app?familie_heractiveerd={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app?geannuleerd=1`,
  }
  ;(params as Record<string, unknown>).managed_payments = { enabled: false }

  const session = await stripe.checkout.sessions.create(params)
  redirect(session.url!)
}

// Neem de Family Keeper-upgrade (€4,99/mnd): je wordt de betaalde keeper van deze
// familie en verdient vanaf nu 2% van elke geldstroom (loopt op als saldo).
export async function neemKeeperUpgrade(
  networkId: string,
): Promise<{ ok: false; fout: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data: mij } = await supabase
    .from("persons")
    .select("id")
    .eq("claimed_by", user.id)
    .eq("network_id", networkId)
    .maybeSingle()
  if (!mij) return { ok: false, fout: "Je hoort niet bij deze familie." }

  const stripe = getStripe()
  if (!stripe) return { ok: false, fout: "Betalen kan nu niet — Stripe ontbreekt." }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3210"
  const meta = {
    soort: "keeper_upgrade",
    net: networkId,
    person: mij.id,
    auth_uid: user.id,
  }
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Fullkin — Family Keeper worden" },
          unit_amount: 499,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    metadata: meta,
    subscription_data: { metadata: meta },
    success_url: `${appUrl}/app/dashboard?keeper_upgrade={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app/dashboard?geannuleerd=1`,
  }
  ;(params as Record<string, unknown>).managed_payments = { enabled: false }

  const session = await stripe.checkout.sessions.create(params)
  redirect(session.url!)
}
