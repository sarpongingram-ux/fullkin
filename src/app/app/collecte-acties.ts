"use server"

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { netwerkOpPauze, PAUZE_FOUT } from "@/lib/familie/status"
import type { Enums } from "@/lib/types/database"
import type Stripe from "stripe"

// ---------------------------------------------------------------------------
// Een collecte starten voor een familielid bij een life event.
// ---------------------------------------------------------------------------

export type StartResultaat =
  | { ok: true; collectieId: string }
  | { ok: false; fout: string }

export async function startCollecte(
  _vorige: StartResultaat | null,
  formData: FormData,
): Promise<StartResultaat> {
  const beneficiaryId = String(formData.get("beneficiary_id") ?? "")
  const kind = String(formData.get("kind") ?? "") as Enums<"life_event_kind">
  const titel = String(formData.get("titel") ?? "").trim()
  const datum = String(formData.get("occurs_on") ?? "")

  if (!beneficiaryId || !kind || !titel || !datum) {
    return { ok: false, fout: "Vul alle velden in." }
  }

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

  if (await netwerkOpPauze(supabase, mij.network_id)) {
    return { ok: false, fout: PAUZE_FOUT }
  }

  // Suggestiebedrag ophalen bij dit soort moment.
  const { data: sugg } = await supabase
    .from("event_suggestions")
    .select("suggested_cents")
    .eq("kind", kind)
    .single()
  const suggested = sugg?.suggested_cents ?? 200

  const { data: event, error: eventFout } = await supabase
    .from("life_events")
    .insert({
      network_id: mij.network_id,
      person_id: beneficiaryId,
      kind,
      title: titel,
      occurs_on: datum,
      created_by: meId,
    })
    .select("id")
    .single()
  if (eventFout || !event) {
    return { ok: false, fout: "Kon het moment niet opslaan." }
  }

  // Collecte staat 3 weken open.
  const sluit = new Date()
  sluit.setDate(sluit.getDate() + 21)

  const { data: collectie, error: colFout } = await supabase
    .from("collections")
    .insert({
      network_id: mij.network_id,
      life_event_id: event.id,
      beneficiary_id: beneficiaryId,
      title: titel,
      suggested_cents: suggested,
      status: "open",
      closes_at: sluit.toISOString(),
      started_by: meId,
    })
    .select("id")
    .single()
  if (colFout || !collectie) {
    return {
      ok: false,
      fout:
        "Kon de collecte niet starten. Mogelijk mag je voor dit familielid geen collecte openen.",
    }
  }

  revalidatePath("/app")
  return { ok: true, collectieId: collectie.id }
}

export type BeheerResultaat = { ok: true } | { ok: false; fout: string }

// Mag ik deze collecte beheren? De keeper, degene die 'm startte, of de
// begunstigde zelf. Geeft ook de collecte terug voor verdere checks.
async function magBeheren(
  supabase: Awaited<ReturnType<typeof createClient>>,
  collectionId: string,
) {
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { mag: false as const, meId: null, col: null }
  const { data: col } = await supabase
    .from("collections")
    .select("id, network_id, beneficiary_id, started_by, status")
    .eq("id", collectionId)
    .single()
  if (!col) return { mag: false as const, meId, col: null }
  const { data: isKeeper } = await supabase.rpc("has_role", {
    net: col.network_id,
    r: "co_founder",
  })
  const mag =
    !!isKeeper || col.started_by === meId || col.beneficiary_id === meId
  return { mag, meId, col }
}

// Stop een lopende collecte: 'gesloten'. Reeds gegeven bijdragen blijven staan;
// er kan niet meer bijgedragen worden en de auto-verjaardagpot maakt 'm niet
// opnieuw aan.
export async function stopCollecte(
  collectionId: string,
): Promise<BeheerResultaat> {
  const supabase = await createClient()
  const { mag, col } = await magBeheren(supabase, collectionId)
  if (!col) return { ok: false, fout: "Deze collecte bestaat niet." }
  if (!mag) {
    return {
      ok: false,
      fout: "Alleen de Family Keeper, de starter of de begunstigde kan dit.",
    }
  }
  const { error } = await supabase
    .from("collections")
    .update({ status: "gesloten" })
    .eq("id", collectionId)
  if (error) return { ok: false, fout: "Kon de collecte niet stoppen." }
  revalidatePath("/app")
  revalidatePath(`/app/collecte/${collectionId}`)
  return { ok: true }
}

