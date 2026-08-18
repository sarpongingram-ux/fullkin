"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { voegFamilielidToe, type ToevoegResultaat } from "./acties"

const relaties = [
  { waarde: "ouder", label: "Mijn ouder" },
  { waarde: "kind", label: "Mijn kind" },
  { waarde: "partner", label: "Mijn partner" },
  { waarde: "broer_zus", label: "Mijn broer of zus" },
] as const

export function FamilielidToevoegen() {
  const [open, setOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [resultaat, actie, bezig] = useActionState<
    ToevoegResultaat | null,
    FormData
  >(voegFamilielidToe, null)

  // Na een geslaagde toevoeging: formulier leegmaken en sluiten.
  useEffect(() => {
    if (resultaat?.ok) {
      formRef.current?.reset()
      const t = setTimeout(() => setOpen(false), 1200)
      return () => clearTimeout(t)
    }
  }, [resultaat])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fk-btn fk-btn-primary fk-btn-full"
      >
        ➕ Familielid toevoegen
      </button>
    )
  }

  return (
    <div className="bg-oppervlak rounded-2xl border border-rand p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-inkt">Familielid toevoegen</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht text-sm hover:text-inkt"
        >
          Sluiten
        </button>
      </div>

      <form ref={formRef} action={actie} className="space-y-3">
        <div className="flex gap-2">
          <input
            name="voornaam"
            placeholder="Voornaam"
            required
            className="flex-1 rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />
          <input
            name="achternaam"
            placeholder="Achternaam"
            required
            className="flex-1 rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />
        </div>

        <input
          name="stad"
          placeholder="Stad (optioneel)"
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
        />

        <div>
          <p className="text-sm text-inkt-zacht mb-2">
            Hoe is deze persoon met jou verbonden?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {relaties.map((r, i) => (
              <label
                key={r.waarde}
                className="flex items-center gap-2 rounded-lg border border-rand bg-achtergrond px-3 py-2 cursor-pointer has-checked:border-terracotta has-checked:bg-klei/40"
              >
                <input
                  type="radio"
                  name="relatie"
                  value={r.waarde}
                  defaultChecked={i === 0}
                  className="accent-terracotta"
                />
                <span className="text-sm text-inkt">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        {resultaat && !resultaat.ok && (
          <p className="text-sm text-terracotta">{resultaat.fout}</p>
        )}
        {resultaat?.ok && (
          <p className="text-sm text-groen">
            {resultaat.naam} staat nu op jullie familiekaart.
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="w-full rounded-full bg-terracotta py-2.5 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Toevoegen aan familie"}
        </button>
      </form>
    </div>
  )
}
