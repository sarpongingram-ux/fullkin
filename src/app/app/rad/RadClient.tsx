"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { draaiHetRad, beslisRad } from "./acties"
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
      // Even laten "tollen" voor het gevoel.
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
        className={`mx-auto mb-6 w-40 h-40 rounded-full border-8 border-goud/40 border-t-goud flex items-center justify-center text-5xl ${
          draait ? "animate-spin" : ""
        }`}
        style={{ animationDuration: "0.6s" }}
      >
        🎡
      </div>
      <button
        onClick={draai}
        disabled={bezig || draait || !kanDraaien}
        className="rounded-full bg-terracotta px-10 py-4 text-white text-lg font-semibold hover:bg-terracotta-diep transition disabled:opacity-60"
      >
        {draait ? "Het Rad tolt…" : "Draai het Rad"}
      </button>
      {!kanDraaien && (
        <p className="text-sm text-inkt-zacht mt-3">
          Er zijn nog geen actieve leden met lootjes om te trekken.
        </p>
      )}
      {fout && <p className="text-terracotta text-sm mt-3">{fout}</p>}
    </div>
  )
}

// De vier keuzes na het winnen (alleen zichtbaar voor de winnaar).
export function KeuzePaneel({
  drawId,
  leden,
}: {
  drawId: string
  leden: Lid[]
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [gunModus, setGunModus] = useState(false)
  const [ontvanger, setOntvanger] = useState("")
  const [fout, setFout] = useState<string | null>(null)

  function kies(choice: Enums<"rad_choice">, recipient: string | null) {
    setFout(null)
    start(async () => {
      const res = await beslisRad(drawId, choice, recipient)
      if (!res.ok) {
        setFout(res.fout ?? "Er ging iets mis.")
        return
      }
      router.refresh()
    })
  }

  if (gunModus) {
    return (
      <div className="bg-oppervlak rounded-2xl border border-rand p-5 space-y-3">
        <p className="font-semibold text-inkt">Aan wie gun je de prijs?</p>
        <select
          value={ontvanger}
          onChange={(e) => setOntvanger(e.target.value)}
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
        >
          <option value="">Kies een familielid…</option>
          {leden.map((l) => (
            <option key={l.id} value={l.id}>
              {l.naam}
            </option>
          ))}
        </select>
        {fout && <p className="text-sm text-terracotta">{fout}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => setGunModus(false)}
            className="flex-1 rounded-full border border-rand py-2.5 text-inkt-zacht hover:bg-klei/40 transition"
          >
            Terug
          </button>
          <button
            onClick={() => ontvanger && kies("gunnen", ontvanger)}
            disabled={bezig || !ontvanger}
            className="flex-1 rounded-full bg-terracotta py-2.5 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
          >
            Gunnen
          </button>
        </div>
      </div>
    )
  }

  const opties: { choice: Enums<"rad_choice">; titel: string; uitleg: string }[] = [
    { choice: "zelf", titel: "Zelf houden", uitleg: "De prijs komt naar jou." },
    { choice: "pot", titel: "Terugzetten in de pot", uitleg: "De pot groeit voor volgend jaar." },
    { choice: "dromen", titel: "Verdelen over dromen", uitleg: "Vervul meerdere dromen tegelijk." },
  ]

  return (
    <div className="space-y-2">
      <p className="text-sm text-inkt-zacht mb-1">Wat doe je met de prijs?</p>
      <button
        onClick={() => setGunModus(true)}
        disabled={bezig}
        className="w-full text-left rounded-xl border border-rand bg-oppervlak p-4 hover:border-terracotta transition disabled:opacity-60"
      >
        <p className="font-medium text-inkt">Gunnen aan familielid</p>
        <p className="text-sm text-inkt-zacht">Volledig naar wie het nodig heeft.</p>
      </button>
      {opties.map((o) => (
        <button
          key={o.choice}
          onClick={() => kies(o.choice, null)}
          disabled={bezig}
          className="w-full text-left rounded-xl border border-rand bg-oppervlak p-4 hover:border-terracotta transition disabled:opacity-60"
        >
          <p className="font-medium text-inkt">{o.titel}</p>
          <p className="text-sm text-inkt-zacht">{o.uitleg}</p>
        </button>
      ))}
      {fout && <p className="text-sm text-terracotta">{fout}</p>}
    </div>
  )
}
