"use server"

import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { revalidatePath } from "next/cache"
import type { Enums } from "@/lib/types/database"

export async function draaiHetRad(): Promise<
  { ok: true; drawId: string } | { ok: false; fout: string }
> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("draai_rad")
  if (error || !data) {
    return {
      ok: false,
      fout: error?.message ?? "Het Rad kon niet draaien.",
    }
  }
  revalidatePath("/app/rad")
  return { ok: true, drawId: data }
}

export async function beslisRad(
  drawId: string,
  choice: Enums<"rad_choice">,
  recipient: string | null,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()

  const { data: draw } = await supabase
    .from("rad_draws")
    .select("year, prize_cents, winner_person_id, status")
    .eq("id", drawId)
    .single()
  if (!draw) return { ok: false, fout: "Trekking niet gevonden." }
  if (draw.status === "besloten") return { ok: true }

  // Bij zelf houden of gunnen gaat er echt geld naar de ontvanger: een Stripe-
  // transfer van de platform-balans naar hun gekoppelde account. Eerst
  // controleren, dan overmaken, dan pas de beslissing vastleggen, zo blijven
  // grootboek en werkelijkheid consistent.
  let transferId: string | null = null
  if (choice === "zelf" || choice === "gunnen") {
    const ontvangerId = choice === "gunnen" ? recipient : draw.winner_person_id
    if (!ontvangerId) return { ok: false, fout: "Geen ontvanger gekozen." }

    const { data: pa } = await supabase
      .from("payout_accounts")
      .select("external_id")
      .eq("person_id", ontvangerId)
      .eq("provider", "stripe")
      .eq("status", "ready")
      .maybeSingle()
    if (!pa) {
      return {
        ok: false,
        fout:
          choice === "zelf"
            ? "Koppel eerst je uitbetaling (via Uitbetaling) om de prijs te kunnen ontvangen."
            : "Dit familielid heeft nog geen uitbetaling gekoppeld.",
      }
    }

    const stripe = getStripe()
    if (stripe && draw.prize_cents > 0) {
      try {
        const tr = await stripe.transfers.create({
          amount: draw.prize_cents,
          currency: "eur",
          destination: pa.external_id,
          description: `Rad ${draw.year}`,
        })
        transferId = tr.id
      } catch (e) {
        const msg = e instanceof Error ? e.message : "onbekende fout"
        return { ok: false, fout: "De uitbetaling kon niet worden verwerkt: " + msg }
      }
    }
  }

  const { error } = await supabase.rpc("beslis_rad", {
    p_draw: drawId,
    p_choice: choice,
    p_recipient: recipient as string,
    p_transfer: transferId as string,
  })
  if (error) return { ok: false, fout: error.message }

  revalidatePath("/app/rad")
  return { ok: true }
}
