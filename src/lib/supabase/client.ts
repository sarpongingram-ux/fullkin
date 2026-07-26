"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"

// Supabase-client voor client-componenten. Draait met de anon key en
// respecteert dus alle RLS-policies uit de migraties.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // In dev (bv. testen via een LAN-IP over http) mag de sessie-cookie geen
    // Secure-vlag hebben, anders weigert de browser 'm. In productie (https)
    // blijft Secure aan.
    { cookieOptions: { secure: process.env.NODE_ENV === "production" } },
  )
}
