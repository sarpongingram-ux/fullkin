"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { stelDroomIn, type DroomResultaat } from "./droom-acties"

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function MijnDroom({
  huidigeTitel,
  huidigStreefCents,
  opgehaaldCents,
}: {
  huidigeTitel: string | null
  huidigStreefCents: number | null
  opgehaaldCents: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [resultaat, actie, bezig] = useActionState<DroomResultaat | null, FormData>(
    stelDroomIn,
    null,
  )

  useEffect(() => {
    if (resultaat?.ok) {
      setOpen(false)
      router.refresh()
    }
  }, [resultaat, router])

  const heeftDroom = !!huidigeTitel && huidigStreefCents != null
  const pct = heeftDroom
    ? Math.min(100, Math.round((opgehaaldCents / huidigStreefCents!) * 100))
    : 0

  if (!open && heeftDroom) {
    return (
      <section className="fk-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black text-goud uppercase tracking-wide">
            ✨ Jouw droom
          </p>
          <button
            onClick={() => setOpen(true)}
            className="text-sm font-bold text-terracotta"
          >
            Aanpassen
          </button>
        </div>
        <p className="text-xl font-black text-inkt">{huidigeTitel}</p>
        <div className="fk-progress mt-3">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="text-base text-inkt-zacht mt-2 font-semibold">
          {euro(opgehaaldCents)} van {euro(huidigStreefCents!)} · {pct}%
          {pct >= 100 && ". Bereikt! 🎉"}
        </p>
      </section>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fk-btn fk-btn-secondary fk-btn-full"
      >
        ✨ Stel jouw droom in
      </button>
    )
  }

  return (
    <section className="fk-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-inkt text-lg">Jouw droom</h3>
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
            Wat is je droom? (één zin)
          </label>
          <input
            name="titel"
            defaultValue={huidigeTitel ?? ""}
            placeholder="Een fatbike"
            required
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>
        <div>
          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">
            Streefbedrag (€)
          </label>
          <input
            name="bedrag"
            type="number"
            step="1"
            min="1"
            defaultValue={huidigStreefCents != null ? huidigStreefCents / 100 : ""}
            placeholder="1200"
            required
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>
        {resultaat && !resultaat.ok && (
          <p className="text-base text-terracotta font-semibold">{resultaat.fout}</p>
        )}
        <button
          type="submit"
          disabled={bezig}
          className="fk-btn fk-btn-primary fk-btn-full"
        >
          {bezig ? "Bezig…" : heeftDroom ? "Droom bijwerken" : "Droom instellen"}
        </button>
      </form>
    </section>
  )
}
