"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Wissel van actieve familie. me() en alle schermen volgen daarna dit netwerk.
export async function wisselFamilie(
  networkId: string,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("zet_actieve_familie", {
    p_net: networkId,
  })
  if (error) return { ok: false, fout: "Wisselen lukte niet." }
  revalidatePath("/app", "layout")
  return { ok: true }
}
