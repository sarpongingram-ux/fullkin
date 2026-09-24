"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Bevestigt dat twee nodes dezelfde persoon zijn — hierdoor verbinden de families
// zich en verschijnen nieuwe familieleden.
export async function bevestigMatch(
  a: string,
  b: string,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("bevestig_persoon_match", {
    p_a: a,
    p_b: b,
  })
  if (error) return { ok: false, fout: "Kon de match niet bevestigen." }
  revalidatePath("/app/ontdek")
  revalidatePath("/app")
  return { ok: true }
}
