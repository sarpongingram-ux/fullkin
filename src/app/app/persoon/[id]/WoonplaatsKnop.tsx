"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { stelWoonplaats } from "./acties"

export function WoonplaatsKnop({
  personId,
  voornaam,
  stad,
  land,
}: {
  personId: string
  voornaam: string
  stad: string | null
  land: string | null
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [nieuweStad, setNieuweStad] = useState(stad ?? "")
  const [nieuwLand, setNieuwLand] = useState(land ?? "")
  const [fout, setFout] = useState<string | null>(null)

  function opslaan() {
    setFout(null)
    start(async () => {
      const res = await stelWoonplaats(personId, nieuweStad, nieuwLand)
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
        📍 {land ? "Woonplaats aanpassen" : `Woonplaats van ${voornaam} invullen`}
      </button>
    )
  }

  return (
    <section className="fk-card">
      <p className="font-black text-inkt mb-1">📍 Waar woont {voornaam}?</p>
      <p className="text-sm text-inkt-zacht mb-3">
        Het land bepaalt bij welke takchat {voornaam} hoort (bijv. de
        Nederland-tak).
      </p>
      <div className="flex gap-2 mb-3">
        <input
          value={nieuweStad}
          onChange={(e) => setNieuweStad(e.target.value)}
          placeholder="Stad"
          className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        />
        <input
          value={nieuwLand}
          onChange={(e) => setNieuwLand(e.target.value)}
          placeholder="Land"
          className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        />
      </div>
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
