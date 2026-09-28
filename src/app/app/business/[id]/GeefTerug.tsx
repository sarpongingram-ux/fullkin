"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { geefTerugAanFamilie } from "../../business-acties"

// Formulier waarmee de ondernemer echt geld teruggeeft aan de familie(pot).
export function GeefTerug({ businessId }: { businessId: string }) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [euro, setEuro] = useState("")
  const [fout, setFout] = useState<string | null>(null)

  function verstuur() {
    setFout(null)
    start(async () => {
      const fd = new FormData()
      fd.set("bedrag", euro)
      const res = await geefTerugAanFamilie(businessId, fd)
      // Bij succes met Stripe eindigt de action in een redirect (geen return hier).
      if (!res.ok) return setFout(res.fout)
      if (res.devPending) {
        setFout("Betalen is in deze omgeving uitgeschakeld (geen Stripe).")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-3 border-t border-rand pt-3">
      <div className="flex items-end gap-2">
        <input
          type="number"
          step="1"
          min="1"
          value={euro}
          onChange={(e) => setEuro(e.target.value)}
          placeholder="Bedrag €"
          className="flex-1 rounded-lg border border-rand bg-white px-3 py-2 text-inkt outline-none focus:border-terracotta"
        />
        <button
          onClick={verstuur}
          disabled={bezig || !euro}
          className="fk-btn fk-btn-primary text-sm py-2.5 px-4 shrink-0"
        >
          {bezig ? "…" : "Geef terug"}
        </button>
      </div>
      {fout && <p className="text-terracotta text-sm font-semibold mt-2">{fout}</p>}
    </div>
  )
}
