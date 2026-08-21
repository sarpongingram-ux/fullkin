"use client"

import { useState } from "react"
import Link from "next/link"

export type RoomKaart = {
  id: string
  type: string
  naam: string
  laatsteTekst: string | null
  laatsteTijd: string | null
  toegang: boolean
  ongelezen: boolean
}

const tabs = [
  { key: "familie", label: "Familie" },
  { key: "tak", label: "Takken" },
  { key: "direct", label: "Direct" },
] as const

function wanneer(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const nu = new Date()
  const zelfdeDag = d.toDateString() === nu.toDateString()
  return zelfdeDag
    ? d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
}

export function ChatOverzicht({ kaarten }: { kaarten: RoomKaart[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("familie")
  const zichtbaar = kaarten.filter((k) => k.type === tab)

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-5">
      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">CHAT</p>
        <h1 className="text-3xl font-black text-inkt mt-1">Familieberichten 💬</h1>
      </header>

      {/* Tabbladen */}
      <div className="flex gap-1 bg-oppervlak rounded-2xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-black transition ${
              tab === t.key ? "bg-white text-inkt shadow-sm" : "text-inkt-zacht"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lijst */}
      {tab === "direct" ? (
        <div className="fk-card text-center py-10">
          <p className="text-4xl mb-2">👋</p>
          <p className="font-black text-inkt">Directe berichten komen eraan</p>
          <p className="text-inkt-zacht mt-1 text-sm">
            Binnenkort kun je één-op-één kennismaken met familieleden.
          </p>
        </div>
      ) : zichtbaar.length === 0 ? (
        <div className="fk-card text-center py-10">
          <p className="text-4xl mb-2">🌱</p>
          <p className="font-black text-inkt">
            {tab === "tak" ? "Nog geen takken" : "Nog geen chat"}
          </p>
          <p className="text-inkt-zacht mt-1 text-sm">
            {tab === "tak"
              ? "Takchats verschijnen zodra familieleden een woonland invullen."
              : "De familiechat verschijnt hier."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {zichtbaar.map((k) => (
            <li key={k.id}>
              <Link
                href={`/app/chat/${k.id}`}
                className="fk-card flex items-center gap-3 hover:bg-oppervlak transition"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shrink-0"
                  style={{ background: k.type === "tak" ? "var(--goud)" : "var(--terracotta)" }}
                >
                  {k.type === "tak" ? "🌍" : "💬"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-inkt truncate">{k.naam}</p>
                    <span className="text-xs text-inkt-zacht shrink-0">
                      {wanneer(k.laatsteTijd)}
                    </span>
                  </div>
                  <p className="text-sm text-inkt-zacht truncate">
                    {!k.toegang
                      ? "Tik om mee te doen aan deze tak"
                      : k.laatsteTekst || "Nog geen berichten"}
                  </p>
                </div>
                {k.ongelezen && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: "var(--terracotta)" }}
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