// Verwijder een collecte (zacht: 'verwijderd', verborgen). Alleen als er nog geen
// bijdragen zijn — anders is stoppen de juiste keuze.
export async function verwijderCollecte(
  collectionId: string,
): Promise<BeheerResultaat> {
  const supabase = await createClient()
  const { mag, col } = await magBeheren(supabase, collectionId)
  if (!col) return { ok: false, fout: "Deze collecte bestaat niet." }
  if (!mag) {
    return {
      ok: false,
      fout: "Alleen de Family Keeper, de starter of de begunstigde kan dit.",
    }
  }
  const { count } = await supabase
    .from("contributions")
    .select("id", { count: "exact", head: true })
    .eq("collection_id", collectionId)
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      fout: "Er is al bijgedragen — stop de collecte in plaats van verwijderen.",
    }
  }
  const { error } = await supabase
    .from("collections")
    .update({ status: "verwijderd" })
    .eq("id", collectionId)
  if (error) return { ok: false, fout: "Kon de collecte niet verwijderen." }
  revalidatePath("/app")
  revalidatePath(`/app/collecte/${collectionId}`)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Bijdragen aan een collecte.
//
// Maakt een 'wachtend' bijdrage en stuurt de gever naar Stripe Checkout. Zonder
// Stripe-sleutels (dev-modus) blijft de bijdrage 'wachtend' staan en wordt ze
// in de test afgerekend via settle_contribution.
// ---------------------------------------------------------------------------

export type BijdrageResultaat =
  | { ok: true; devPending?: boolean }
  | { ok: false; fout: string }

export async function draagBij(
  _vorige: BijdrageResultaat | null,
  formData: FormData,
): Promise<BijdrageResultaat> {
  const collectieId = String(formData.get("collectie_id") ?? "")
  const euro = Number(formData.get("bedrag") ?? 0)
  const verbergNaam = formData.get("verberg_naam") === "on"
  const bericht = String(formData.get("bericht") ?? "").trim() || null

  if (!collectieId || !euro || euro <= 0) {
    return { ok: false, fout: "Vul een geldig bedrag in." }
  }
  const cents = Math.round(euro * 100)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je account is nog niet gekoppeld." }

  const { data: bijdrage, error } = await supabase
    .from("contributions")
    .insert({
      collection_id: collectieId,
      contributor_id: meId,
      amount_cents: cents,
      hide_name: verbergNaam,
      message: bericht,
      status: "wachtend",
    })
    .select("id")
    .single()
  if (error || !bijdrage) {
    // Meestal: al eerder bijgedragen (unieke sleutel collectie+gever).
    return {
      ok: false,
      fout: "Je hebt al bijgedragen aan deze collecte, of de collecte is gesloten.",
    }
  }

  const stripe = getStripe()
  if (!stripe) {
    // Dev-modus: geen betaling gekoppeld. De bijdrage staat 'wachtend'.
    return { ok: true, devPending: true }
  }

  // Heeft de begunstigde een gekoppeld uitbetaalaccount? Dan wordt dit een
  // destination charge: 95% gaat direct naar de ontvanger, 5% blijft als
  // application fee bij Fullkin. Zo niet, dan valt het terug op een gewone
  // betaling naar het platform (geld wacht tot de ontvanger koppelt).
  const { data: col } = await supabase
    .from("collections")
    .select("beneficiary_id")
    .eq("id", collectieId)
    .single()

  let destination: string | null = null
  if (col) {
    const { data: pa } = await supabase
      .from("payout_accounts")
      .select("external_id")
      .eq("person_id", col.beneficiary_id)
      .eq("provider", "stripe")
      .eq("status", "ready")
      .maybeSingle()
    destination = pa?.external_id ?? null
  }

  // Application fee = de 5% (Family Keeper + rollen + pot + platform), met dezelfde
  // afronding als compute_split: de restcent gaat naar de ontvanger.
  const cf = Math.floor((cents * 50) / 10000)
  const rh = Math.floor((cents * 50) / 10000)
  const fp = Math.floor((cents * 100) / 10000)
  const pf = Math.floor((cents * 300) / 10000)
  const applicationFee = cf + rh + fp + pf

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3210"
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: "Bijdrage aan familiecollecte" },
          unit_amount: cents,
        },
        quantity: 1,
      },
    ],
    metadata: { contribution_id: bijdrage.id },
    ...(destination
      ? {
          payment_intent_data: {
            application_fee_amount: applicationFee,
            transfer_data: { destination },
          },
        }
      : {}),
    success_url: `${appUrl}/app/collecte/${collectieId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app/collecte/${collectieId}?geannuleerd=1`,
  }
  // Managed Payments (standaard aan op nieuwe accounts) eist een tax-code per
  // line item; voor familiebijdragen zetten we het per betaling uit.
  ;(params as Record<string, unknown>).managed_payments = { enabled: false }

  const session = await stripe.checkout.sessions.create(params)

  redirect(session.url!)
}
