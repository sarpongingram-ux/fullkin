"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function Inloggen() {
  const [registreren, setRegistreren] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  async function verstuur(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setError(null)
    const supabase = createClient()

    if (registreren) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(
          error.message.includes("already")
            ? "Er bestaat al een account met dit e-mailadres. Log in."
            : "Aanmelden mislukt. Probeer een ander e-mailadres of wachtwoord.",
        )
        setBezig(false)
        return
      }
      // E-mailbevestiging staat uit, dus er is meteen een sessie. Zonder sessie
      // (bevestiging aan) vragen we de gebruiker in te loggen na bevestiging.
      if (!data.session) {
        setError("Check je e-mail om je account te bevestigen en log daarna in.")
        setBezig(false)
        return
      }
      // Nieuwe gebruiker heeft nog geen familie → naar de voordeur.
      window.location.assign("/start")
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Inloggen mislukt. Controleer je gegevens.")
      setBezig(false)
      return
    }
    // Volledige navigatie i.p.v. router.push: zo gaat de net gezette
    // sessie-cookie mee met het verzoek en ziet de server je als ingelogd.
    window.location.assign("/app")
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={verstuur}
        className="w-full max-w-sm bg-oppervlak rounded-2xl border border-rand p-8 shadow-sm"
      >
        <p className="text-terracotta font-semibold tracking-[0.3em] text-xs text-center mb-2">
          FULLKIN
        </p>
        <h1 className="text-xl font-bold text-center text-inkt mb-6">
          {registreren ? "Begin bij je familie" : "Welkom terug bij je familie"}
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
          minLength={6}
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 mb-2 text-inkt outline-none focus:border-terracotta"
          required
        />
        {registreren ? (
          <p className="text-xs text-inkt-zacht mb-4">Minimaal 6 tekens.</p>
        ) : (
          <div className="mb-4" />
        )}

        {error && <p className="text-terracotta text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={bezig}
          className="w-full rounded-full bg-terracotta py-3 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : registreren ? "Account aanmaken" : "Inloggen"}
        </button>

        <button
          type="button"
          onClick={() => {
            setRegistreren((r) => !r)
            setError(null)
          }}
          className="mt-5 w-full text-center text-sm text-inkt-zacht hover:text-terracotta transition"
        >
          {registreren
            ? "Heb je al een account? Log in"
            : "Nog geen familie op Fullkin? Begin hier"}
        </button>
      </form>
    </main>
  )
}
