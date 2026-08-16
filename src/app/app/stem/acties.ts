"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function nomineer(
  roundId: string,
  nomineeId: string,
  reason: string,
): Promise<{ ok: boolean; fout?: string }> {
  const zin = reason.trim()
  if (!nomineeId) return { ok: false, fout: "Kies een familielid." }
  if (zin.length < 3) return { ok: false, fout: "Schrijf één zin waarom." }

  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Niet ingelogd." }

  const { error } = await supabase.from("stem_nominations").insert({
    round_id: roundId,
    nominee_person_id: nomineeId,
    nominated_by: meId,
    reason: zin,
  })
  if (error) {
    // Uniciteit: één nominatie per persoon per ronde.
    if (error.code === "23505")
      return { ok: false, fout: "Dit familielid is al genomineerd." }
    return { ok: false, fout: error.message }
  }

  revalidatePath("/app/stem")
  return { ok: true }
}

export async function stem(
  roundId: string,
  nominationId: string,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { data: meId } = await supabase.rpc("me")
  if (!meId) return { ok: false, fout: "Niet ingelogd." }

  const { error } = await supabase.from("stem_votes").insert({
    round_id: roundId,
    nomination_id: nominationId,
    voter_id: meId,
  })
  if (error) {
    if (error.code === "23505")
      return { ok: false, fout: "Je hebt dit jaar al gestemd." }
    return { ok: false, fout: error.message }
  }

  revalidatePath("/app/stem")
  return { ok: true }
}

export async function sluitStem(
  roundId: string,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("sluit_stem", { p_round: roundId })
  if (error) return { ok: false, fout: error.message }

  revalidatePath("/app/stem")
  return { ok: true }
}
