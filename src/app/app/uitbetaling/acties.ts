"use server"

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { kiesProvider } from "@/lib/payout/provider"
import { redirect } from "next/navigation"

export type StartResultaat = { ok: false; fout: string }
// (Bij succes eindigt de functie in een redirect naar Stripe.)

// Start of hervat de Stripe Express-onboarding voor de ingelogde ontvanger.
export async function startUitbetaling(
  _v: StartResultaat | null,
  formData: FormData,
): Promise<StartResultaat> {
  const land = String(formData.get("land") ?? "NL").toUpperCase()
  const provider = kiesProvider(land)

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

  if (provider === "flutterwave") {
    return {
      ok: false,
      fout:
        "Uitbetaling naar dit land loopt via Flutterwave (mobile money). Die koppeling komt binnenkort — ontvangers in Stripe-landen (NL, EU, VK) kunnen nu al.",
    }
  }

  const stripe = getStripe()
  if (!stripe) return { ok: false, fout: "Stripe is niet geconfigureerd." }

  // Bestaat er al een Stripe-uitbetaalaccount?
  const { data: bestaand } = await supabase
    .from("payout_accounts")
    .select("external_id")
    .eq("person_id", meId)
    .eq("provider", "stripe")
    .maybeSingle()

  let accountId = bestaand?.external_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: land,
      email: user.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
    })
    accountId = account.id
    const { error } = await supabase.from("payout_accounts").insert({
      person_id: meId,
      network_id: mij.network_id,
      provider: "stripe",
      external_id: accountId,
      country: land,
      status: "onboarding",
    })
    if (error) return { ok: false, fout: "Kon het uitbetaalaccount niet opslaan." }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3210"
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/app/uitbetaling?herstart=1`,
    return_url: `${appUrl}/app/uitbetaling?klaar=1`,
    type: "account_onboarding",
  })

  redirect(link.url)
}

// Ververst de status van het Stripe-account (payouts_enabled → 'ready').
// Wordt aangeroepen als de ontvanger terugkeert van Stripe (?klaar=1).
export async function ververUitbetaalStatus(): Promise<void> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return

  const { data: acc } = await supabase
    .from("payout_accounts")
    .select("external_id, status")
    .eq("person_id", meId)
    .eq("provider", "stripe")
    .maybeSingle()
  if (!acc) return

  const stripe = getStripe()
  if (!stripe) return

  try {
    const account = await stripe.accounts.retrieve(acc.external_id)
    const klaar = account.payouts_enabled === true
    const nieuweStatus = klaar ? "ready" : "onboarding"
    if (nieuweStatus !== acc.status) {
      await supabase
        .from("payout_accounts")
        .update({ status: nieuweStatus, updated_at: new Date().toISOString() })
        .eq("person_id", meId)
        .eq("provider", "stripe")
    }
  } catch {
    // Stripe onbereikbaar of account verwijderd — status ongewijzigd laten.
  }
  // Let op: geen revalidatePath hier — deze functie draait tijdens het renderen
  // van de pagina (vanuit de server component), en dan is revalidatePath niet
  // toegestaan. De pagina leest de status direct hierna zelf vers in.
}
