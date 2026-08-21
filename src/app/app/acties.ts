"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Enums } from "@/lib/types/database"

export type RelatieKeuze = "ouder" | "kind" | "partner" | "broer_zus"

export type ToevoegResultaat =
  | { ok: true; naam: string }
  | { ok: false; fout: string }

// Voegt een familielid toe aan de kaart van de ingelogde gebruiker.
//
// De gebruiker kiest een menselijke relatie. Wij vertalen die naar de enige
// twee soorten die de database kent: ouder-kind en partner. Een broer of zus
// wordt gekoppeld via de gedeelde ouder(s), precies zoals in het echt.
export async function voegFamilielidToe(
  _vorige: ToevoegResultaat | null,
  formData: FormData,
): Promise<ToevoegResultaat> {
  const voornaam = String(formData.get("voornaam") ?? "").trim()
  const achternaam = String(formData.get("achternaam") ?? "").trim()
  const stad = String(formData.get("stad") ?? "").trim() || null
  const land = String(formData.get("land") ?? "").trim() || null
  const relatie = String(formData.get("relatie") ?? "") as RelatieKeuze
  const ankerRaw = String(formData.get("verwant_aan") ?? "").trim()
  const geboortedatum = String(formData.get("geboortedatum") ?? "").trim() || null
  const isKind = formData.get("is_kind") === "on"
  const origin = (String(formData.get("origin") ?? "biological") ||
    "biological") as Enums<"relationship_origin">

  if (!voornaam || !achternaam) {
    return { ok: false, fout: "Vul een voor- en achternaam in." }
  }
  if (!["ouder", "kind", "partner", "broer_zus"].includes(relatie)) {
    return { ok: false, fout: "Kies hoe dit familielid verbonden is." }
  }

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
  const network_id = mij.network_id

  // Het nieuwe lid wordt gekoppeld aan een "anker": standaard jij, maar het mag
  // ook een ander familielid zijn (zo bouw je de bredere familie op). Het anker
  // moet in jouw netwerk zitten.
  const ankerId = ankerRaw || meId
  const { data: anker } = await supabase
    .from("persons")
    .select("id, first_name, network_id")
    .eq("id", ankerId)
    .single()
  if (!anker || anker.network_id !== network_id) {
    return { ok: false, fout: "Kies een geldig familielid om aan te koppelen." }
  }

  // Voor een broer of zus hebben we minstens één ouder van het anker nodig. Dit
  // controleren we vóór we iemand aanmaken, zodat er geen los familielid
  // ontstaat als het niet kan.
  let ouderIds: string[] = []
  if (relatie === "broer_zus") {
    const { data: ouders } = await supabase
      .from("relationships")
      .select("from_person")
      .eq("kind", "parent")
      .eq("to_person", ankerId)
    ouderIds = (ouders ?? []).map((r) => r.from_person)
    // Geen bekende ouder? Dan maken we straks een gedeelde (nog onbekende) ouder
    // aan, zodat de broer/zus-relatie klopt. Zie hieronder.
  }

  // De persoon aanmaken.
  const { data: nieuw, error: persoonFout } = await supabase
    .from("persons")
    .insert({
      network_id,
      first_name: voornaam,
      last_name: achternaam,
      city: stad,
      country: land,
      born_on: geboortedatum,
      // Een kind is een profiel dat de toevoeger beheert (geen eigen account,
      // geen verplichtingen). Het kind kan het later zelf overnemen.
      managed_by: isKind ? meId : null,
      created_by: user.id,
    })
    .select("id")
    .single()
  if (persoonFout || !nieuw) {
    return { ok: false, fout: "Kon het familielid niet opslaan." }
  }

  // Broer of zus zonder bekende ouder: maak een gedeelde (nog onbekende) ouder
  // aan en koppel het anker daaraan. Zo klopt de broer/zus-relatie en kun je de
  // bredere familie opbouwen. Deze ouder kun je later invullen.
  if (relatie === "broer_zus" && ouderIds.length === 0) {
    const { data: placeholder } = await supabase
      .from("persons")
      .insert({
        network_id,
        first_name: "Onbekende",
        last_name: achternaam,
        created_by: user.id,
      })
      .select("id")
      .single()
    if (placeholder) {
      await supabase.from("relationships").insert({
        network_id,
        kind: "parent",
        origin,
        from_person: placeholder.id,
        to_person: ankerId,
        created_by: user.id,
      })
      ouderIds = [placeholder.id]
    }
  }

  // De relatie-edges bepalen en aanmaken.
  type Edge = {
    kind: Enums<"relationship_kind">
    from_person: string
    to_person: string
  }
  const edges: Edge[] = []

  if (relatie === "ouder") {
    edges.push({ kind: "parent", from_person: nieuw.id, to_person: ankerId })
  } else if (relatie === "kind") {
    edges.push({ kind: "parent", from_person: ankerId, to_person: nieuw.id })
  } else if (relatie === "partner") {
    // partner_normalised: from_person < to_person
    const [a, b] = [ankerId, nieuw.id].sort()
    edges.push({ kind: "partner", from_person: a, to_person: b })
  } else if (relatie === "broer_zus") {
    // Zelfde ouder(s) als ik → automatisch broer of zus op de kaart.
    for (const ouderId of ouderIds) {
      edges.push({ kind: "parent", from_person: ouderId, to_person: nieuw.id })
    }
  }

  const { error: relFout } = await supabase.from("relationships").insert(
    edges.map((e) => ({
      network_id,
      kind: e.kind,
      origin,
      from_person: e.from_person,
      to_person: e.to_person,
      created_by: user.id,
    })),
  )
  if (relFout) {
    return {
      ok: false,
      fout: "Het familielid is opgeslagen, maar de relatie kon niet gelegd worden.",
    }
  }

  revalidatePath("/app")
  return { ok: true, naam: voornaam }
}
