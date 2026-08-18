"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Enums } from "@/lib/types/database"

export type RolResultaat = { ok: true } | { ok: false; fout: string }

// Een Family Keeper wijst een rol toe aan een familielid. De Family Keeper-rol zelf
// is permanent en wordt hier nooit toegewezen of ingetrokken.
export async function wijsRolToe(
  personId: string,
  role: Enums<"family_role">,
): Promise<RolResultaat> {
  if (role === "co_founder") {
    return { ok: false, fout: "De Family Keeper-rol is permanent en niet toewijsbaar." }
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

  // Alleen een Family Keeper mag rollen toewijzen (dubbel op de RLS-policy).
  const { data: isCoFounder } = await supabase.rpc("has_role", {
    net: mij.network_id,
    r: "co_founder",
  })
  if (!isCoFounder) {
    return { ok: false, fout: "Alleen een Family Keeper kan rollen toewijzen." }
  }

  // Controleer of de rol ontgrendeld is op basis van familiegrootte.
  const { data: rollen } = await supabase.rpc("family_roles")
  const rij = (rollen ?? []).find((r) => r.role === role)
  if (!rij?.ontgrendeld) {
    return { ok: false, fout: "Deze rol is nog niet ontgrendeld voor jullie familie." }
  }

  // Bestaande houder van deze rol intrekken (rolwissel).
  await supabase
    .from("memberships")
    .update({ revoked_at: new Date().toISOString() })
    .eq("network_id", mij.network_id)
    .eq("role", role)
    .is("revoked_at", null)

  const { error } = await supabase.from("memberships").insert({
    network_id: mij.network_id,
    person_id: personId,
    role,
  })
  if (error) {
    return { ok: false, fout: "Kon de rol niet toewijzen." }
  }

  revalidatePath("/app/dashboard")
  return { ok: true }
}
