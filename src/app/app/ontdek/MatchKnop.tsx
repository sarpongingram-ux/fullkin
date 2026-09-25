"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { bevestigMatch, wijsMatchAf } from "./acties"

export function MatchKnop({
  mijnId,
  anderId,
}: {
  mijnId: string
  anderId: string
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [weg, setWeg] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  if (weg) return null

  function bevestig() {
    setFout(null)
    start(async () => {
      const res = await bevestigMatch(mijnId, anderId)
      if (!res.ok) return setFout(res.fout ?? "Er ging iets mis.")
      router.refresh()
    })
  }

  function afwijzen() {
    setFout(null)
    setWeg(true) // meteen weg uit beeld
    start(async () => {
      const res = await wijsMatchAf(mijnId, anderId)
      if (!res.ok) {
        setWeg(false)
        return setFout(res.fout ?? "Er ging iets mis.")
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button
          onClick={bevestig}
          disabled={bezig}
          className="fk-btn fk-btn-primary flex-1 text-sm py-2.5"
        >
          {bezig ? "Bezig…" : "Ja, dezelfde persoon"}
        </button>
        <button
          onClick={afwijzen}
          disabled={bezig}
          className="fk-btn fk-btn-secondary flex-1 text-sm py-2.5"
        >
          Nee, ander persoon
        </button>
      </div>
      {fout && <p className="text-terracotta text-sm font-semibold mt-2">{fout}</p>}
    </div>
  )
}
