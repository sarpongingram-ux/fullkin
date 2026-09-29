"use server"

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type Stripe from "stripe"

type Res = { ok: true } | { ok: false; fout: string }

async function ikEnNetwerk() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, meId: null, network_id: null }
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { supabase, meId: null, network_id: null }
  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()
  return { supabase, meId, network_id: mij?.network_id ?? null }
}

// 1. Business Droom instellen.
export async function startBusiness(
  _v: Res | null,
  formData: FormData,
): Promise<Res> {
  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const euro = Number(formData.get("target") ?? 0)
  const omzet = Number(formData.get("revenue") ?? 0)
  const give_back = String(formData.get("give_back") ?? "").trim() || null
  const pledgeEuro = Number(formData.get("give_back_pledge") ?? 0)

  if (!name || !description) return { ok: false, fout: "Vul naam en beschrijving in." }
  if (!euro || euro <= 0) return { ok: false, fout: "Vul een doelbedrag in." }

  const { supabase, meId, network_id } = await ikEnNetwerk()
  if (!meId || !network_id) return { ok: false, fout: "Je bent niet ingelogd." }

  const { error } = await supabase.from("business_dreams").insert({
    network_id,
    person_id: meId,
    name,
    description,
    target_cents: Math.round(euro * 100),
    expected_revenue_cents: omzet > 0 ? Math.round(omzet * 100) : null,
    give_back,
    give_back_pledge_cents: pledgeEuro > 0 ? Math.round(pledgeEuro * 100) : null,
  })
  if (error) return { ok: false, fout: "Kon de Business Droom niet opslaan." }

  revalidatePath("/app")
  return { ok: true }
}

export type TeruggaveResultaat =
  | { ok: true; devPending?: boolean }
  | { ok: false; fout: string }

// De ondernemer geeft ECHT geld terug aan de familie: een betaling die als 'teruggave'
// in de familiepot wordt geboekt (via de Stripe-webhook én de terugkeer-pagina, idempotent).
export async function geefTerugAanFamilie(
  businessId: string,
  formData: FormData,
): Promise<TeruggaveResultaat> {
  const euro = Number(formData.get("bedrag") ?? 0)
  if (!euro || euro <= 0) return { ok: false, fout: "Vul een bedrag in." }
  const cents = Math.round(euro * 100)

  const { supabase, meId, network_id } = await ikEnNetwerk()
  if (!meId || !network_id) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data: b } = await supabase
    .from("business_dreams")
    .select("person_id, name")
    .eq("id", businessId)
    .maybeSingle()
  if (!b) return { ok: false, fout: "Business Droom niet gevonden." }
  if (b.person_id !== meId) {
    return { ok: false, fout: "Alleen de ondernemer kan teruggeven aan de familie." }
  }

  const stripe = getStripe()
  if (!stripe) return { ok: true, devPending: true }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3210"
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: `Teruggave aan de familie — ${b.name}` },
          unit_amount: cents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      give_back_business: businessId,
      give_back_person: meId,
      give_back_amount: String(cents),
      give_back_network: network_id,
    },
    success_url: `${appUrl}/app/business/${businessId}?gb_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app/business/${businessId}?gb_geannuleerd=1`,
  }
  ;(params as Record<string, unknown>).managed_payments = { enabled: false }

  const session = await stripe.checkout.sessions.create(params)
  redirect(session.url!)
}

// 2. Een vraag stellen in de vragenronde.
export async function stelVraag(businessId: string, vraag: string): Promise<Res> {
  const tekst = vraag.trim()
  if (!tekst) return { ok: false, fout: "Schrijf een vraag." }
  const { supabase, meId } = await ikEnNetwerk()
  if (!meId) return { ok: false, fout: "Je bent niet ingelogd." }
  const { error } = await supabase.from("business_questions").insert({
    business_id: businessId,
    asker_id: meId,
    question: tekst,
  })
  if (error) return { ok: false, fout: "Kon de vraag niet plaatsen." }
  revalidatePath(`/app/business/${businessId}`)
  return { ok: true }
}

// De ondernemer beantwoordt een vraag.
export async function beantwoordVraag(
  questionId: string,
  businessId: string,
  antwoord: string,
): Promise<Res> {
  const tekst = antwoord.trim()
  if (!tekst) return { ok: false, fout: "Schrijf een antwoord." }
  const { supabase } = await ikEnNetwerk()
  const { error } = await supabase
    .from("business_questions")
    .update({ answer: tekst, answered_at: new Date().toISOString() })
    .eq("id", questionId)
  if (error) return { ok: false, fout: "Kon het antwoord niet opslaan." }
  revalidatePath(`/app/business/${businessId}`)
  return { ok: true }
}

// 3. Stemmen. Na de stem checkt approve_business of de 60%-drempel is gehaald.
export async function stem(businessId: string, akkoord: boolean): Promise<Res> {
  const { supabase, meId } = await ikEnNetwerk()
  if (!meId) return { ok: false, fout: "Je bent niet ingelogd." }

  // Upsert: één stem per persoon, wijzigbaar.
  const { error } = await supabase
    .from("business_votes")
    .upsert(
      { business_id: businessId, voter_id: meId, approve: akkoord },
      { onConflict: "business_id,voter_id" },
    )
  if (error) return { ok: false, fout: "Kon je stem niet opslaan." }

  // Drempel gehaald? Dan opent de business-collecte (idempotent, definer).
  await supabase.rpc("approve_business", { bid: businessId })

  revalidatePath(`/app/business/${businessId}`)
  return { ok: true }
}

// 5. Maandelijkse update: één foto (url), één getal.
export async function plaatsUpdate(
  businessId: string,
  formData: FormData,
): Promise<Res> {
  const metric = String(formData.get("metric") ?? "").trim() || null
  const note = String(formData.get("note") ?? "").trim() || null
  const photo_url = String(formData.get("photo_url") ?? "").trim() || null
  if (!metric && !note) return { ok: false, fout: "Geef minstens een getal of een notitie." }

  const { supabase } = await ikEnNetwerk()
  const { error } = await supabase.from("business_updates").insert({
    business_id: businessId,
    metric,
    note,
    photo_url,
  })
  if (error) return { ok: false, fout: "Kon de update niet plaatsen." }
  revalidatePath(`/app/business/${businessId}`)
  return { ok: true }
}
