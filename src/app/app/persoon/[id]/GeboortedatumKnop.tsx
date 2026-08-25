"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { stelGeboortedatum } from "./acties"

export function GeboortedatumKnop({
  personId,
  voornaam,
  bornOn,
  ikZelf,
}: {
  personId: string
  voornaam: string
  bornOn: string | null
  ikZelf: boolean
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [datum, setDatum] = useState(bornOn ?? "")
  const [fout, setFout] = useState<string | null>(null)

  function opslaan() {
    setFout(null)
    start(async () => {
      const res = await stelGeboortedatum(personId, datum || null)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    // Ontbreekt de datum? Dan een opvallender zetje (voedt de cadeaupot).
    if (!bornOn) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-center text-sm font-bold text-terracotta hover:text-inkt transition py-2"
        >
          🎂 {ikZelf ? "Vul je geboortedatum in" : `Geboortedatum van ${voornaam} invullen`}
        </button>
      )
    }
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-sm font-bold text-inkt-zacht hover:text-inkt transition py-2"
      >
        🎂 Geboortedatum aanpassen
      </button>
    )
  }

  return (
    <section className="fk-card">
      <p className="font-black text-inkt mb-1">
        🎂 Wanneer is {ikZelf ? "jouw" : `${voornaam}'s`} verjaardag?
      </p>
      <p className="text-sm text-inkt-zacht mb-3">
        Met een geboortedatum opent de familie automatisch een cadeaupot rond de
        verjaardag — zo mist niemand het.
      </p>
      <input
        type="date"
        value={datum}
        onChange={(e) => setDatum(e.target.value)}
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
      />
      {fout && <p className="text-terracotta font-semibold mb-2">{fout}</p>}
      <div className="flex gap-3">
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
