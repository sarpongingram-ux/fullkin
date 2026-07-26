"use client"

import { useActionState, useState } from "react"
import { doneerAanPot, type DonatieResultaat } from "./acties"

export function Doneren() {
  const [open, setOpen] = useState(false)
  const [res, actie, bezig] = useActionState<DonatieResultaat | null, FormData>(
    doneerAanPot,
    null,
  )

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-terracotta py-3 text-white font-medium hover:bg-terracotta-diep transition"
      >
        Doneer aan de Pot
      </button>
    )
  }

  return (
    <div className="bg-oppervlak rounded-2xl border border-rand p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-inkt">Doneer aan de Pot</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht text-sm hover:text-inkt"
        >
          Sluiten
        </button>
      </div>
      <form action={actie} className="space-y-3">
        <div>
          <label className="block text-sm text-inkt-zacht mb-1">Bedrag (€)</label>
          <input
            name="bedrag"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="25"
            required
            className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />
          <p className="text-xs text-inkt-zacht mt-1">
            Je donatie is altijd anoniem. Niemand ziet wie of hoeveel — alleen
            de Pot groeit.
          </p>
        </div>

        {res && !res.ok && <p className="text-sm text-terracotta">{res.fout}</p>}
        {res?.ok && res.devPending && (
          <p className="text-sm text-goud">
            Donatie geregistreerd (dev-modus). Zodra Stripe is gekoppeld gaat de
            echte betaling lopen.
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="w-full rounded-full bg-terracotta py-2.5 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Doneren"}
        </button>
      </form>
    </div>
  )
}
