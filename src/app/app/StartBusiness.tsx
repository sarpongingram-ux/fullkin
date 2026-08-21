"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { startBusiness } from "./business-acties"

type Res = { ok: true } | { ok: false; fout: string }

export function StartBusiness() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [res, actie, bezig] = useActionState<Res | null, FormData>(
    startBusiness,
    null,
  )

  useEffect(() => {
    if (res?.ok) {
      setOpen(false)
      router.refresh()
    }
  }, [res, router])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-blauw/60 bg-oppervlak py-4 text-blauw font-medium hover:bg-klei/50 transition mb-4"
      >
        📈 Dien een Business Droom in
      </button>
    )
  }

  return (
    <section className="bg-oppervlak rounded-2xl border border-rand p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-inkt">Business Droom indienen</h3>
        <button onClick={() => setOpen(false)} className="text-inkt-zacht text-sm hover:text-inkt">
          Sluiten
        </button>
      </div>
      <form action={actie} className="space-y-3">
        <input
          name="name"
          placeholder="Naam, bv. 'Kippenboerderij Kumasi'"
          required
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
        />
        <textarea
          name="description"
          placeholder="Beschrijf je plan…"
          required
          rows={3}
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta resize-none"
        />
        <div className="flex gap-2">
          <input
            name="target"
            type="number"
            step="1"
            min="1"
            placeholder="Doelbedrag €"
            required
            className="flex-1 rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />
          <input
            name="revenue"
            type="number"
            step="1"
            min="0"
            placeholder="Verwachte omzet €/jaar"
            className="flex-1 rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />
        </div>
        <input
          name="give_back"
          placeholder="Hoe geef je terug aan de familie?"
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
        />
        {res && !res.ok && <p className="text-sm text-terracotta">{res.fout}</p>}
        <button
          type="submit"
          disabled={bezig}
          className="w-full rounded-full bg-terracotta py-2.5 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Indienen. De familie stemt."}
        </button>
      </form>
    </section>
  )
}
