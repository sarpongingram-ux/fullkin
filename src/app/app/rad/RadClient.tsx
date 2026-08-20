"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { draaiHetRad, beslisRad } from "./acties"
import { Confetti } from "@/components/Confetti"
import type { Enums } from "@/lib/types/database"

type Lid = { id: string; naam: string }

// De grote draaiknop (als er dit jaar nog niet getrokken is).
export function DraaiKnop({ kanDraaien }: { kanDraaien: boolean }) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [draait, setDraait] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  function draai() {
    setFout(null)
    setDraait(true)
    start(async () => {
      const res = await draaiHetRad()
      await new Promise((r) => setTimeout(r, 2200))
      if (!res.ok) {
        setFout(res.fout)
        setDraait(false)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="text-center">
      <div
        className={`mx-auto mb-6 w-40 h-40 rounded-full border-8 border-klei border-t-goud flex items-center justify-center text-6xl ${
          draait ? "animate-spin" : ""
        }`}
        style={{ animationDuration: "0.6s" }}
      >
        🎡
      </div>
      <button
        onClick={draai}
        disabled={bezig || draait || !kanDraaien}
        className="fk-btn fk-btn-primary fk-btn-full"
      >
        {draait ? "Het Rad tolt…" : "Draai het Rad"}
      </button>
      {!kanDraaien && (
        <p className="text-inkt-zacht mt-3">
          Er zijn nog geen actieve leden met lootjes om te trekken.
        </p>
      )}
      {fout && <p className="text-terracotta font-semibold mt-3">{fout}</p>}
    </div>
  )
}

// De vier keuzes na het winnen (alleen zichtbaar voor de winnaar).
export function KeuzePaneel({ drawId, leden }: { drawId: string; leden: Lid[] }) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [gunModus, setGunModus] = useState(false)
  const [ontvanger, setOntvanger] = useState("")
  const [fout, setFout] = useState<string | null>(null)
  const [gelukt, setGelukt] = useState(false)

  function kies(choice: Enums<"rad_choice">, recipient: string | null) {
    setFout(null)
    start(async () => {
      const res = await beslisRad(drawId, choice, recipient)
      if (!res.ok) {
        setFout(res.fout ?? "Er ging iets mis.")
        return
      }
      // Vier het even met goud confetti, ververs daarna.
      setGelukt(true)
      setTimeout(() => router.refresh(), 2400)
    })
  }

  if (gunModus) {
    return (
      <div className="fk-card space-y-3">
        {gelukt && <Confetti gold count={90} />}
        <p className="font-black text-inkt text-lg">Aan wie gun je de prijs?</p>
        <select
          value={ontvanger}
          onChange={(e) => setOntvanger(e.target.value)}
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        >
          <option value="">Kies een familielid…</option>
          {leden.map((l) => (
            <option key={l.id} value={l.id}>
              {l.naam}
            </option>
          ))}
        </select>
        {fout && <p className="text-terracotta font-semibold">{fout}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => setGunModus(false)}
            className="fk-btn fk-btn-secondary flex-1"
          >
            Terug
          </button>
          <button
            onClick={() => ontvanger && kies("gunnen", ontvanger)}
            disabled={bezig || !ontvanger}
            className="fk-btn fk-btn-primary flex-1"
          >
            Gunnen ❤️
          </button>
        </div>
      </div>
    )
  }

  const opties: { choice: Enums<"rad_choice">; emoji: string; titel: string; uitleg: string }[] = [
    { choice: "zelf", emoji: "🎁", titel: "Zelf houden", uitleg: "De prijs komt naar jou." },
    { choice: "pot", emoji: "🌍", titel: "Terug in de pot", uitleg: "De pot groeit voor volgend jaar." },
    { choice: "dromen", emoji: "✨", titel: "Verdelen over dromen", uitleg: "Vervul meerdere dromen tegelijk." },
  ]

  return (
    <div className="space-y-3">
      {gelukt && <Confetti gold count={90} />}
      <p className="text-lg font-black text-inkt">Wat doe je met de prijs?</p>
      <button
        onClick={() => setGunModus(true)}
        disabled={bezig}
        className="w-full text-left fk-card flex items-center gap-4 disabled:opacity-60"
      >
        <span className="text-3xl">❤️</span>
        <div>
          <p className="font-bold text-inkt">Gunnen aan familielid</p>
          <p className="text-inkt-zacht">Volledig naar wie het nodig heeft.</p>
        </div>
      </button>
      {opties.map((o) => (
        <button
          key={o.choice}
          onClick={() => kies(o.choice, null)}
          disabled={bezig}
          className="w-full text-left fk-card flex items-center gap-4 disabled:opacity-60"
        >
          <span className="text-3xl">{o.emoji}</span>
          <div>
            <p className="font-bold text-inkt">{o.titel}</p>
            <p className="text-inkt-zacht">{o.uitleg}</p>
          </div>
        </button>
      ))}
      {fout && <p className="text-terracotta font-semibold">{fout}</p>}
    </div>
  )
}
