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
      <section className="bg-oppervlak rounded-2xl border border-goud/40 p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-goud uppercase tracking-wide">
            Mijn droom
          </p>
          <button
            onClick={() => setOpen(true)}
            className="text-xs text-inkt-zacht hover:text-inkt"
          >
            Aanpassen
          </button>
        </div>
        <p className="text-lg font-semibold text-inkt">{huidigeTitel}</p>
        <div className="mt-3 h-2.5 rounded-full bg-klei overflow-hidden">
          <div
            className="h-full rounded-full bg-goud transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-inkt-zacht mt-1.5">
          {euro(opgehaaldCents)} van {euro(huidigStreefCents!)} · {pct}%
          {pct >= 100 && " — bereikt! 🎉"}
        </p>
      </section>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-goud/60 bg-oppervlak py-4 text-goud font-medium hover:bg-klei/50 transition mb-4"
      >
        ✨ Stel jouw droom in
      </button>
    )
  }

  return (
    <section className="bg-oppervlak rounded-2xl border border-rand p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-inkt">Jouw droom</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht text-sm hover:text-inkt"
        >
          Sluiten
        </button>
      </div>
      <form action={actie} className="space-y-3">
        <div>
          <label className="block text-sm text-inkt-zacht mb-1">
            Wat is je droom? (één zin)
          </label>
          <input
            name="titel"
            defaultValue={huidigeTitel ?? ""}
            placeholder="Een fatbike"
            required
            className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />
        </div>
        <div>
          <label className="block text-sm text-inkt-zacht mb-1">
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
            className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />
        </div>
        {resultaat && !resultaat.ok && (
          <p className="text-sm text-terracotta">{resultaat.fout}</p>
        )}
        <button
          type="submit"
          disabled={bezig}
          className="w-full rounded-full bg-terracotta py-2.5 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : heeftDroom ? "Droom bijwerken" : "Droom instellen"}
        </button>
      </form>
    </section>
  )
}
