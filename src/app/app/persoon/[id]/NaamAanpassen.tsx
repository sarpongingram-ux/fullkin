"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { stelNaam } from "./acties"

export function NaamAanpassen({
  personId,
  voornaam,
  achternaam,
  onbekend,
}: {
  personId: string
  voornaam: string
  achternaam: string
  onbekend: boolean
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [voor, setVoor] = useState(onbekend ? "" : voornaam)
  const [achter, setAchter] = useState(achternaam)
  const [fout, setFout] = useState<string | null>(null)

  function opslaan() {
    setFout(null)
    start(async () => {
      const res = await stelNaam(personId, voor, achter)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-sm font-bold text-inkt-zacht hover:text-inkt transition py-2"
      >
        ✏️ {onbekend ? "Naam invullen" : "Naam aanpassen"}
      </button>
    )
  }

  return (
    <section className="fk-card">
      <p className="font-black text-inkt mb-1">✏️ Naam invullen</p>
      {onbekend && (
        <p className="text-sm text-inkt-zacht mb-3">
          Dit is een automatisch aangemaakte gedeelde ouder. Geef 'm hier de
          echte naam, bijvoorbeeld die van je opa of oma.
        </p>
      )}
      <div className="flex gap-2">
        <input
          value={voor}
          onChange={(e) => setVoor(e.target.value)}
          placeholder="Voornaam"
          className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        />
        <input
          value={achter}
          onChange={(e) => setAchter(e.target.value)}
          placeholder="Achternaam"
          className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        />
      </div>
      {fout && <p className="text-terracotta font-semibold mt-2">{fout}</p>}
      <div className="flex gap-3 mt-3">
        <button
          onClick={() => {
            setOpen(false)
            setFout(null)
          }}
          className="fk-btn fk-btn-secondary flex-1"
        >
          Terug
        </button>
        <button
          onClick={opslaan}
          disabled={bezig}
          className="fk-btn fk-btn-primary flex-1"
        >
          {bezig ? "Bezig…" : "Opslaan"}
        </button>
      </div>
    </section>
  )
}
