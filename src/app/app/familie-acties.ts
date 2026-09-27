"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getStripe } from "@/lib/stripe/server"
import { flutterwaveTransfer } from "@/lib/payout/flutterwave"
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

export type UitbetaalResultaat =
  | { ok: true; bedrag: number }
  | { ok: false; fout: string }

// Betaalt het opgebouwde keeper-saldo (2%) uit naar de gekoppelde Stripe-rekening
// van de Family Keeper, via een Stripe Transfer. Beschikbaar = verdiend minus
// reeds uitbetaald; elke overboeking wordt vastgelegd (dubbel uitbetalen blokkeert
// de unieke transfer-id).
export async function betaalKeeperUit(
  networkId: string,
): Promise<UitbetaalResultaat> {
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

  const svc = createServiceClient()

  // Ben ik de actieve Family Keeper van deze familie?
  const { data: keeper } = await svc
    .from("keeper_upgrades")
    .select("person_id, status")
    .eq("network_id", networkId)
    .maybeSingle()
  if (!keeper || keeper.status !== "actief" || keeper.person_id !== mij.id) {
    return {
      ok: false,
      fout: "Alleen de Family Keeper van deze familie kan uitbetalen.",
    }
  }

  // Rekening gekoppeld en klaar? (Stripe voor EU/VK, Flutterwave voor o.a. Afrika/Suriname.)
  const { data: accs } = await svc
    .from("payout_accounts")
    .select("provider, external_id, status, currency")
    .eq("person_id", mij.id)
  const acc = (accs ?? []).find((a) => a.status === "ready")
  if (!acc || !acc.external_id) {
    return {
      ok: false,
      fout: "Koppel eerst je uitbetaalrekening bij Uitbetaling.",
    }
  }

  // Beschikbaar = verdiend (2%) minus reeds uitbetaald.
  const { data: splits } = await svc
    .from("transaction_splits")
    .select("co_founder_cents")
    .eq("network_id", networkId)
  const verdiend = (splits ?? []).reduce(
    (s, r) => s + (r.co_founder_cents ?? 0),
    0,
  )
  const { data: payouts } = await svc
    .from("keeper_payouts")
    .select("amount_cents")
    .eq("network_id", networkId)
  const uitbetaald = (payouts ?? []).reduce(
    (s, r) => s + (r.amount_cents ?? 0),
    0,
  )
  const beschikbaar = verdiend - uitbetaald
  if (beschikbaar < 100) {
    return {
      ok: false,
      fout: "Je hebt minimaal €1 nodig om te kunnen uitbetalen.",
    }
  }

  let transferId: string
  if (acc.provider === "stripe") {
    const stripe = getStripe()
    if (!stripe) return { ok: false, fout: "Stripe is niet geconfigureerd." }
    try {
      const transfer = await stripe.transfers.create({
        amount: beschikbaar,
        currency: "eur",
        destination: acc.external_id,
        metadata: {
          soort: "keeper_uitbetaling",
          network: networkId,
          person: mij.id,
        },
      })
      transferId = transfer.id
    } catch (e) {
      return {
        ok: false,
        fout:
          "Uitbetalen lukte niet: " +
          (e instanceof Error ? e.message : "onbekende fout"),
      }
    }
  } else {
    // Flutterwave — leest de gevoelige gegevens (eigenaar-only) via de service role en
    // maakt een transfer. Achter een key-check: zonder FLUTTERWAVE_SECRET_KEY beweegt
    // er niets en krijgt de keeper een duidelijke melding.
    const { data: det } = await svc
      .from("payout_details")
      .select("method, currency, bank_code, account_number, momo_network, phone")
      .eq("person_id", mij.id)
      .maybeSingle()
    if (!det) {
      return { ok: false, fout: "Je uitbetaalgegevens ontbreken. Koppel opnieuw bij Uitbetaling." }
    }
    const res = await flutterwaveTransfer({
      amountMajor: beschikbaar / 100,
      currency: det.currency ?? acc.currency ?? "USD",
      reference: `keeper-${mij.id}-${Date.now()}`,
      narration: "Fullkin keeper-uitbetaling",
      method: det.method as "bank" | "mobile_money",
      bankCode: det.bank_code,
      accountNumber: det.account_number,
      momoNetwork: det.momo_network,
      phone: det.phone,
    })
    if (!res.ok) {
      return {
        ok: false,
        fout: res.notConfigured
          ? "Flutterwave-uitbetaling is nog niet actief. Neem contact op met Fullkin."
          : "Uitbetalen lukte niet: " + (res.fout ?? "onbekende fout"),
      }
    }
    transferId = res.id
  }

  await svc.from("keeper_payouts").insert({
    network_id: networkId,
    person_id: mij.id,
    amount_cents: beschikbaar,
    stripe_transfer_id: transferId,
  })

  revalidatePath("/app/dashboard")
  return { ok: true, bedrag: beschikbaar }
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
