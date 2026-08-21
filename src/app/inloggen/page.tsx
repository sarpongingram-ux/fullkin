"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export default function Inloggen() {
  const [registreren, setRegistreren] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("fout") === "oauth") {
      setError("Inloggen met Google lukte niet. Probeer het opnieuw.")
    }
  }, [])

  async function metGoogle() {
    setBezig(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/app`,
      },
    })
    if (error) {
      setError("Inloggen met Google lukte niet. Probeer het opnieuw.")
      setBezig(false)
    }
    // Anders stuurt de browser nu door naar Google.
  }

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
      if (!data.session) {
        setError("Check je e-mail om je account te bevestigen en log daarna in.")
        setBezig(false)
        return
      }
      window.location.assign("/start")
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Inloggen mislukt. Controleer je gegevens.")
      setBezig(false)
      return
    }
    window.location.assign("/app")
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm fk-card-white" style={{ padding: 28 }}>
        <p className="text-terracotta font-extrabold tracking-[0.3em] text-xs text-center mb-2">
          FULLKIN
        </p>
        <h1 className="text-2xl font-black text-center text-inkt mb-6">
          {registreren ? "Begin bij je familie" : "Welkom terug"}
        </h1>

        {/* Snelste manier: Google */}
        <button
          type="button"
          onClick={metGoogle}
          disabled={bezig}
          className="fk-btn fk-btn-full bg-white text-inkt disabled:opacity-60"
          style={{ border: "2px solid var(--rand)" }}
        >
          <GoogleLogo />
          Doorgaan met Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <span className="h-px flex-1 bg-rand" />
          <span className="text-sm text-inkt-zacht font-semibold">of met e-mail</span>
          <span className="h-px flex-1 bg-rand" />
        </div>

        <form onSubmit={verstuur}>
          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 mb-4 text-inkt text-base outline-none focus:border-terracotta"
            required
          />

          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Wachtwoord</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 mb-2 text-inkt text-base outline-none focus:border-terracotta"
            required
          />
          {registreren ? (
            <p className="text-sm text-inkt-zacht mb-4">Minimaal 6 tekens.</p>
          ) : (
            <div className="mb-4" />
          )}

          {error && <p className="text-terracotta font-semibold mb-4">{error}</p>}

          <button
            type="submit"
            disabled={bezig}
            className="fk-btn fk-btn-primary fk-btn-full"
          >
            {bezig ? "Bezig…" : registreren ? "Account aanmaken" : "Inloggen"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setRegistreren((r) => !r)
            setError(null)
          }}
          className="mt-5 w-full text-center font-bold text-inkt-zacht hover:text-terracotta transition"
        >
          {registreren
            ? "Heb je al een account? Log in"
            : "Nog geen familie op Fullkin? Begin hier"}
        </button>
      </div>
    </main>
  )
}
