"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { startMaandbijdrage, stopMaandbijdrage, type MaandResultaat } from "./acties"

function euro(cents: number, decimals = 2) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: decimals,
  }).format(cents / 100)
}

export function Maandbijdrage({
  mijnBedragCents,
  ledenAantal,
  perMaandCents,
}: {
  mijnBedragCents: number | null
  ledenAantal: number
  perMaandCents: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [res, actie, bezig] = useActionState<MaandResultaat | null, FormData>(
    startMaandbijdrage,
    null,
  )
  const [stopBezig, startStop] = useTransition()
  const [bevestigStop, setBevestigStop] = useState(false)

  const samen =
    ledenAantal > 0
      ? `${ledenAantal} ${ledenAantal === 1 ? "lid draagt" : "leden dragen"} samen ${euro(perMaandCents, 0)} per maand bij.`
      : "Nog niemand draagt maandelijks bij. Wees de eerste."

  // Ik heb al een actieve maandbijdrage: tonen + kunnen stoppen.
  if (mijnBedragCents) {
    return (
      <div className="bg-oppervlak rounded-2xl border border-goud/40 p-5">
        <h3 className="font-semibold text-inkt">Jouw maandelijkse bijdrage</h3>
        <p className="text-2xl font-bold text-goud mt-1">
          {euro(mijnBedragCents)}{" "}
          <span className="text-sm font-normal text-inkt-zacht">per maand</span>
        </p>
        <p className="text-xs text-inkt-zacht mt-1">{samen}</p>

        {!bevestigStop ? (
          <button
            onClick={() => setBevestigStop(true)}
            className="mt-3 text-sm text-inkt-zacht hover:text-terracotta transition"
          >
            Stop mijn maandbijdrage
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-inkt">Zeker weten?</span>
            <button
              onClick={() =>
                startStop(async () => {
                  await stopMaandbijdrage()
                  router.refresh()
                })
              }
              disabled={stopBezig}
              className="rounded-full bg-inkt text-white text-sm px-4 py-1.5 hover:opacity-90 transition disabled:opacity-60"
            >
              {stopBezig ? "Bezig…" : "Ja, stop"}
            </button>
            <button
              onClick={() => setBevestigStop(false)}
              className="text-sm text-inkt-zacht hover:text-inkt"
            >
              Terug
            </button>
          </div>
        )}
        <p className="text-[11px] text-inkt-zacht mt-3">
          Wil je een ander bedrag? Stop je bijdrage en stel 'm opnieuw in.
        </p>
      </div>
    )
  }

  // Nog geen bijdrage: instellen.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-full border border-goud/60 text-goud font-medium py-3 hover:bg-klei/40 transition"
      >
        Stel een maandelijkse bijdrage in
      </button>
    )
  }

  return (
    <div className="bg-oppervlak rounded-2xl border border-rand p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-inkt">Maandelijkse bijdrage</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht text-sm hover:text-inkt"
        >
          Sluiten
        </button>
      </div>
      <p className="text-xs text-inkt-zacht mb-3">{samen}</p>

      <form action={actie} className="space-y-3">
        <div>
          <label className="block text-sm text-inkt-zacht mb-1">
            Bedrag per maand (€)
          </label>
          <input
            name="bedrag"
            type="number"
            step="0.50"
            min="1"
            defaultValue="3"
            required
            className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />
          <div className="flex gap-1.5 mt-2">
            {[3, 5, 10].map((v) => (
              <span
                key={v}
                className="text-[11px] text-inkt-zacht rounded-full border border-rand px-2 py-0.5"
              >
                suggestie €{v}
              </span>
            ))}
          </div>
          <p className="text-xs text-inkt-zacht mt-2">
            €3 is de suggestie, maar jij bepaalt. Je bijdrage is anoniem — de Pot
            groeit, niemand ziet wie hoeveel geeft. Maandelijks opzegbaar.
          </p>
        </div>

        {res && !res.ok && <p className="text-sm text-terracotta">{res.fout}</p>}
        {res?.ok && res.devPending && (
          <p className="text-sm text-goud">
            Ingesteld (dev-modus). Zodra Stripe gekoppeld is loopt de echte
            maandincasso.
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="w-full rounded-full bg-terracotta py-2.5 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Maandbijdrage starten"}
        </button>
      </form>
    </div>
  )
}
