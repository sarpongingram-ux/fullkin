"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { Enums } from "@/lib/types/database"

export type MijlpaalResultaat =
  | { ok: true }
  | { ok: false; fout: string }

// Registreert een mijlpaal voor een familielid, zonder dat er meteen een
// collecte aan vast hoeft te zitten. De persoon zelf krijgt een warme melding.
export async function voegMijlpaalToe(
  _v: MijlpaalResultaat | null,
  formData: FormData,
): Promise<MijlpaalResultaat> {
  const persoon = String(formData.get("person_id") ?? "")
  const kind = String(formData.get("kind") ?? "") as Enums<"life_event_kind">
  const titel = String(formData.get("titel") ?? "").trim()
  const datum = String(formData.get("occurs_on") ?? "")

  if (!persoon || !kind || !titel || !datum) {
    return { ok: false, fout: "Vul alle velden in." }
  }

  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()
  if (!mij) return { ok: false, fout: "Je profiel is niet gevonden." }

  const { data: event, error } = await supabase
    .from("life_events")
    .insert({
      network_id: mij.network_id,
      person_id: persoon,
      kind,
      title: titel,
      occurs_on: datum,
      created_by: meId,
    })
    .select("id")
    .single()
  if (error || !event) return { ok: false, fout: "Kon de mijlpaal niet opslaan." }

  // De persoon om wie het gaat een melding sturen (meld() slaat jezelf over).
  await supabase.rpc("meld", {
    p_recipient: persoon,
    p_kind: "mijlpaal",
    p_subject_type: "mijlpaal",
    p_subject_id: event.id,
  })

  revalidatePath("/app/mijlpalen")
  revalidatePath("/app")
  return { ok: true }
}

// Start met één klik een collecte bij een bestaande mijlpaal. Hergebruikt de
// collecte-machinerie en koppelt aan het bestaande life_event (geen dubbele).
export async function startCollecteVoorMijlpaal(eventId: string): Promise<void> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return

  const { data: event } = await supabase
    .from("life_events")
    .select("id, network_id, person_id, kind, title")
    .eq("id", eventId)
    .single()
  if (!event) return

  // Bestaat er al een collecte voor deze mijlpaal? Ga er dan heen.
  const { data: bestaand } = await supabase
    .from("collections")
    .select("id")
    .eq("life_event_id", eventId)
    .maybeSingle()
  if (bestaand) redirect(`/app/collecte/${bestaand.id}`)

  const { data: sugg } = await supabase
    .from("event_suggestions")
    .select("suggested_cents")
    .eq("kind", event.kind)
    .maybeSingle()
  const suggested = sugg?.suggested_cents ?? 200

  const sluit = new Date()
  sluit.setDate(sluit.getDate() + 21)

  const { data: collectie, error } = await supabase
    .from("collections")
    .insert({
      network_id: event.network_id,
      life_event_id: event.id,
      beneficiary_id: event.person_id,
      title: event.title,
      suggested_cents: suggested,
      status: "open",
      closes_at: sluit.toISOString(),
      started_by: meId,
    })
    .select("id")
    .single()
  if (error || !collectie) return

  revalidatePath("/app/mijlpalen")
  redirect(`/app/collecte/${collectie.id}`)
}
