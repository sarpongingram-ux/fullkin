"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { voegFamilielidToe } from "../acties"

type StapKey = "moeder" | "vader" | "kinderen" | "broerzus"

const STAPPEN: {
  key: StapKey
  relatie: "ouder" | "kind" | "broer_zus"
  titel: string
  onder: string
  meervoud: boolean
  emoji: string
}[] = [
  { key: "moeder", relatie: "ouder", titel: "Wie is je moeder?", onder: "Je hoeft geen stamboom te tekenen — vul in wat je weet.", meervoud: false, emoji: "👩🏾" },
  { key: "vader", relatie: "ouder", titel: "Wie is je vader?", onder: "Fullkin rekent de rest van de familie zelf uit.", meervoud: false, emoji: "👨🏾" },
  { key: "kinderen", relatie: "kind", titel: "Heb je kinderen?", onder: "Voeg er zoveel toe als je wilt, of sla over.", meervoud: true, emoji: "🧒🏾" },
  { key: "broerzus", relatie: "broer_zus", titel: "Heb je broers of zussen?", onder: "Ze worden vanzelf gekoppeld via jullie ouders.", meervoud: true, emoji: "🧑🏾" },
]

export function Opbouw() {
  const router = useRouter()
  const [i, setI] = useState(0)
  const [voornaam, setVoornaam] = useState("")
  const [achternaam, setAchternaam] = useState("")
  const [toegevoegd, setToegevoegd] = useState(0)
  const [bezig, start] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  const stap = STAPPEN[i]
  const laatste = i === STAPPEN.length - 1

  function volgende() {
    setVoornaam("")
    setAchternaam("")
    setFout(null)
    if (laatste) router.push("/app")
    else setI((n) => n + 1)
  }

  function voegToe(danVolgende: boolean) {
    if (!voornaam.trim()) {
      setFout("Vul minstens een voornaam in.")
      return
    }
    setFout(null)
    start(async () => {
      const fd = new FormData()
      fd.set("voornaam", voornaam.trim())
      fd.set("achternaam", achternaam.trim())
      fd.set("relatie", stap.relatie)
      const res = await voegFamilielidToe(null, fd)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      setToegevoegd((n) => n + 1)
      setVoornaam("")
      setAchternaam("")
      if (danVolgende) volgende()
    })
  }

  return (
    <main className="max-w-md mx-auto px-5 py-10 min-h-screen flex flex-col">
      {/* Voortgang */}
      <div className="flex items-center gap-1.5 mb-8">
        {STAPPEN.map((s, n) => (
          <div
            key={s.key}
            className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-terracotta" : "bg-rand"}`}
          />
        ))}
      </div>

      <div className="flex-1">
        <p className="text-5xl mb-4">{stap.emoji}</p>
        <h1 className="text-3xl font-black text-inkt leading-tight">{stap.titel}</h1>
        <p className="text-inkt-zacht mt-2">{stap.onder}</p>

        <div className="mt-6 space-y-2">
          <input
            value={voornaam}
            onChange={(e) => setVoornaam(e.target.value)}
            placeholder="Voornaam"
            autoFocus
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3.5 text-inkt text-base outline-none focus:border-terracotta"
          />
          <input
            value={achternaam}
            onChange={(e) => setAchternaam(e.target.value)}
            placeholder="Achternaam (optioneel)"
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3.5 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>

        {fout && <p className="text-terracotta font-semibold mt-3">{fout}</p>}

        {stap.meervoud ? (
          <div className="mt-4 space-y-2">
            <button
              onClick={() => voegToe(false)}
              disabled={bezig}
              className="fk-btn fk-btn-secondary fk-btn-full"
            >
              {bezig ? "Bezig…" : "+ Toevoegen"}
            </button>
            <button
              onClick={volgende}
              disabled={bezig}
              className="fk-btn fk-btn-primary fk-btn-full"
            >
              {laatste ? "Klaar — bekijk mijn familie" : "Volgende"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <button
              onClick={() => voegToe(true)}
              disabled={bezig}
              className="fk-btn fk-btn-primary fk-btn-full"
            >
              {bezig ? "Bezig…" : "Toevoegen"}
            </button>
            <button
              onClick={volgende}
              disabled={bezig}
              className="w-full text-center text-sm font-bold text-inkt-zacht hover:text-inkt py-2"
            >
              Overslaan
            </button>
          </div>
        )}
      </div>

      {/* Levend gevoel: de familie groeit terwijl je invult */}
      {toegevoegd > 0 && (
        <p className="text-center text-sm font-bold text-groen mt-6 fk-rise">
          🌱 {toegevoegd} {toegevoegd === 1 ? "familielid" : "familieleden"}{" "}
          toegevoegd
        </p>
      )}
    </main>
  )
}
