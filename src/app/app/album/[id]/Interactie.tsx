"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { reageer, haalReactieWeg, plaatsOpmerking } from "../acties"
import type { Enums } from "@/lib/types/database"

const REACTIES: { kind: Enums<"reaction_kind">; emoji: string; label: string }[] = [
  { kind: "hart", emoji: "❤️", label: "Hart" },
  { kind: "lach", emoji: "😄", label: "Lach" },
  { kind: "traan", emoji: "🥲", label: "Traan" },
  { kind: "vuur", emoji: "🔥", label: "Vuur" },
]

export function Reacties({
  itemId,
  tellingen,
  mijnReactie,
}: {
  itemId: string
  tellingen: Record<string, number>
  mijnReactie: Enums<"reaction_kind"> | null
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()

  function klik(kind: Enums<"reaction_kind">) {
    start(async () => {
      if (mijnReactie === kind) await haalReactieWeg(itemId)
      else await reageer(itemId, kind)
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2">
      {REACTIES.map((r) => {
        const aantal = tellingen[r.kind] ?? 0
        const actief = mijnReactie === r.kind
        return (
          <button
            key={r.kind}
            onClick={() => klik(r.kind)}
            disabled={bezig}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 transition disabled:opacity-60 ${
              actief
                ? "border-terracotta bg-klei/60"
                : "border-rand hover:bg-klei/30"
            }`}
          >
            <span className="text-lg">{r.emoji}</span>
            {aantal > 0 && (
              <span className="text-sm text-inkt-zacht">{aantal}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Opmerken({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [tekst, setTekst] = useState("")
  const [bezig, start] = useTransition()

  function plaats() {
    if (!tekst.trim()) return
    start(async () => {
      await plaatsOpmerking(itemId, tekst)
      setTekst("")
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2 mt-3">
      <input
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        placeholder="Schrijf iets liefs…"
        className="flex-1 rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt text-sm outline-none focus:border-terracotta"
      />
      <button
        onClick={plaats}
        disabled={bezig}
        className="rounded-full bg-terracotta px-4 py-2 text-white text-sm font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
      >
        Plaats
      </button>
    </div>
  )
}
