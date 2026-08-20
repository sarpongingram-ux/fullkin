"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { startMaandbijdrage, stopMaandbijdrage, type MaandResultaat } from "./acties"
import { Confetti } from "@/components/Confetti"

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
      <div className="fk-card">
        <h3 className="font-black text-inkt text-lg">Jouw maandelijkse bijdrage</h3>
        <p className="fk-stat-num text-goud mt-1">
          {euro(mijnBedragCents)}{" "}
          <span className="text-base font-bold text-inkt-zacht">per maand</span>
        </p>
        <p className="text-sm text-inkt-zacht mt-1">{samen}</p>

        {!bevestigStop ? (
          <button
            onClick={() => setBevestigStop(true)}
            className="mt-3 font-bold text-inkt-zacht hover:text-terracotta transition"
          >
            Stop mijn maandbijdrage
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-inkt font-semibold">Zeker weten?</span>
            <button
              onClick={() =>
                startStop(async () => {
                  await stopMaandbijdrage()
                  router.refresh()
                })
              }
              disabled={stopBezig}
              className="rounded-2xl bg-inkt text-white font-bold px-5 py-2.5 hover:opacity-90 transition disabled:opacity-60"
            >
              {stopBezig ? "Bezig…" : "Ja, stop"}
            </button>
            <button
              onClick={() => setBevestigStop(false)}
              className="font-bold text-inkt-zacht hover:text-inkt"
            >
              Terug
            </button>
          </div>
        )}
        <p className="text-sm text-inkt-zacht mt-3">
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
        className="fk-btn fk-btn-secondary fk-btn-full"
      >
        🔁 Stel een maandelijkse bijdrage in
      </button>
    )
  }

  return (
    <div className="fk-card">
      {res?.ok && <Confetti />}
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-black text-inkt text-lg">Maandelijkse bijdrage</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht font-bold hover:text-inkt"
        >
          Sluiten
        </button>
      </div>
      <p className="text-sm text-inkt-zacht mb-3">{samen}</p>

      <form action={actie} className="space-y-4">
        <div>
          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">
            Bedrag per maand (€)
          </label>
          <input
            name="bedrag"
            type="number"
            step="0.50"
            min="1"
            defaultValue="3"
            required
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
          <div className="flex gap-2 mt-2">
            {[3, 5, 10].map((v) => (
              <span
                key={v}
                className="text-xs text-inkt-zacht font-semibold rounded-full bg-oppervlak px-3 py-1"
              >
                suggestie €{v}
              </span>
            ))}
          </div>
          <p className="text-sm text-inkt-zacht mt-2">
            €3 is de suggestie, maar jij bepaalt. Je bijdrage is anoniem — de pot
            groeit, niemand ziet wie hoeveel geeft. Maandelijks opzegbaar.
          </p>
        </div>

        {res && !res.ok && (
          <p className="text-terracotta font-semibold">{res.fout}</p>
        )}
        {res?.ok && res.devPending && (
          <p className="text-goud font-semibold">
            Ingesteld (dev-modus). Zodra Stripe gekoppeld is loopt de echte
            maandincasso.
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="fk-btn fk-btn-primary fk-btn-full"
        >
          {bezig ? "Bezig…" : "Maandbijdrage starten"}
        </button>
      </form>
    </div>
  )
}
