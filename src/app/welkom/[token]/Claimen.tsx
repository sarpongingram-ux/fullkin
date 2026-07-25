"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

// De uitgenodigde claimt zijn gereserveerde plek. Als hij nog geen account
// heeft, maakt hij er hier een — en claimt daarna direct via het token.
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
          className="w-full rounded-full bg-terracotta py-3 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : `Claim mijn plek als ${voornaam}`}
        </button>
        {fout && <p className="text-terracotta text-sm mt-3">{fout}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={aanmakenEnClaimen} className="space-y-3">
      <p className="text-sm text-inkt-zacht">
        Maak je account om binnen te komen:
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Je e-mail"
        required
        className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Kies een wachtwoord"
        required
        minLength={8}
        className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
      />
      {fout && <p className="text-terracotta text-sm">{fout}</p>}
      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-full bg-terracotta py-3 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
      >
        {bezig ? "Bezig…" : "Binnenkomen bij mijn familie"}
      </button>
    </form>
  )
}
