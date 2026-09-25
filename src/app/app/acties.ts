"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Enums } from "@/lib/types/database"

export type RelatieKeuze = "ouder" | "kind" | "partner" | "ex_partner" | "broer_zus"

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
  if (!["ouder", "kind", "partner", "ex_partner", "broer_zus"].includes(relatie)) {
    return { ok: false, fout: "Kies hoe dit familielid verbonden is." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  // P1.6: de volledige build (persoon-create + eventuele placeholder-ouder + edges)
  // gebeurt in één transactionele RPC. Zo ontstaat er nooit een losse (orphan) node
  // als een tussenstap faalt. Autorisatie, netwerk- en pauzecontrole, en de
  // graph-integriteit (geen cross-network/cykels/dubbele edges) zitten in de database.
  const { error } = await supabase.rpc("add_family_member", {
    p_voornaam: voornaam,
    p_achternaam: achternaam,
    p_relatie: relatie,
    p_anker: ankerRaw || undefined,
    p_stad: stad ?? undefined,
    p_land: land ?? undefined,
    p_geboortedatum: geboortedatum ?? undefined,
    p_is_kind: isKind,
    p_origin: origin,
  })
  if (error) {
    // De RPC geeft gebruikersvriendelijke Nederlandse foutmeldingen terug.
    return { ok: false, fout: error.message || "Kon het familielid niet opslaan." }
  }

  revalidatePath("/app")
  return { ok: true, naam: voornaam }
}
