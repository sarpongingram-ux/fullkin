"use server"

import { createClient } from "@/lib/supabase/server"
import type { Enums } from "@/lib/types/database"

export type ChatBericht = {
  id: string
  sender_id: string | null
  message_text: string | null
  message_type: string
  reference_id: string | null
  created_at: string
}

const BERICHT_KOLOMMEN =
  "id, sender_id, message_text, message_type, reference_id, created_at"

export type StuurResultaat =
  | { ok: true; bericht: ChatBericht }
  | { ok: false; fout: string }

// Verstuurt een tekstbericht in een chatruimte. Loopt via de server met jouw
// sessie, zodat RLS altijd klopt (afzender = jij, ruimte = jouw familie).
export async function stuurBericht(
  roomId: string,
  tekst: string,
): Promise<StuurResultaat> {
  const schoon = tekst.trim()
  if (!schoon) return { ok: false, fout: "Leeg bericht." }
  if (schoon.length > 4000) return { ok: false, fout: "Bericht is te lang." }

  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      sender_id: meId,
      message_text: schoon,
      message_type: "tekst",
    })
    .select(BERICHT_KOLOMMEN)
    .single()
  if (error || !data) {
    return { ok: false, fout: "Kon het bericht niet versturen." }
  }
  return { ok: true, bericht: data as ChatBericht }
}

// Haalt berichten op die na een bepaald tijdstip zijn geplaatst. Vangnet naast
// Realtime, zodat berichten hoe dan ook binnenkomen.
export async function haalNieuweBerichten(
  roomId: string,
  sindsIso: string,
): Promise<ChatBericht[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("chat_messages")
    .select(BERICHT_KOLOMMEN)
    .eq("room_id", roomId)
    .gt("created_at", sindsIso)
    .order("created_at", { ascending: true })
    .limit(200)
  return (data ?? []) as ChatBericht[]
}

// Momenten waarvoor je een collecte kunt starten (life_event_kind).
export type CollecteInvoer = {
  roomId: string
  beneficiaryId: string
  kind: string
  titel: string
  datum: string
}

export type CollecteResultaat =
  | { ok: true; collectieId: string; bericht: ChatBericht }
  | { ok: false; fout: string }

// Start een collecte én plaatst meteen een collecte-kaartje in de familiechat.
export async function startCollecteVanuitChat(
  input: CollecteInvoer,
): Promise<CollecteResultaat> {
  const titel = input.titel.trim()
  if (!input.beneficiaryId || !input.kind || !titel || !input.datum) {
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

  const kind = input.kind as Enums<"life_event_kind">
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
      person_id: input.beneficiaryId,
      kind,
      title: titel,
      occurs_on: input.datum,
      created_by: meId,
    })
    .select("id")
    .single()
  if (eventFout || !event) return { ok: false, fout: "Kon het moment niet opslaan." }

  const sluit = new Date()
  sluit.setDate(sluit.getDate() + 21)
  const { data: collectie, error: colFout } = await supabase
    .from("collections")
    .insert({
      network_id: mij.network_id,
      life_event_id: event.id,
      beneficiary_id: input.beneficiaryId,
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
      fout: "Kon de collecte niet starten. Mogelijk mag je voor dit familielid geen collecte openen.",
    }
  }

  // Collecte-kaartje in de chat plaatsen.
  const { data: msg, error: msgFout } = await supabase
    .from("chat_messages")
    .insert({
      room_id: input.roomId,
      sender_id: meId,
      message_text: titel,
      message_type: "collecte_link",
      reference_id: collectie.id,
    })
    .select(BERICHT_KOLOMMEN)
    .single()
  if (msgFout || !msg) {
    // Collecte staat er wel, alleen het chatbericht niet.
    return { ok: true, collectieId: collectie.id, bericht: {
      id: collectie.id, sender_id: meId, message_text: titel,
      message_type: "collecte_link", reference_id: collectie.id,
      created_at: new Date().toISOString(),
    } }
  }
  return { ok: true, collectieId: collectie.id, bericht: msg as ChatBericht }
}
