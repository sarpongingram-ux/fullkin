"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function markeerGelezen(): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc("markeer_meldingen_gelezen")
  revalidatePath("/app")
  revalidatePath("/app/meldingen")
}
