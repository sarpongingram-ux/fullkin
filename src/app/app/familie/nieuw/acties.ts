"use server"

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { redirect } from "next/navigation"
import type Stripe from "stripe"

export type StartResultaat = { ok: false; fout: string }

// Prijs van een tijdelijke keeper: €0,99 per maand.
const MAAND_CENTS = 99

// Een bestaand lid sticht zijn/haar eigen vader- of moederskant. Loopt via een
// Stripe-abonnement; pas na betaling wordt de familie aangemaakt (webhook /
// succes-redirect roept stich_familie_als_lid aan).
export async function startExtraFamilie(
  _v: StartResultaat | null,
  formData: FormData,
): Promise<StartResultaat> {
  const soort = String(formData.get("soort") ?? "") // vaderskant | moederskant | anders
  const familienaam = String(formData.get("familienaam") ?? "").trim()
  const voornaam = String(formData.get("voornaam") ?? "").trim()
  const achternaam = String(formData.get("achternaam") ?? "").trim()
  const stad = String(formData.get("stad") ?? "").trim()
  const land = String(formData.get("land") ?? "").trim()

  if (!familienaam) return { ok: false, fout: "Vul de naam van de familie in." }
  if (!voornaam || !achternaam)
    return { ok: false, fout: "Vul je eigen voor- en achternaam in." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je account is nog niet gekoppeld." }

  const stripe = getStripe()
  if (!stripe) {
    return {
      ok: false,
      fout: "Betalen kan nu niet — Stripe is niet geconfigureerd.",
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3210"
  const meta = {
    soort: "extra_familie",
    zijde: soort,
    auth_uid: user.id,
    fam_name: familienaam,
    fam_country: land,
    fam_first: voornaam,
    fam_last: achternaam,
    fam_city: stad,
    fam_amount: String(MAAND_CENTS),
  }

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Fullkin — jouw familie ${familienaam} opbouwen`,
          },
          unit_amount: MAAND_CENTS,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    metadata: meta,
    subscription_data: { metadata: meta },
    success_url: `${appUrl}/app?nieuwe_familie={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app/familie/nieuw?geannuleerd=1`,
  }
  ;(params as Record<string, unknown>).managed_payments = { enabled: false }

  const session = await stripe.checkout.sessions.create(params)
  redirect(session.url!)
}
