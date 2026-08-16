"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Enums } from "@/lib/types/database"

export async function draaiHetRad(): Promise<
  { ok: true; drawId: string } | { ok: false; fout: string }
> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("draai_rad")
  if (error || !data) {
    return {
      ok: false,
      fout: error?.message ?? "Het Rad kon niet draaien.",
    }
  }
  revalidatePath("/app/rad")
  return { ok: true, drawId: data }
}

export async function beslisRad(
  drawId: string,
  choice: Enums<"rad_choice">,
  recipient: string | null,
): Promise<{ ok: boolean; fout?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("beslis_rad", {
    p_draw: drawId,
    p_choice: choice,
    p_recipient: recipient,
  })
  if (error) return { ok: false, fout: error.message }
  revalidatePath("/app/rad")
  return { ok: true }
}
