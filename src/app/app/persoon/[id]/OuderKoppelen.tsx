"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { koppelOuder } from "./acties"

type Kandidaat = { id: string; naam: string }

const aarden = [
  { waarde: "biological", label: "Biologische ouder" },
  { waarde: "step", label: "Stiefouder" },
  { waarde: "foster", label: "Opvoedouder" },
  { waarde: "adoptive", label: "Adoptieouder" },
] as const

export function OuderKoppelen({
  kindId,
  voornaam,
  kandidaten,
}: {
  kindId: string
  voornaam: string
  kandidaten: Kandidaat[]
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [ouderId, setOuderId] = useState("")
  const [aard, setAard] = useState<string>("biological")
  const [fout, setFout] = useState<string | null>(null)

  function opslaan() {
    setFout(null)
    start(async () => {
      const res = await koppelOuder(kindId, ouderId, aard)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      setOpen(false)
      setOuderId("")
      setAard("biological")
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-sm font-bold text-inkt-zacht hover:text-inkt transition py-2"
      >
        ➕ Ouder koppelen
      </button>
    )
  }

  return (
    <section className="fk-card">
      <p className="font-black text-inkt mb-1">➕ Ouder koppelen</p>
      <p className="text-sm text-inkt-zacht mb-3">
        Kies iemand die al op de kaart staat als ouder van {voornaam}.
        Bijvoorbeeld een opvoedvader of stiefmoeder.
      </p>

      <label className="block text-sm text-inkt-zacht mb-1 font-semibold">
        Wie is de ouder?
      </label>
      <select
        value={ouderId}
        onChange={(e) => setOuderId(e.target.value)}
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
      >
        <option value="">Kies een familielid…</option>
        {kandidaten.map((k) => (
          <option key={k.id} value={k.id}>
            {k.naam}
          </option>
        ))}
      </select>

      <label className="block text-sm text-inkt-zacht mb-1 font-semibold">
        Wat voor ouder?
      </label>
      <select
        value={aard}
        onChange={(e) => setAard(e.target.value)}
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
      >
        {aarden.map((a) => (
          <option key={a.waarde} value={a.waarde}>
            {a.label}
          </option>
        ))}
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
        <button
          onClick={opslaan}
          disabled={bezig || !ouderId}
          className="fk-btn fk-btn-primary flex-1 disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Koppelen"}
        </button>
      </div>
    </section>
  )
}
