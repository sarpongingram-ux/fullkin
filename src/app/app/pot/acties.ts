"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getStripe } from "@/lib/stripe/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type Stripe from "stripe"

export type DonatieResultaat =
  | { ok: true; devPending?: boolean }
  | { ok: false; fout: string }

// Vrije, anonieme donatie aan de Familie Pot. Een donatie heeft geen enkele
// ontvanger — het gaat naar de collectieve pot — dus dit is een gewone betaling
// naar het platform, die op de Pot-ledger als 'donatie' wordt geboekt.
export async function doneerAanPot(
  _v: DonatieResultaat | null,
  formData: FormData,
): Promise<DonatieResultaat> {
  const euro = Number(formData.get("bedrag") ?? 0)
  if (!euro || euro <= 0) return { ok: false, fout: "Vul een bedrag in." }
  const cents = Math.round(euro * 100)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je account is nog niet gekoppeld." }

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()
  if (!mij) return { ok: false, fout: "Je profiel is niet gevonden." }

  const stripe = getStripe()
  if (!stripe) {
    return { ok: true, devPending: true }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3210"
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Donatie aan de Familie Pot" },
          unit_amount: cents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      pot_network: mij.network_id,
      pot_person: meId,
      pot_amount: String(cents),
    },
    success_url: `${appUrl}/app/pot?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app/pot?geannuleerd=1`,
  }
  // Managed Payments staat standaard aan op nieuwe accounts en eist een
  // tax-code per line item; voor een familiebijdrage willen we dat niet.
  ;(params as Record<string, unknown>).managed_payments = { enabled: false }

  const session = await stripe.checkout.sessions.create(params)

  redirect(session.url!)
}

export type MaandResultaat =
  | { ok: true; devPending?: boolean }
  | { ok: false; fout: string }

// Stelt een maandelijkse bijdrage aan de Familie Pot in. €3 is de suggestie,
// maar het lid bepaalt zelf het bedrag. Loopt via een Stripe-abonnement.
export async function startMaandbijdrage(
  _v: MaandResultaat | null,
  formData: FormData,
): Promise<MaandResultaat> {
  const euro = Number(formData.get("bedrag") ?? 0)
  if (!euro || euro <= 0) return { ok: false, fout: "Vul een bedrag in." }
  const cents = Math.round(euro * 100)
  if (cents < 100) return { ok: false, fout: "Minimaal €1 per maand." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je account is nog niet gekoppeld." }

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()
  if (!mij) return { ok: false, fout: "Je profiel is niet gevonden." }

  const stripe = getStripe()
  if (!stripe) {
    return { ok: true, devPending: true }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3210"
  const meta = {
    sub_network: mij.network_id,
    sub_person: meId,
    sub_amount: String(cents),
  }
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Maandelijkse bijdrage aan de Familie Pot" },
          unit_amount: cents,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    metadata: meta,
    subscription_data: { metadata: meta },
    success_url: `${appUrl}/app/pot?sub_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app/pot?geannuleerd=1`,
  }
  ;(params as Record<string, unknown>).managed_payments = { enabled: false }

  const session = await stripe.checkout.sessions.create(params)

  redirect(session.url!)
}

// Stopt je maandelijkse bijdrage: het Stripe-abonnement wordt opgezegd en de
// boeking op 'geannuleerd' gezet. Reeds geboekte maanden blijven in de pot.
export async function stopMaandbijdrage(): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Niet ingelogd." }

  const { data: sub } = await supabase
    .from("pot_subscriptions")
    .select("id, stripe_subscription_id")
    .eq("person_id", meId)
    .eq("status", "actief")
    .maybeSingle()
  if (!sub) return { ok: true }

  const stripe = getStripe()
  if (stripe && sub.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id)
    } catch {
      // Al opgezegd bij Stripe? Dan alsnog lokaal afronden.
    }
  }

  // Status bijwerken via de service role (geen client-update op deze tabel).
  const svc = createServiceClient()
  await svc
    .from("pot_subscriptions")
    .update({ status: "geannuleerd", canceled_at: new Date().toISOString() })
    .eq("id", sub.id)

  revalidatePath("/app/pot")
  return { ok: true }
}
