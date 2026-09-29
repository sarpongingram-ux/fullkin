"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

// Navigatie rond de North Star: Thuis (belong) · Familie (discover/build) ·
// Chat (connect) · Meer (alle ondersteunende features, incl. de economie).
const items = [
  { href: "/app", label: "Thuis", emoji: "🏠", match: (p: string) => p === "/app" },
  {
    href: "/app/familie",
    label: "Familie",
    emoji: "👨‍👩‍👧‍👦",
    match: (p: string) =>
      p.startsWith("/app/familie") || p.startsWith("/app/persoon"),
  },
  {
    href: "/app/ontdek",
    label: "Ontdek",
    emoji: "🔍",
    match: (p: string) => p.startsWith("/app/ontdek"),
  },
  {
    href: "/app/chat",
    label: "Chat",
    emoji: "💬",
    match: (p: string) => p.startsWith("/app/chat"),
  },
  {
    href: "/app/meer",
    label: "Meer",
    emoji: "⋯",
    match: (p: string) =>
      p.startsWith("/app/meer") ||
      p.startsWith("/app/album") ||
      p.startsWith("/app/wallet") ||
      p.startsWith("/app/pot") ||
      p.startsWith("/app/uitbetaling") ||
      p.startsWith("/app/collecte") ||
      p.startsWith("/app/stem") ||
      p.startsWith("/app/rad") ||
      p.startsWith("/app/mijlpalen") ||
      p.startsWith("/app/business") ||
      p.startsWith("/app/dashboard"),
  },
]

export function BottomNav({
  ontdekOngelezen = false,
  meId = null,
}: {
  ontdekOngelezen?: boolean
  meId?: string | null
}) {
  const pathname = usePathname() ?? "/app"

  // Live ongelezen-stip: de server geeft de waarheid bij (her)render; realtime zet 'm aan
  // zodra er een bericht van een ánder binnenkomt (RLS scopet events tot eigen gesprekken).
  const [live, setLive] = useState(false)

  // Bij navigatie herrende't de server ontdekOngelezen → de live-override resetten.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive(false)
  }, [pathname])

  useEffect(() => {
    if (!meId) return
    const supabase = createClient()
    const kanaal = supabase
      .channel(`nav-ontdek-${meId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ontdek_berichten" },
        (p) => {
          const nieuw = p.new as { afzender_id?: string }
          if (nieuw?.afzender_id && nieuw.afzender_id !== meId) setLive(true)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(kanaal)
    }
  }, [meId])

  const ongelezen = ontdekOngelezen || live

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-rand"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map((item) => {
          const actief = item.match(pathname)
          const badge = item.href === "/app/ontdek" && ongelezen
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] transition"
            >
              <span
                className={`relative text-2xl leading-none transition-transform ${
                  actief ? "scale-110" : "opacity-60"
                }`}
              >
                {item.emoji}
                {badge && (
                  <span
                    aria-label="nieuw bericht"
                    className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-terracotta ring-2 ring-white"
                  />
                )}
              </span>
              <span
                className={`text-xs font-bold ${
                  actief ? "text-terracotta" : "text-inkt-zacht"
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
