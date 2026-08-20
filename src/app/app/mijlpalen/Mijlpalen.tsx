"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  voegMijlpaalToe,
  startCollecteVoorMijlpaal,
  type MijlpaalResultaat,
} from "./acties"

type Lid = { id: string; naam: string }

const soorten: { waarde: string; label: string }[] = [
  { waarde: "geboorte", label: "👶 Geboorte" },
  { waarde: "verjaardag", label: "🎂 Verjaardag" },
  { waarde: "ronde_verjaardag", label: "🎉 Ronde verjaardag" },
  { waarde: "zwemdiploma", label: "🏊 Zwemdiploma" },
  { waarde: "nieuwe_school", label: "🎒 Nieuwe school" },
  { waarde: "afstuderen", label: "🎓 Afstuderen" },
  { waarde: "huwelijk", label: "💍 Huwelijk" },
  { waarde: "diaspora_mijlpaal", label: "✈️ Diaspora-mijlpaal" },
  { waarde: "overlijden", label: "🕯️ Overlijden" },
]

export function MijlpaalToevoegen({ leden }: { leden: Lid[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [res, actie, bezig] = useActionState<MijlpaalResultaat | null, FormData>(
    async (v, fd) => {
      const r = await voegMijlpaalToe(v, fd)
      if (r.ok) {
        setOpen(false)
        router.refresh()
      }
      return r
    },
    null,
  )

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fk-btn fk-btn-secondary fk-btn-full"
      >
        🎉 Voeg een mijlpaal toe
      </button>
    )
  }

  return (
    <div className="fk-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-inkt text-lg">Nieuwe mijlpaal</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht font-bold hover:text-inkt"
        >
          Sluiten
        </button>
      </div>
      <form action={actie} className="space-y-4">
        <div>
          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Voor wie?</label>
          <select
            name="person_id"
            required
            defaultValue=""
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          >
            <option value="" disabled>
              Kies een familielid…
            </option>
            {leden.map((l) => (
              <option key={l.id} value={l.id}>
                {l.naam}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Wat?</label>
          <select
            name="kind"
            required
            defaultValue=""
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          >
            <option value="" disabled>
              Kies een soort…
            </option>
            {soorten.map((s) => (
              <option key={s.waarde} value={s.waarde}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <input
          name="titel"
          placeholder="Titel, bijv. “Ama slaagt voor haar rijbewijs”"
          required
          maxLength={120}
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        />

        <div>
          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Wanneer?</label>
          <input
            name="occurs_on"
            type="date"
            required
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>

        {res && !res.ok && <p className="text-terracotta font-semibold">{res.fout}</p>}

        <button
          type="submit"
          disabled={bezig}
          className="fk-btn fk-btn-primary fk-btn-full"
        >
          {bezig ? "Bezig…" : "Mijlpaal toevoegen"}
        </button>
      </form>
    </div>
  )
}

// Bij een mijlpaal een collecte starten (of naar de bestaande gaan).
export function MijlpaalCollecte({
  eventId,
  collectionId,
  voornaam,
}: {
  eventId: string
  collectionId: string | null
  voornaam: string
}) {
  const [bezig, start] = useTransition()

  if (collectionId) {
    return (
      <Link
        href={`/app/collecte/${collectionId}`}
        className="inline-block text-sm text-terracotta hover:underline"
      >
        Bekijk de collecte →
      </Link>
    )
  }

  return (
    <button
      onClick={() => start(() => startCollecteVoorMijlpaal(eventId))}
      disabled={bezig}
      className="text-sm text-terracotta hover:underline disabled:opacity-60"
    >
      {bezig ? "Bezig…" : `Start een collecte voor ${voornaam} →`}
    </button>
  )
}
