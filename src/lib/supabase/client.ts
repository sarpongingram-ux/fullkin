"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"

// Supabase-client voor client-componenten. Draait met de anon key en
// respecteert dus alle RLS-policies uit de migraties.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
