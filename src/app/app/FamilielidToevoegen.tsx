"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { voegFamilielidToe, type ToevoegResultaat } from "./acties"

const relaties = [
  { waarde: "ouder", label: "Ouder" },
  { waarde: "kind", label: "Kind" },
  { waarde: "partner", label: "Partner" },
  { waarde: "ex_partner", label: "Ex-partner" },
  { waarde: "broer_zus", label: "Broer of zus" },
] as const

type Lid = { id: string; naam: string }

export function FamilielidToevoegen({
  meId,
  leden,
}: {
  meId: string
  leden: Lid[]
}) {
  const [open, setOpen] = useState(false)
  // Anker-opties: jij bovenaan (standaard), daarna de rest van de familie.
  const ankers: Lid[] = [
    { id: meId, naam: "jou" },
    ...leden.filter((l) => l.id !== meId),
  ]
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
    <div className="fk-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-inkt text-lg">Familielid toevoegen</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht font-bold hover:text-inkt"
        >
          Sluiten
        </button>
      </div>

      <form ref={formRef} action={actie} className="space-y-4">
        <div className="flex gap-2">
          <input
            name="voornaam"
            placeholder="Voornaam"
            required
            className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
          <input
            name="achternaam"
            placeholder="Achternaam"
            required
            className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>

        <div className="flex gap-2">
          <input
            name="stad"
            placeholder="Stad (optioneel)"
            className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
          <input
            name="land"
            placeholder="Land (optioneel)"
            className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>

        <div>
          <p className="text-sm text-inkt-zacht mb-2 font-semibold">
            Deze persoon is de…
          </p>
          <div className="grid grid-cols-2 gap-2">
            {relaties.map((r, i) => (
              <label
                key={r.waarde}
                className="flex items-center gap-2 rounded-xl border-2 border-rand bg-white px-3 py-2.5 cursor-pointer font-semibold text-inkt has-checked:border-terracotta has-checked:bg-klei"
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

        <div>
          <p className="text-sm text-inkt-zacht mb-1 font-semibold">…van</p>
          <select
            name="verwant_aan"
            defaultValue={meId}
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          >
            {ankers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.naam}
              </option>
            ))}
          </select>
          <div className="text-xs text-inkt-zacht mt-2 rounded-xl bg-oppervlak p-3 space-y-1">
            <p className="font-bold text-inkt">Verdere familie toevoegen:</p>
            <p>
              Je <b>oom/tante</b> = <b>Broer of zus</b> van je vader of moeder
            </p>
            <p>
              Je <b>neef/nicht</b> = <b>Kind</b> van je oom of tante
            </p>
            <p>
              Je <b>opa/oma</b> = <b>Ouder</b> van je vader of moeder
            </p>
            <p className="italic pt-1">
              Voeg de tussenpersoon eerst toe (bijv. je vader), kies 'm daarna bij
              &quot;van&quot;.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">
            Geboortedatum <span className="font-normal">(optioneel)</span>
          </label>
          <input
            name="geboortedatum"
            type="date"
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl bg-oppervlak p-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_kind"
            className="w-5 h-5 mt-0.5 accent-terracotta shrink-0"
          />
          <span className="text-sm text-inkt">
            <span className="font-bold">Dit is een kind (onder 16)</span>
            <br />
            <span className="text-inkt-zacht">
              Jij beheert het profiel. Geen eigen account, geen uitnodiging en
              geen bijdragen. Vanaf 16 kan het kind zelf meedoen.
            </span>
          </span>
        </label>

        {resultaat && !resultaat.ok && (
          <p className="text-terracotta font-semibold">{resultaat.fout}</p>
        )}
        {resultaat?.ok && (
          <p className="text-groen font-semibold">
            {resultaat.naam} staat nu op jullie familiekaart.
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="fk-btn fk-btn-primary fk-btn-full"
        >
          {bezig ? "Bezig…" : "Toevoegen aan familie"}
        </button>
      </form>
    </div>
  )
}
