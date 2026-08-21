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
