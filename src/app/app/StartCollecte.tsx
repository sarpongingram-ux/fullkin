"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { startCollecte, type StartResultaat } from "./collecte-acties"

const momenten = [
  { waarde: "verjaardag", label: "Verjaardag" },
  { waarde: "ronde_verjaardag", label: "Ronde verjaardag (50, 70, 80)" },
  { waarde: "afstuderen", label: "Afstuderen" },
  { waarde: "huwelijk", label: "Huwelijk" },
  { waarde: "geboorte", label: "Geboorte" },
  { waarde: "zwemdiploma", label: "Zwemdiploma / A-diploma" },
  { waarde: "nieuwe_school", label: "Nieuwe school" },
  { waarde: "diaspora_mijlpaal", label: "Diaspora-mijlpaal" },
] as const

type Lid = { person_id: string; first_name: string; last_name: string; label: string }

export function StartCollecte({ leden }: { leden: Lid[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [resultaat, actie, bezig] = useActionState<StartResultaat | null, FormData>(
    startCollecte,
    null,
  )

  useEffect(() => {
    if (resultaat?.ok) {
      router.push(`/app/collecte/${resultaat.collectieId}`)
    }
  }, [resultaat, router])

  // Je mag een collecte starten voor je directe familie.
  const kandidaten = leden.filter((l) =>
    ["ouder", "kind", "partner", "broer of zus"].includes(l.label),
  )

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fk-btn fk-btn-secondary fk-btn-full"
      >
        ❤️ Start een collecte
      </button>
    )
  }

  return (
    <div className="bg-oppervlak rounded-2xl border border-rand p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-inkt">Start een collecte</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht text-sm hover:text-inkt"
        >
          Sluiten
        </button>
      </div>

      {kandidaten.length === 0 ? (
        <p className="text-sm text-inkt-zacht">
          Je kunt een collecte starten voor je directe familie (ouder, kind,
          partner, broer of zus). Voeg eerst zo iemand toe aan je kaart.
        </p>
      ) : (
        <form action={actie} className="space-y-3">
          <div>
            <label className="block text-sm text-inkt-zacht mb-1">Voor wie?</label>
            <select
              name="beneficiary_id"
              required
              className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
            >
              {kandidaten.map((l) => (
                <option key={l.person_id} value={l.person_id}>
                  {l.first_name} {l.last_name} ({l.label})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-inkt-zacht mb-1">
              Welk moment?
            </label>
            <select
              name="kind"
              required
              className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
            >
              {momenten.map((m) => (
                <option key={m.waarde} value={m.waarde}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <input
            name="titel"
            placeholder="Titel, bv. 'Verjaardag van opa'"
            required
            className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />

          <div>
            <label className="block text-sm text-inkt-zacht mb-1">Datum</label>
            <input
              name="occurs_on"
              type="date"
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
            {bezig ? "Bezig…" : "Collecte openen"}
          </button>
        </form>
      )}
    </div>
  )
}
