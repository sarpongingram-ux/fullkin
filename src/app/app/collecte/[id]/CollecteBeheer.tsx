"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { stopCollecte, verwijderCollecte } from "../../collecte-acties"

export function CollecteBeheer({
  collectieId,
  open,
  geenBijdragen,
}: {
  collectieId: string
  open: boolean
  geenBijdragen: boolean
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  function stoppen() {
    if (!confirm("Deze collecte stoppen? Er kan daarna niet meer worden bijgedragen.")) return
    setFout(null)
    start(async () => {
      const res = await stopCollecte(collectieId)
      if (!res.ok) return setFout(res.fout)
      router.refresh()
    })
  }

  function verwijderen() {
    if (!confirm("Deze collecte verwijderen? Dit kan niet ongedaan worden gemaakt.")) return
    setFout(null)
    start(async () => {
      const res = await verwijderCollecte(collectieId)
      if (!res.ok) return setFout(res.fout)
      router.push("/app")
    })
  }

  return (
    <section className="fk-card">
      <p className="font-black text-inkt mb-1">Collecte beheren</p>
      <p className="text-sm text-inkt-zacht mb-3">
        {open
          ? "Stop de collecte zodat er niet meer bijgedragen wordt. Verwijderen kan zolang er nog geen bijdragen zijn."
          : "Deze collecte is gesloten."}
      </p>
      {fout && <p className="text-terracotta font-semibold mb-2">{fout}</p>}
      <div className="flex gap-3">
        {open && (
          <button
            onClick={stoppen}
            disabled={bezig}
            className="fk-btn fk-btn-secondary flex-1"
          >
            {bezig ? "Bezig…" : "Stop collecte"}
          </button>
        )}
        {geenBijdragen && (
          <button
            onClick={verwijderen}
            disabled={bezig}
            className="fk-btn flex-1 text-terracotta font-bold border-2 border-terracotta/40 rounded-2xl"
          >
            {bezig ? "Bezig…" : "Verwijderen"}
          </button>
        )}
      </div>
    </section>
  )
}
