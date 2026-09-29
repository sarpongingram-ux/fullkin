"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { stelGeslacht } from "./acties"

export function GeslachtKnop({
  personId,
  voornaam,
  geslacht,
  ikZelf,
}: {
  personId: string
  voornaam: string
  geslacht: string | null
  ikZelf: boolean
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [g, setG] = useState(geslacht ?? "")
  const [fout, setFout] = useState<string | null>(null)

  function opslaan() {
    setFout(null)
    start(async () => {
      const res = await stelGeslacht(personId, g || null)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  const huidig = geslacht === "man" ? "Man" : geslacht === "vrouw" ? "Vrouw" : null

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-sm font-bold text-inkt-zacht hover:text-inkt transition py-2"
      >
        👤{" "}
        {huidig
          ? `Geslacht: ${huidig} (aanpassen)`
          : ikZelf
            ? "Vul je geslacht in"
            : `Geslacht van ${voornaam} invullen`}
      </button>
    )
  }

  return (
    <section className="fk-card">
      <p className="font-black text-inkt mb-1">
        👤 Geslacht {ikZelf ? "van jou" : `van ${voornaam}`}
      </p>
      <p className="text-sm text-inkt-zacht mb-3">
        Optioneel. Hiermee worden relatie-labels persoonlijker (oom/tante, neef/nicht,
        opa/oma) in plaats van neutraal.
      </p>
      <select
        value={g}
        onChange={(e) => setG(e.target.value)}
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
      >
        <option value="">— (neutraal)</option>
        <option value="man">Man</option>
        <option value="vrouw">Vrouw</option>
      </select>
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
        <button onClick={opslaan} disabled={bezig} className="fk-btn fk-btn-primary flex-1">
          {bezig ? "Bezig…" : "Opslaan"}
        </button>
      </div>
    </section>
  )
}
