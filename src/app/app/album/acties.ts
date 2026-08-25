"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"
import type { Enums } from "@/lib/types/database"

export type NieuwResultaat =
  | { ok: true; id: string }
  | { ok: false; fout: string }

export type UploadUrlResultaat =
  | { ok: true; pad: string; token: string }
  | { ok: false; fout: string }

// Maakt een geautoriseerde upload-link (signed upload URL) aan. De telefoon
// uploadt het bestand daar RECHTSTREEKS naartoe — dat omzeilt zowel het
// anon-token-probleem van @supabase/ssr bij Storage als de ~4,5MB body-limiet
// van Vercel-functies (grote video/audio kan zo tot 200MB).
export async function maakUploadUrl(ext: string): Promise<UploadUrlResultaat> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()
  if (!mij) return { ok: false, fout: "Je profiel is niet gevonden." }

  const veiligExt =
    (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg"
  const pad = `${mij.network_id}/${crypto.randomUUID()}.${veiligExt}`

  // De service-client maakt de geautoriseerde upload-link (SDK-methode). De
  // telefoon uploadt daar rechtstreeks naartoe. Het pad is server-side afgeleid
  // van jouw eigen netwerk, dus je kunt alleen in je eigen familie-map uploaden.
  try {
    const svc = createServiceClient()
    const { data, error } = await svc.storage
      .from("family-album")
      .createSignedUploadUrl(pad)
    if (error || !data?.token) {
      return {
        ok: false,
        fout: "Kon de upload niet voorbereiden. Probeer het nog eens.",
      }
    }
    return { ok: true, pad: data.path, token: data.token }
  } catch {
    return {
      ok: false,
      fout: "Uploaden kan nu even niet. Probeer het straks opnieuw.",
    }
  }
}

// Maakt een herinnering aan nadat het bestand al naar Storage is geüpload.
// De client uploadt (respecteert storage-RLS) en stuurt hier het opslagpad +
// de gekozen tags door.
export async function maakHerinnering(input: {
  filePath: string
  fileType?: Enums<"media_kind">
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
      file_type: input.fileType ?? "foto",
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
    // Iedereen die getagd is een melding sturen (meld() slaat jezelf over).
    for (const pid of uniek) {
      await supabase.rpc("meld", {
        p_recipient: pid,
        p_kind: "album_tag",
        p_subject_type: "album_item",
        p_subject_id: item.id,
      })
    }
  }

  revalidatePath("/app/album")
  return { ok: true, id: item.id }
}

// Voegt (extra) getagde personen toe aan een bestaande herinnering. Handig als
// je bij het uploaden iemand vergeten bent. Alleen nieuwe tags worden gezet en
// die personen krijgen een melding.
export async function voegTagsToe(
  itemId: string,
  personIds: string[],
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false }

  const { data: bestaand } = await supabase
    .from("album_tags")
    .select("person_id")
    .eq("album_item_id", itemId)
  const alGetagd = new Set((bestaand ?? []).map((t) => t.person_id))
  const nieuw = [...new Set(personIds)].filter((id) => id && !alGetagd.has(id))
  if (nieuw.length === 0) return { ok: true }

  const { error } = await supabase.from("album_tags").insert(
    nieuw.map((pid) => ({
      album_item_id: itemId,
      person_id: pid,
      tagged_by: meId,
    })),
  )
  if (error) return { ok: false }

  for (const pid of nieuw) {
    await supabase.rpc("meld", {
      p_recipient: pid,
      p_kind: "album_tag",
      p_subject_type: "album_item",
      p_subject_id: itemId,
    })
  }
  revalidatePath(`/app/album/${itemId}`)
  return { ok: true }
}

// Haalt één tag weg. RLS bepaalt wie mag: de tagger, de uploader of de Keeper.
export async function verwijderTag(
  itemId: string,
  personId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("album_tags")
    .delete()
    .eq("album_item_id", itemId)
    .eq("person_id", personId)
  revalidatePath(`/app/album/${itemId}`)
  return { ok: !error }
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
  if (!error) await meldEigenaar(supabase, itemId, "album_reactie")
  revalidatePath(`/app/album/${itemId}`)
  return { ok: !error }
}

// Stuurt de uploader van een herinnering een melding (niet als jij het zelf bent).
async function meldEigenaar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  kind: "album_reactie" | "album_opmerking",
) {
  const { data: item } = await supabase
    .from("album_items")
    .select("uploaded_by")
    .eq("id", itemId)
    .single()
  if (!item) return
  await supabase.rpc("meld", {
    p_recipient: item.uploaded_by,
    p_kind: kind,
    p_subject_type: "album_item",
    p_subject_id: itemId,
  })
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
  if (!error) await meldEigenaar(supabase, itemId, "album_opmerking")
  revalidatePath(`/app/album/${itemId}`)
  return { ok: !error }
}
