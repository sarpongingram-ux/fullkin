"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zegHallo } from "./acties"

export function HalloKnop({
  naar,
  alGegroet,
  voornaam,
}: {
  naar: string
  alGegroet: boolean
  voornaam: string
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [gedaan, setGedaan] = useState(alGegroet)
  const [fout, setFout] = useState<string | null>(null)

  if (gedaan) {
    return (
      <div className="fk-card text-center">
        <p className="font-black text-groen">Hallo gestuurd 👋</p>
        <p className="text-sm text-inkt-zacht mt-1">
          {voornaam} ziet dat je gedag hebt gezegd.
        </p>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => {
          setFout(null)
          start(async () => {
            const res = await zegHallo(naar)
            if (!res.ok) return setFout(res.fout ?? "Er ging iets mis.")
            setGedaan(true)
            router.refresh()
          })
        }}
        disabled={bezig}
        className="fk-btn fk-btn-primary fk-btn-full"
      >
        {bezig ? "Bezig…" : `Zeg hallo tegen ${voornaam} 👋`}
      </button>
      {fout && <p className="text-terracotta text-sm font-semibold mt-2">{fout}</p>}
    </div>
  )
}
