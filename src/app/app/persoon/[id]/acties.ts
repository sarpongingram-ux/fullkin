"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type KindResultaat = { ok: true } | { ok: false; fout: string }

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
