"use client"

import { useActionState, useState } from "react"
import { doneerAanPot, type DonatieResultaat } from "./acties"
import { Confetti } from "@/components/Confetti"

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
        className="fk-btn fk-btn-primary fk-btn-full"
      >
        💛 Doneer aan de pot
      </button>
    )
  }

  return (
    <div className="fk-card">
      {res?.ok && <Confetti />}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-inkt text-lg">Doneer aan de pot</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht font-bold hover:text-inkt"
        >
          Sluiten
        </button>
      </div>
      <form action={actie} className="space-y-4">
        <div>
          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">
            Bedrag (€)
          </label>
          <input
            name="bedrag"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="25"
            required
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
          <p className="text-sm text-inkt-zacht mt-2">
            Je donatie is altijd anoniem. Niemand ziet wie of hoeveel. Alleen
            de pot groeit.
          </p>
        </div>

        {res && !res.ok && (
          <p className="text-terracotta font-semibold">{res.fout}</p>
        )}
        {res?.ok && res.devPending && (
          <p className="text-goud font-semibold">
            Donatie geregistreerd (dev-modus). Zodra Stripe is gekoppeld gaat de
            echte betaling lopen.
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="fk-btn fk-btn-primary fk-btn-full"
        >
          {bezig ? "Bezig…" : "Doneren"}
        </button>
      </form>
    </div>
  )
}
