"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { stelKindStatus } from "./acties"

export function KindBeheer({
  personId,
  voornaam,
  bornOn,
  isKind,
}: {
  personId: string
  voornaam: string
  bornOn: string | null
  isKind: boolean
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [datum, setDatum] = useState(bornOn ?? "")
  const [fout, setFout] = useState<string | null>(null)

  function zet(kind: boolean) {
    setFout(null)
    start(async () => {
      const res = await stelKindStatus(personId, datum || null, kind)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      router.refresh()
    })
  }

  if (isKind) {
    return (
      <section className="fk-card">
        <p className="font-black text-inkt">👶 Kind · beheerd door jou</p>
        <p className="text-sm text-inkt-zacht mt-1">
          {voornaam} heeft geen eigen account of verplichtingen. Vanaf 16 kan{" "}
          {voornaam} zelf meedoen.
        </p>
        <button
          onClick={() => zet(false)}
          disabled={bezig}
          className="mt-3 font-bold text-inkt-zacht hover:text-terracotta transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Kind-status weghalen"}
        </button>
        {fout && <p className="text-terracotta font-semibold mt-2">{fout}</p>}
      </section>
    )
  }

  return (
    <section className="fk-card">
      <p className="font-black text-inkt">Is {voornaam} een kind?</p>
      <p className="text-sm text-inkt-zacht mt-1 mb-3">
        Onder 16 wordt {voornaam} een profiel dat jij beheert: geen eigen account,
        geen uitnodiging, geen bijdragen.
      </p>
      <label className="block text-sm text-inkt-zacht mb-1 font-semibold">
        Geboortedatum <span className="font-normal">(optioneel)</span>
      </label>
      <input
        type="date"
        value={datum}
        onChange={(e) => setDatum(e.target.value)}
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
      />
      <button
        onClick={() => zet(true)}
        disabled={bezig}
        className="fk-btn fk-btn-secondary fk-btn-full"
      >
        {bezig ? "Bezig…" : "👶 Markeer als kind (onder 16)"}
      </button>
      {fout && <p className="text-terracotta font-semibold mt-2">{fout}</p>}
    </section>
  )
}
