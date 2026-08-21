import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// OAuth-callback: Google (of een andere provider) stuurt de gebruiker hierheen
// terug met een code. Die wisselen we in voor een sessie (cookies) en daarna
// sturen we door naar 'next' (standaard de app; bij een uitnodiging terug naar
// de welkom-pagina zodat men zijn plek kan claimen).
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") ?? "/app"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Achter een proxy (Vercel) is x-forwarded-host het echte domein.
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocal = process.env.NODE_ENV === "development"
      const base = isLocal
        ? url.origin
        : forwardedHost
          ? `https://${forwardedHost}`
          : url.origin
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  return NextResponse.redirect(`${url.origin}/inloggen?fout=oauth`)
}
