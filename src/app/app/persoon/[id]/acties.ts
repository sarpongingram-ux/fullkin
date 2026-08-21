"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Enums } from "@/lib/types/database"

export type KindResultaat = { ok: true } | { ok: false; fout: string }

// De aarden van ouderschap die we in de app aanbieden. De database kent er meer,
// maar dit zijn de begrijpelijke keuzes voor families.
const OUDER_AARDEN = ["biological", "step", "foster", "adoptive"] as const

// Koppelt een bestaand familielid als ouder van een ander bestaand familielid.
// Handig voor bijvoorbeeld een opvoedvader: iemand die al op de kaart staat als
// ouder van je broer of zus zetten, zonder een nieuw profiel aan te maken. De
// aard (biologisch, stief, opvoed, adoptie) leggen we vast op de relatie zelf.
export async function koppelOuder(
  kindId: string,
  ouderId: string,
  aard: string,
): Promise<KindResultaat> {
  if (!ouderId) return { ok: false, fout: "Kies een familielid." }
  if (ouderId === kindId) {
    return { ok: false, fout: "Iemand kan niet zijn eigen ouder zijn." }
  }
  const origin = (
    OUDER_AARDEN.includes(aard as (typeof OUDER_AARDEN)[number])
      ? aard
      : "biological"
  ) as Enums<"relationship_origin">

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  // Beide personen moeten in hetzelfde netwerk zitten.
  const { data: kind } = await supabase
    .from("persons")
    .select("id, network_id")
    .eq("id", kindId)
    .single()
  const { data: ouder } = await supabase
    .from("persons")
    .select("id, network_id")
    .eq("id", ouderId)
    .single()
  if (!kind || !ouder || kind.network_id !== ouder.network_id) {
    return { ok: false, fout: "Kies een geldig familielid uit jouw familie." }
  }

  // Bestaat deze ouder-band al? Dan niets doen.
  const { data: bestaand } = await supabase
    .from("relationships")
    .select("id")
    .eq("kind", "parent")
    .eq("from_person", ouderId)
    .eq("to_person", kindId)
    .limit(1)
  if (bestaand && bestaand.length > 0) {
    return { ok: false, fout: "Deze ouder is al gekoppeld." }
  }

  const { error } = await supabase.from("relationships").insert({
    network_id: kind.network_id,
    kind: "parent",
    origin,
    from_person: ouderId,
    to_person: kindId,
    created_by: user.id,
  })
  if (error) {
    return {
      ok: false,
      fout: "Kon de ouder niet koppelen. Alleen de Family Keeper of beheerder kan dit.",
    }
  }

  revalidatePath(`/app/persoon/${kindId}`)
  revalidatePath(`/app/persoon/${ouderId}`)
  revalidatePath("/app/familie")
  return { ok: true }
}

// Markeert een bestaand familielid als kind (beheerd profiel, onder 16) of haalt
// die status juist weg. Ook de geboortedatum kan hier gezet worden. RLS bepaalt
// wie het mag: de Family Keeper of degene die het profiel beheert.
export async function stelKindStatus(
  personId: string,
  geboortedatum: string | null,
  isKind: boolean,
): Promise<KindResultaat> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je bent niet ingelogd." }

  const patch: { managed_by: string | null; born_on?: string } = {
    managed_by: isKind ? meId : null,
  }
  if (geboortedatum) patch.born_on = geboortedatum

  const { error } = await supabase.from("persons").update(patch).eq("id", personId)
  if (error) {
    return {
      ok: false,
      fout: "Kon dit niet opslaan. Alleen de Family Keeper of de beheerder kan dit wijzigen.",
    }
  }

  revalidatePath(`/app/persoon/${personId}`)
  revalidatePath("/app/familie")
  return { ok: true }
}

const AVATAR_MAX = 10 * 1024 * 1024

function vernieuwProfiel(personId: string) {
  revalidatePath(`/app/persoon/${personId}`)
  revalidatePath("/app/familie")
  revalidatePath("/app/familie/stamboom")
  revalidatePath("/app")
}

