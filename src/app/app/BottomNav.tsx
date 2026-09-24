"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

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

export function BottomNav() {
  const pathname = usePathname() ?? "/app"

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-rand"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map((item) => {
          const actief = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] transition"
            >
              <span
                className={`text-2xl leading-none transition-transform ${
                  actief ? "scale-110" : "opacity-60"
                }`}
              >
                {item.emoji}
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
