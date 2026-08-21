"use server"

import { createClient } from "@/lib/supabase/server"

export type UitnodigingResultaat =
  | { ok: true; token: string }
  | { ok: false; fout: string }

// Maakt een uitnodiging voor een bestaand, nog niet geclaimd familielid.
// Verstuurt NIETS. Geeft alleen een token terug, waarmee de client een link en
// een WhatsApp-tekst opbouwt die de gebruiker zelf deelt.
export async function maakUitnodiging(
  personId: string,
): Promise<UitnodigingResultaat> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Je account is nog niet gekoppeld." }

  // De persoon moet in mijn netwerk staan en nog niet geclaimd zijn.
  const { data: doel } = await supabase
    .from("persons")
    .select("id, network_id, first_name, claimed_by")
    .eq("id", personId)
    .single()
  if (!doel) return { ok: false, fout: "Familielid niet gevonden." }
  if (doel.claimed_by) {
    return { ok: false, fout: "Dit familielid is al actief." }
  }

  // Bestaat er al een open uitnodiging? Hergebruik die dan, geen dubbele.
  const { data: bestaand } = await supabase
    .from("invites")
    .select("token")
    .eq("person_id", personId)
    .eq("status", "open")
    .maybeSingle()
  if (bestaand) return { ok: true, token: bestaand.token }

  const { data: nieuw, error } = await supabase
    .from("invites")
    .insert({
      network_id: doel.network_id,
      person_id: personId,
      invited_by: meId,
      channel: "link", // de gebruiker deelt zelf; wij versturen niet
      destination: "",
    })
    .select("token")
    .single()
  if (error || !nieuw) {
    return { ok: false, fout: "Kon de uitnodiging niet aanmaken." }
  }

  return { ok: true, token: nieuw.token }
}
