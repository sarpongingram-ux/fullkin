"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function Inloggen() {
  const [email, setEmail] = useState("kofi@fullkin.test")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Inloggen mislukt. Controleer je gegevens.")
      setBezig(false)
      return
    }
    // Volledige navigatie i.p.v. router.push: zo gaat de net gezette
    // sessie-cookie mee met het verzoek en ziet de server je als ingelogd.
    // (Client-side navigeren gaf een race waarbij je terugkaatste naar login.)
    window.location.assign("/app")
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={login}
        className="w-full max-w-sm bg-oppervlak rounded-2xl border border-rand p-8 shadow-sm"
      >
        <p className="text-terracotta font-semibold tracking-[0.3em] text-xs text-center mb-2">
          FULLKIN
        </p>
        <h1 className="text-xl font-bold text-center text-inkt mb-6">
          Welkom terug bij je familie
        </h1>

        <label className="block text-sm text-inkt-zacht mb-1">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 mb-4 text-inkt outline-none focus:border-terracotta"
          required
        />

        <label className="block text-sm text-inkt-zacht mb-1">Wachtwoord</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 mb-6 text-inkt outline-none focus:border-terracotta"
          required
        />

        {error && <p className="text-terracotta text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={bezig}
          className="w-full rounded-full bg-terracotta py-3 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Inloggen"}
        </button>

        <p className="mt-6 text-center text-xs text-inkt-zacht">
          Demo: kofi@fullkin.test / fullkin
        </p>
      </form>
    </main>
  )
}
