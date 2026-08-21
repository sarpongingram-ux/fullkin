import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/types/database"

// Supabase-client voor server-componenten en route handlers. Leest de sessie
// uit de cookies. Ook deze draait als de ingelogde gebruiker, achter RLS.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll aangeroepen vanuit een Server Component, mag genegeerd
            // worden zolang er middleware is die de sessie ververst.
          }
        },
      },
    },
  )
}
