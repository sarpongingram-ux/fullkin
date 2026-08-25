"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { wisselFamilie } from "./familie-acties"

export type Familie = { network_id: string; name: string; is_active: boolean }

export function FamilieWisselaar({ families }: { families: Familie[] }) {
  const [open, setOpen] = useState(false)
  const [bezig, start] = useTransition()
  const router = useRouter()

  const actief = families.find((f) => f.is_active) ?? families[0]
  if (!actief) return null

  function kies(networkId: string) {
    setOpen(false)
    if (networkId === actief?.network_id) return
    start(async () => {
      await wisselFamilie(networkId)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={bezig}
        className="flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-sm font-bold text-inkt border border-rand shadow-sm max-w-[70vw]"
      >
        <span className="text-base">🌳</span>
        <span className="truncate">{bezig ? "Wisselen…" : actief.name}</span>
        <span className="text-inkt-zacht text-xs">▾</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-2xl bg-white border border-rand shadow-xl overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-[11px] font-extrabold tracking-widest text-inkt-zacht">
              JOUW FAMILIES
            </p>
            {families.map((f) => (
              <button
                key={f.network_id}
                type="button"
                onClick={() => kies(f.network_id)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-zand transition"
              >
                <span className="text-lg">{f.is_active ? "🌳" : "🌱"}</span>
                <span className="flex-1 truncate font-semibold text-inkt">
                  {f.name}
                </span>
                {f.is_active && (
                  <span className="text-terracotta text-xs font-bold">nu</span>
                )}
              </button>
            ))}
            <Link
              href="/app/familie/nieuw"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 border-t border-rand hover:bg-zand transition"
            >
              <span className="text-lg">＋</span>
              <span className="font-bold text-terracotta">
                Bouw je vader- of moederskant
              </span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
