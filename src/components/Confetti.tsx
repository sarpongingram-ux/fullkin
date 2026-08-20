"use client"

import { useEffect, useState } from "react"

const FEEST = ["#1b4fd8", "#c9972b", "#15803d", "#e0b455", "#5b8cf0", "#ffffff"]
const GOUD = ["#c9972b", "#e0b455", "#f0cf85", "#a87c1f", "#ffe6a8"]

type Stukje = {
  left: number
  delay: number
  duur: number
  grootte: number
  kleur: string
  rond: boolean
  drift: number
}

// Een korte confettiregen. De stukjes worden pas ná mount aangemaakt (met
// Math.random), zodat de server-render leeg blijft en er geen hydration-
// mismatch is. Dwarrelt naar beneden en ruimt zichzelf na ~2,8s op.
export function Confetti({
  gold = false,
  count = 70,
}: {
  gold?: boolean
  count?: number
}) {
  const [stukjes, setStukjes] = useState<Stukje[]>([])

  useEffect(() => {
    const palet = gold ? GOUD : FEEST
    setStukjes(
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duur: 1.4 + Math.random() * 1.2,
        grootte: 6 + Math.random() * 8,
        kleur: palet[i % palet.length],
        rond: Math.random() > 0.5,
        drift: Math.round((Math.random() - 0.5) * 70),
      })),
    )
    const t = setTimeout(() => setStukjes([]), 2800)
    return () => clearTimeout(t)
  }, [gold, count])

  if (stukjes.length === 0) return null

  return (
    <div className="fk-confetti-root" aria-hidden>
      {stukjes.map((s, i) => (
        <span
          key={i}
          className="fk-confetti-piece"
          style={{
            left: `${s.left}%`,
            width: s.grootte,
            height: s.grootte * 1.4,
            background: s.kleur,
            borderRadius: s.rond ? "50%" : "2px",
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duur}s`,
            ["--drift" as string]: `${s.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
