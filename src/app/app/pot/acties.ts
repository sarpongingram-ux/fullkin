"use server"

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { redirect } from "next/navigation"
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
