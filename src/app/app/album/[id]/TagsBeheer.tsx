"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { voegTagsToe, verwijderTag } from "../acties"

type Lid = { id: string; naam: string }

export function TagsBeheer({
  itemId,
  familie,
  getagdIds,
}: {
  itemId: string
  familie: Lid[]
  getagdIds: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [zoek, setZoek] = useState("")
  const [bezig, start] = useTransition()

  const getagd = new Set(getagdIds)

  function voegToe(id: string) {
    start(async () => {
      await voegTagsToe(itemId, [id])
      router.refresh()
    })
  }
  function haalWeg(id: string) {
    start(async () => {
      await verwijderTag(itemId, id)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-bold text-terracotta hover:text-inkt transition"
      >
        🏷️ Namen taggen
      </button>
    )
  }

  const nogNiet = familie.filter((l) => !getagd.has(l.id))
  const zichtbaar = zoek
    ? nogNiet.filter((l) => l.naam.toLowerCase().includes(zoek.toLowerCase()))
    : nogNiet.slice(0, 10)

  return (
    <section className="fk-card">
      <div className="flex items-center justify-between mb-2">
        <p className="font-black text-inkt">🏷️ Wie staat erop?</p>
        <button
          onClick={() => setOpen(false)}
          className="text-inkt-zacht font-bold hover:text-inkt text-sm"
        >
          Klaar
        </button>
      </div>

      {/* Al getagd */}
      {getagdIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {getagdIds.map((id) => {
            const l = familie.find((f) => f.id === id)
            return (
              <button
                key={id}
                onClick={() => haalWeg(id)}
                disabled={bezig}
                className="rounded-full bg-terracotta text-white text-xs px-3 py-1 disabled:opacity-60"
              >
                {l?.naam ?? "Familielid"} ✕
              </button>
            )
          })}
        </div>
      )}

      {/* Toevoegen */}
      <input
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        placeholder="Zoek familielid…"
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-sm outline-none focus:border-terracotta mb-2"
      />
      <div className="flex flex-wrap gap-1.5">
        {zichtbaar.map((l) => (
          <button
            key={l.id}
            onClick={() => voegToe(l.id)}
            disabled={bezig}
            className="rounded-full border border-rand text-inkt text-xs px-3 py-1 hover:bg-klei/40 transition disabled:opacity-60"
          >
            + {l.naam}
          </button>
        ))}
        {zichtbaar.length === 0 && (
          <p className="text-sm text-inkt-zacht">Iedereen staat al getagd.</p>
        )}
      </div>
    </section>
  )
}
