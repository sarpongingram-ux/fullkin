"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { tekenFotoUrls } from "@/lib/album/urls"
import type { Enums } from "@/lib/types/database"

export type ChatBericht = {
  id: string
  sender_id: string | null
  message_text: string | null
  message_type: string
  reference_id: string | null
  created_at: string
  edited_at: string | null
}

const BERICHT_KOLOMMEN =
  "id, sender_id, message_text, message_type, reference_id, created_at, edited_at"

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
  // Chatten telt als contact: leg vast dat je in touch bent met deze mensen.
  await supabase.rpc("leg_chat_contact_vast", { p_room: roomId })
  return { ok: true, bericht: data as ChatBericht }
}

// Bewerkt een eigen tekstbericht. RLS staat alleen je eigen berichten toe.
export async function bewerkBericht(
  messageId: string,
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
    .update({ message_text: schoon, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_id", meId)
    .eq("message_type", "tekst")
    .select(BERICHT_KOLOMMEN)
    .single()
  if (error || !data) {
    return { ok: false, fout: "Kon het bericht niet bewerken." }
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

// Start (of hervind) een direct gesprek met een familielid. Geeft de room-id.
export async function startDirect(
  otherId: string,
): Promise<{ ok: true; roomId: string } | { ok: false; fout: string }> {
  if (!otherId) return { ok: false, fout: "Kies een familielid." }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("start_direct", { p_other: otherId })
  if (error || !data) {
    return { ok: false, fout: "Kon het gesprek niet starten." }
  }
  return { ok: true, roomId: data as string }
}

export type FotoResultaat =
  | { ok: true; bericht: ChatBericht; url: string }
  | { ok: false; fout: string }

// Deelt een foto in de chat én slaat 'm op in het familiealbum: één upload,
// twee plekken. Upload loopt via de server met jouw token (storage-RLS).
export async function deelFoto(
  roomId: string,
  formData: FormData,
): Promise<FotoResultaat> {
  const file = formData.get("foto")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, fout: "Kies een foto." }
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, fout: "Dit is geen afbeelding." }
  }
  if (file.size > 15 * 1024 * 1024) {
    return { ok: false, fout: "Deze foto is groter dan 15MB." }
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

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { ok: false, fout: "Je sessie is verlopen. Log opnieuw in." }
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
  const pad = `${mij.network_id}/${crypto.randomUUID()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const up = await fetch(`${base}/storage/v1/object/family-album/${pad}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Content-Type": file.type,
    },
    body: bytes,
  })
  if (!up.ok) {
    const t = await up.text().catch(() => "")
    return { ok: false, fout: "Uploaden mislukt: " + (t || up.status) }
  }

  // In het familiealbum plaatsen.
  const { data: item } = await supabase
    .from("album_items")
    .insert({
      network_id: mij.network_id,
      uploaded_by: meId,
      file_url: pad,
      file_type: "foto",
    })
    .select("id")
    .single()

  // In de chat plaatsen (pad in message_text, album-item in reference_id).
  const { data: msg, error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      sender_id: meId,
      message_text: pad,
      message_type: "foto",
      reference_id: item?.id ?? null,
    })
    .select(BERICHT_KOLOMMEN)
    .single()
  if (error || !msg) return { ok: false, fout: "Kon de foto niet delen." }

  // Een foto delen telt ook als contact met de mensen in dit gesprek.
  await supabase.rpc("leg_chat_contact_vast", { p_room: roomId })

  const urls = await tekenFotoUrls(supabase, [pad])
  revalidatePath("/app/album")
  return { ok: true, bericht: msg as ChatBericht, url: urls.get(pad) ?? "" }
}

// Tekent een kortlevende URL voor een chatfoto (voor live binnenkomende foto's).
export async function tekenChatFoto(pad: string): Promise<string | null> {
  const supabase = await createClient()
  const urls = await tekenFotoUrls(supabase, [pad])
  return urls.get(pad) ?? null
}

// Word lid van een takchat (handmatig toetreden aan een andere tak).
export async function neemDeelAanTak(
  roomId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false }
  const { error } = await supabase
    .from("chat_members")
    .upsert(
      { room_id: roomId, person_id: meId, joined_at: new Date().toISOString() },
      { onConflict: "room_id,person_id", ignoreDuplicates: true },
    )
  revalidatePath("/app/chat")
  return { ok: !error }
}

// Markeert een chatruimte als gelezen (voor de ongelezen-stip in het overzicht).
export async function markeerGelezen(roomId: string): Promise<void> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return
  await supabase.from("chat_members").upsert(
    {
      room_id: roomId,
      person_id: meId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "room_id,person_id" },
  )
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
  | { ok: true; collectieId: string }
  | { ok: false; fout: string }

export type MomentInvoer = {
  roomId: string
  personId: string
  kind: string
  titel: string
  datum: string
}

// Deelt een familiemoment (geboorte, huwelijk, afstuderen…) als speciaal
// bericht in de chat. Legt het ook vast als life event (Levenslijn/album).
export async function deelMoment(
  input: MomentInvoer,
): Promise<StuurResultaat> {
  const titel = input.titel.trim()
  if (!input.personId || !input.kind || !titel || !input.datum) {
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

  const { data: event, error: eventFout } = await supabase
    .from("life_events")
    .insert({
      network_id: mij.network_id,
      person_id: input.personId,
      kind: input.kind as Enums<"life_event_kind">,
      title: titel,
      occurs_on: input.datum,
      created_by: meId,
    })
    .select("id")
    .single()
  if (eventFout || !event) {
    return { ok: false, fout: "Kon het moment niet opslaan." }
  }

  const { data: msg, error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: input.roomId,
      sender_id: meId,
      message_text: titel,
      message_type: "moment",
      reference_id: event.id,
    })
    .select(BERICHT_KOLOMMEN)
    .single()
  if (error || !msg) return { ok: false, fout: "Kon het moment niet delen." }
  return { ok: true, bericht: msg as ChatBericht }
}

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

  // Het collecte-kaartje in de chat wordt automatisch geplaatst door een
  // database-trigger (voor elke collecte, waar ook gestart). Het verschijnt via
  // Realtime, dus we hoeven hier niets extra's te posten.
  return { ok: true, collectieId: collectie.id }
}