// Uploadt een profielfoto en koppelt 'm aan de persoon. De upload loopt via de
// server (met jouw ingelogde sessie), zodat storage-RLS altijd klopt — anders
// dan een client-upload die soms als anonieme gebruiker binnenkomt.
export async function uploadProfielfoto(
  formData: FormData,
): Promise<KindResultaat> {
  const personId = String(formData.get("personId") ?? "")
  const file = formData.get("foto")
  if (!personId) return { ok: false, fout: "Onbekende persoon." }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, fout: "Kies een afbeelding." }
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, fout: "Dit is geen afbeelding." }
  }
  if (file.size > AVATAR_MAX) {
    return { ok: false, fout: "Deze foto is groter dan 10MB." }
  }

  const supabase = await createClient()
  const { data: persoon } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", personId)
    .single()
  if (!persoon) return { ok: false, fout: "Persoon niet gevonden." }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
  const pad = `${persoon.network_id}/${personId}-${crypto.randomUUID()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())

  // De storage-client van @supabase/ssr (en zelfs de accessToken-optie) draagt
  // jouw token bij SSR niet mee, waardoor de upload als anon binnenkomt en RLS
  // 'm weigert. We doen de upload daarom met een directe HTTP-call, waarin we
  // jouw sessie-token zelf in de Authorization-header zetten. Zo komt de upload
  // gegarandeerd geauthenticeerd binnen.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { ok: false, fout: "Je sessie is verlopen. Log opnieuw in." }
  }
  // Het pad is altijd een nieuwe UUID, dus een gewone insert (zonder upsert)
  // volstaat — en die valt netjes onder de insert-policy voor geauthenticeerde
  // gebruikers.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const uploadRes = await fetch(`${base}/storage/v1/object/avatars/${pad}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Content-Type": file.type,
    },
    body: bytes,
  })
  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => "")
    return { ok: false, fout: "Uploaden mislukt: " + (body || uploadRes.status) }
  }

  const fotoUrl = `${base}/storage/v1/object/public/avatars/${pad}`
  const { error } = await supabase
    .from("persons")
    .update({ photo_url: fotoUrl })
    .eq("id", personId)
  if (error) {
    return {
      ok: false,
      fout: "Foto geüpload, maar niet opgeslagen. Alleen de persoon zelf, de beheerder of de Family Keeper kan dit.",
    }
  }
  vernieuwProfiel(personId)
  return { ok: true }
}

// Verwijdert de profielfoto (zet 'm terug op initialen).
export async function verwijderProfielfoto(
  personId: string,
): Promise<KindResultaat> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("persons")
    .update({ photo_url: null })
    .eq("id", personId)
  if (error) {
    return { ok: false, fout: "Kon de foto niet verwijderen." }
  }
  vernieuwProfiel(personId)
  return { ok: true }
}

// Past de naam van een familielid aan. Handig om een nog "Onbekende" (automatisch
// aangemaakte gedeelde ouder) alsnog een naam te geven. RLS bepaalt wie het mag.
export async function stelNaam(
  personId: string,
  voornaam: string,
  achternaam: string,
): Promise<KindResultaat> {
  const voor = voornaam.trim()
  const achter = achternaam.trim()
  if (!voor) return { ok: false, fout: "Vul minstens een voornaam in." }

  const supabase = await createClient()
  const { error } = await supabase
    .from("persons")
    .update({ first_name: voor, last_name: achter })
    .eq("id", personId)
  if (error) {
    return {
      ok: false,
      fout: "Kon dit niet opslaan. Alleen de Family Keeper of de beheerder kan dit wijzigen.",
    }
  }
  revalidatePath(`/app/persoon/${personId}`)
  revalidatePath("/app/familie")
  return { ok: true }
}

// Legt vast dat een familielid is overleden (of maakt dat ongedaan). De datum
// is optioneel. RLS bepaalt wie het mag (Family Keeper of beheerder).
export async function stelOverlijden(
  personId: string,
  overledenOp: string | null,
): Promise<KindResultaat> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("persons")
    .update({ died_on: overledenOp })
    .eq("id", personId)
  if (error) {
    return {
      ok: false,
      fout: "Kon dit niet opslaan. Alleen de Family Keeper of de beheerder kan dit wijzigen.",
    }
  }
  revalidatePath(`/app/persoon/${personId}`)
  revalidatePath("/app/familie")
  return { ok: true }
}
