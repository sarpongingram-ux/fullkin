"use client"

import { useTransition } from "react"
import { heractiveerFamilie } from "./familie-acties"

export function PauzeBanner({
  networkId,
  familieNaam,
}: {
  networkId: string
  familieNaam: string
}) {
  const [bezig, start] = useTransition()

  return (
    <div className="bg-goud/15 border-b border-goud/40 px-4 py-3">
      <div className="max-w-md mx-auto flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5">⏸️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-inkt">
            {familieNaam} staat op pauze
          </p>
          <p className="text-xs text-inkt-zacht mt-0.5">
            Je kunt alles bekijken, maar niets wijzigen. Heractiveer om weer
            samen te bouwen.
          </p>
          <button
            type="button"
            disabled={bezig}
            onClick={() => start(async () => void (await heractiveerFamilie(networkId)))}
            className="mt-2 fk-btn fk-btn-primary text-sm px-4 py-2"
          >
            {bezig ? "Bezig…" : "Heractiveer — €0,99/mnd"}
          </button>
        </div>
      </div>
    </div>
  )
}
