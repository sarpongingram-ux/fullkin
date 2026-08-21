"use server"

import { createClient } from "@/lib/supabase/server"

export type ChatBericht = {
  id: string
  sender_id: string | null
  message_text: string | null
  message_type: string
  created_at: string
}

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
    .select("id, sender_id, message_text, message_type, created_at")
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
    .select("id, sender_id, message_text, message_type, created_at")
    .eq("room_id", roomId)
    .gt("created_at", sindsIso)
    .order("created_at", { ascending: true })
    .limit(200)
  return (data ?? []) as ChatBericht[]
}
