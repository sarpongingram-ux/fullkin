"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { stelOverlijden } from "./acties"

function datum(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function OverlijdenKnop({
  personId,
  voornaam,
  diedOn,
}: {
  personId: string
  voornaam: string
  diedOn: string | null
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [wanneer, setWanneer] = useState("")
  const [fout, setFout] = useState<string | null>(null)

  function zet(datum: string | null) {
    setFout(null)
    start(async () => {
      const res = await stelOverlijden(personId, datum)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  if (diedOn) {
    return (
      <section className="fk-card">
        <p className="font-black text-inkt">🕯️ Overleden</p>
        <p className="text-sm text-inkt-zacht mt-1">
          {voornaam} overleed op {datum(diedOn)}. {voornaam} blijft voor altijd
          onderdeel van jullie familie.
        </p>
        <button
          onClick={() => zet(null)}
          disabled={bezig}
          className="mt-3 text-sm font-bold text-inkt-zacht hover:text-terracotta transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Ongedaan maken"}
        </button>
        {fout && <p className="text-terracotta font-semibold mt-2">{fout}</p>}
      </section>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-sm font-bold text-inkt-zacht hover:text-inkt transition py-2"
      >
        🕯️ {voornaam} is overleden
      </button>
    )
  }

  return (
    <section className="fk-card">
      <p className="font-black text-inkt">🕯️ Is {voornaam} overleden?</p>
      <p className="text-sm text-inkt-zacht mt-1 mb-3">
        {voornaam} blijft op de familiekaart en in jullie herinneringen.
      </p>
      <label className="block text-sm text-inkt-zacht mb-1 font-semibold">
        Overleden op <span className="font-normal">(optioneel)</span>
      </label>
      <input
        type="date"
        value={wanneer}
        onChange={(e) => setWanneer(e.target.value)}
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
          onClick={() => zet(wanneer || null)}
          disabled={bezig}
          className="fk-btn flex-1 text-white"
          style={{ background: "var(--inkt)" }}
        >
          {bezig ? "Bezig…" : "Vastleggen"}
        </button>
      </div>
    </section>
  )
}
