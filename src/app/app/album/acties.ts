"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Enums } from "@/lib/types/database"

export type NieuwResultaat =
  | { ok: true; id: string }
  | { ok: false; fout: string }

// Maakt een herinnering aan nadat het bestand al naar Storage is geüpload.
// De client uploadt (respecteert storage-RLS) en stuurt hier het opslagpad +
// de gekozen tags door.
export async function maakHerinnering(input: {
  filePath: string
  title?: string | null
  memoryText?: string | null
  dateOfMemory?: string | null
  location?: string | null
  tagPersonIds: string[]
}): Promise<NieuwResultaat> {
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

  if (!input.filePath) return { ok: false, fout: "Er is geen bestand geüpload." }

  const { data: item, error } = await supabase
    .from("album_items")
    .insert({
      network_id: mij.network_id,
      uploaded_by: meId,
      file_url: input.filePath,
      file_type: "foto",
      title: input.title?.trim() || null,
      memory_text: input.memoryText?.trim() || null,
      date_of_memory: input.dateOfMemory || null,
      location: input.location?.trim() || null,
    })
    .select("id")
    .single()
  if (error || !item) {
    return { ok: false, fout: "Kon de herinnering niet opslaan." }
  }

  // Tags koppelen (getagde personen, door mij).
  const uniek = [...new Set(input.tagPersonIds)].filter(Boolean)
  if (uniek.length > 0) {
    await supabase.from("album_tags").insert(
      uniek.map((pid) => ({
        album_item_id: item.id,
        person_id: pid,
        tagged_by: meId,
      })),
    )
  }

  revalidatePath("/app/album")
  return { ok: true, id: item.id }
}

// Eén reactie per persoon per item: zet of wijzig je reactie.
export async function reageer(
  itemId: string,
  reaction: Enums<"reaction_kind">,
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false }

  const { error } = await supabase
    .from("album_reactions")
    .upsert(
      { album_item_id: itemId, person_id: meId, reaction },
      { onConflict: "album_item_id,person_id" },
    )
  revalidatePath(`/app/album/${itemId}`)
  return { ok: !error }
}

// Reactie weghalen (nog eens op dezelfde tikken = uit).
export async function haalReactieWeg(itemId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false }
  const { error } = await supabase
    .from("album_reactions")
    .delete()
    .eq("album_item_id", itemId)
    .eq("person_id", meId)
  revalidatePath(`/app/album/${itemId}`)
  return { ok: !error }
}

export async function plaatsOpmerking(
  itemId: string,
  tekst: string,
): Promise<{ ok: boolean }> {
  const schoon = tekst.trim()
  if (!schoon) return { ok: false }
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false }
  const { error } = await supabase.from("album_comments").insert({
    album_item_id: itemId,
    person_id: meId,
    comment_text: schoon,
  })
  revalidatePath(`/app/album/${itemId}`)
  return { ok: !error }
}
