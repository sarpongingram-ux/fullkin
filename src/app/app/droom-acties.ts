"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type DroomResultaat =
  | { ok: true }
  | { ok: false; fout: string }

// Stelt je droom in (of werkt hem bij). Onder water krijgt de droom een
// doorlopende collecte als motor, zodat bijdragen dezelfde machinerie
// hergebruiken als life-event-collectes.
export async function stelDroomIn(
  _vorige: DroomResultaat | null,
  formData: FormData,
): Promise<DroomResultaat> {
  const titel = String(formData.get("titel") ?? "").trim()
  const euro = Number(formData.get("bedrag") ?? 0)

  if (!titel) return { ok: false, fout: "Beschrijf je droom in één zin." }
  if (!euro || euro <= 0) return { ok: false, fout: "Vul een streefbedrag in." }
  const target = Math.round(euro * 100)

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

  // Bestaat er al een actieve droom? Dan bijwerken.
  const { data: bestaand } = await supabase
    .from("dreams")
    .select("id, collection_id")
    .eq("person_id", meId)
    .eq("status", "actief")
    .maybeSingle()

  const suggestie = Math.max(100, Math.round(target / 20))

  if (bestaand) {
    await supabase
      .from("dreams")
      .update({ title: titel, target_cents: target })
      .eq("id", bestaand.id)
    if (bestaand.collection_id) {
      await supabase
        .from("collections")
        .update({ title: titel, suggested_cents: suggestie })
        .eq("id", bestaand.collection_id)
    }
    revalidatePath("/app")
    return { ok: true }
  }

  // Nieuwe droom: eerst de doorlopende collecte, dan de droom eraan koppelen.
  const ver = new Date()
  ver.setFullYear(ver.getFullYear() + 5)

  const { data: collectie, error: colFout } = await supabase
    .from("collections")
    .insert({
      network_id: mij.network_id,
      beneficiary_id: meId,
      title: titel,
      message: "Droom",
      suggested_cents: suggestie,
      status: "open",
      closes_at: ver.toISOString(),
      started_by: meId,
    })
    .select("id")
    .single()
  if (colFout || !collectie) {
    return { ok: false, fout: "Kon de droom-collecte niet aanmaken." }
  }

  const { error: droomFout } = await supabase.from("dreams").insert({
    network_id: mij.network_id,
    person_id: meId,
    title: titel,
    target_cents: target,
    collection_id: collectie.id,
  })
  if (droomFout) {
    return { ok: false, fout: "Kon de droom niet opslaan." }
  }

  revalidatePath("/app")
  return { ok: true }
}
