"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// De uitgenodigde claimt zijn gereserveerde plek. Als hij nog geen account
// heeft, maakt hij er hier een, en claimt daarna direct via het token.
export function Claimen({
  token,
  alIngelogd,
  voornaam,
}: {
  token: string
  alIngelogd: boolean
  voornaam: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  async function claim() {
    const supabase = createClient()
    const { data, error } = await supabase.rpc("claim_invite", {
      invite_token: token,
    })
    if (error) {
      setFout(error.message)
      return false
    }
    return !!data
  }

  async function ingelogdClaimen() {
    setBezig(true)
    setFout(null)
    if (await claim()) {
      router.push("/app")
      router.refresh()
    } else {
      setBezig(false)
    }
  }

  async function metGoogle() {
    setBezig(true)
    setFout(null)
    const supabase = createClient()
    // Kom na Google terug op deze uitnodiging, dan kan de plek geclaimd worden.
    const next = encodeURIComponent(`/welkom/${token}`)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    })
    if (error) {
      setFout("Inloggen met Google lukte niet. Probeer het opnieuw.")
      setBezig(false)
    }
  }

  async function aanmakenEnClaimen(e: React.FormEvent) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    const supabase = createClient()

    const { error: signErr } = await supabase.auth.signUp({ email, password })
    if (signErr) {
      setFout("Aanmaken mislukt: " + signErr.message)
      setBezig(false)
      return
    }

    // Als e-mailbevestiging aanstaat is er nog geen sessie; dan kan claimen niet
    // meteen. We proberen te claimen en tonen anders een duidelijke melding.
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      setFout(
        "Je account is aangemaakt. Bevestig je e-mail en open daarna de link nog een keer om je plek te claimen.",
      )
      setBezig(false)
      return
    }

    if (await claim()) {
      router.push("/app")
      router.refresh()
    } else {
      setBezig(false)
    }
  }

  if (alIngelogd) {
    return (
      <div>
        <button
          onClick={ingelogdClaimen}
          disabled={bezig}
          className="fk-btn fk-btn-primary fk-btn-full"
        >
          {bezig ? "Bezig…" : `Claim mijn plek als ${voornaam}`}
        </button>
        {fout && <p className="text-terracotta font-semibold mt-3">{fout}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={metGoogle}
        disabled={bezig}
        className="fk-btn fk-btn-full bg-white text-inkt disabled:opacity-60"
        style={{ border: "2px solid var(--rand)" }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Kom binnen met Google
      </button>

      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-rand" />
        <span className="text-sm text-inkt-zacht font-semibold">of met e-mail</span>
        <span className="h-px flex-1 bg-rand" />
      </div>

      <form onSubmit={aanmakenEnClaimen} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Je e-mail"
        required
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Kies een wachtwoord"
        required
        minLength={8}
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
      />
      {fout && <p className="text-terracotta font-semibold">{fout}</p>}
      <button
        type="submit"
        disabled={bezig}
        className="fk-btn fk-btn-primary fk-btn-full"
      >
        {bezig ? "Bezig…" : "Binnenkomen bij mijn familie"}
      </button>
      </form>
    </div>
  )
}
