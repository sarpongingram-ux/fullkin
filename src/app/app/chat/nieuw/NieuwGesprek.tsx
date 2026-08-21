"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { startDirect } from "../acties"

type Lid = { id: string; naam: string; relatie: string }

export function NieuwGesprek({ familie }: { familie: Lid[] }) {
  const router = useRouter()
  const [zoek, setZoek] = useState("")
  const [bezig, start] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  const zichtbaar = zoek
    ? familie.filter(
        (l) =>
          l.naam.toLowerCase().includes(zoek.toLowerCase()) ||
          l.relatie.toLowerCase().includes(zoek.toLowerCase()),
      )
    : familie

  function open(id: string) {
    setFout(null)
    start(async () => {
      const res = await startDirect(id)
      if (res.ok) router.push(`/app/chat/${res.roomId}`)
      else setFout(res.fout)
    })
  }

  return (
    <div>
      <input
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        placeholder="Zoek op naam of relatie…"
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-4"
      />
      {fout && <p className="text-terracotta font-semibold mb-3">{fout}</p>}
      {zichtbaar.length === 0 ? (
        <p className="text-inkt-zacht text-center py-8">Niemand gevonden.</p>
      ) : (
        <ul className="space-y-2">
          {zichtbaar.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => open(l.id)}
                disabled={bezig}
                className="fk-card w-full flex items-center gap-3 hover:bg-oppervlak transition text-left disabled:opacity-60"
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black bg-inkt shrink-0">
                  {(l.naam[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-inkt truncate">{l.naam}</p>
                  <p className="text-sm text-inkt-zacht">jouw {l.relatie}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
