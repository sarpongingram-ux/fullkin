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
// wordt gekoppeld via de gedeelde ouder(s) — precies zoals in het echt.
export async function voegFamilielidToe(
  _vorige: ToevoegResultaat | null,
  formData: FormData,
): Promise<ToevoegResultaat> {
  const voornaam = String(formData.get("voornaam") ?? "").trim()
  const achternaam = String(formData.get("achternaam") ?? "").trim()
  const stad = String(formData.get("stad") ?? "").trim() || null
  const relatie = String(formData.get("relatie") ?? "") as RelatieKeuze
  const origin = (String(formData.get("origin") ?? "biological") ||
    "biological") as Enums<"relationship_origin">

  if (!voornaam || !achternaam) {
    return { ok: false, fout: "Vul een voor- en achternaam in." }
  }
  if (!["ouder", "kind", "partner", "broer_zus"].includes(relatie)) {
    return { ok: false, fout: "Kies hoe dit familielid met je verbonden is." }
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

  // Voor een broer of zus hebben we minstens één ouder van jou nodig. Dit
  // controleren we vóór we iemand aanmaken, zodat er geen los familielid
  // ontstaat als het niet kan.
  let ouderIds: string[] = []
  if (relatie === "broer_zus") {
    const { data: ouders } = await supabase
      .from("relationships")
      .select("from_person")
      .eq("kind", "parent")
      .eq("to_person", meId)
    ouderIds = (ouders ?? []).map((r) => r.from_person)
    if (ouderIds.length === 0) {
      return {
        ok: false,
        fout:
          "Voeg eerst een ouder toe. Een broer of zus verbindt via jullie gedeelde ouder.",
      }
    }
  }

  // De persoon aanmaken.
  const { data: nieuw, error: persoonFout } = await supabase
    .from("persons")
    .insert({
      network_id,
      first_name: voornaam,
      last_name: achternaam,
      city: stad,
      created_by: user.id,
    })
    .select("id")
    .single()
  if (persoonFout || !nieuw) {
    return { ok: false, fout: "Kon het familielid niet opslaan." }
  }

  // De relatie-edges bepalen en aanmaken.
  type Edge = {
    kind: Enums<"relationship_kind">
    from_person: string
    to_person: string
  }
  const edges: Edge[] = []

  if (relatie === "ouder") {
    edges.push({ kind: "parent", from_person: nieuw.id, to_person: meId })
  } else if (relatie === "kind") {
    edges.push({ kind: "parent", from_person: meId, to_person: nieuw.id })
  } else if (relatie === "partner") {
    // partner_normalised: from_person < to_person
    const [a, b] = [meId, nieuw.id].sort()
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
