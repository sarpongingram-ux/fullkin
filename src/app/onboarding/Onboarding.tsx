"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

// Vaste posities voor de stippen op scherm 1 (geen random → geen hydration-issue).
const STIPPEN = [
  [0, -78], [-64, -46], [64, -46], [-92, 4], [92, 4], [-58, 54], [58, 54],
  [0, 82], [-30, -20], [30, -20], [-34, 26], [34, 26], [-104, -30], [104, -30],
] as const

function VoortgangsBalk({ stap, blauw }: { stap: number; blauw: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: i === stap ? 22 : 8,
            background:
              i <= stap
                ? blauw
                  ? "#ffffff"
                  : "var(--terracotta)"
                : blauw
                  ? "rgba(255,255,255,0.35)"
                  : "var(--rand)",
          }}
        />
      ))}
    </div>
  )
}

export function Onboarding() {
  const router = useRouter()
  const [stap, setStap] = useState(0)
  const [bedrag, setBedrag] = useState(0)

  const blauw = stap === 3

  // Bedrag laten optellen op scherm 3 (€0 → €460, ease-out).
  useEffect(() => {
    if (stap !== 2) {
      setBedrag(0)
      return
    }
    let raf = 0
    const start = performance.now()
    const duur = 1500
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duur)
      const eased = 1 - Math.pow(1 - p, 3)
      setBedrag(Math.round(eased * 460))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stap])

  function klaar(bestemming: string) {
    try {
      localStorage.setItem("fk_onboarding_gezien", "1")
    } catch {}
    router.push(bestemming)
  }

  const rise = (d: number) =>
    ({ animationDelay: `${0.2 + d}s` }) as React.CSSProperties

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: blauw ? "var(--terracotta)" : "var(--achtergrond)",
        color: blauw ? "#ffffff" : "var(--inkt)",
        transition: "background 0.4s ease",
      }}
    >
      {/* Overslaan */}
      <div className="flex justify-end px-5 pt-5 h-12">
        {stap < 4 && (
          <button
            onClick={() => klaar("/inloggen")}
            className="text-sm font-bold"
            style={{ color: blauw ? "rgba(255,255,255,0.8)" : "var(--inkt-zacht)" }}
          >
            Sla over
          </button>
        )}
      </div>

      {/* Scherm */}
      <div key={stap} className="fk-onb-screen flex-1 flex flex-col justify-center px-6">
        {stap === 0 && (
          <div className="max-w-sm mx-auto w-full text-center">
            <svg viewBox="-120 -100 240 200" className="w-full max-w-xs mx-auto mb-6">
              <g stroke="var(--klei)" strokeWidth={2} fill="none">
                {STIPPEN.map(([x, y], i) => (
                  <line
                    key={i}
                    x1={0}
                    y1={0}
                    x2={x}
                    y2={y}
                    className="fk-onb-line"
                    style={{ animationDelay: `${0.4 + i * 0.05}s` }}
                  />
                ))}
              </g>
              <circle cx={0} cy={0} r={9} fill="var(--terracotta)" className="fk-onb-pop" />
              {STIPPEN.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={5.5}
                  fill={i % 3 === 0 ? "var(--goud)" : "var(--terracotta)"}
                  className="fk-onb-pop"
                  style={{ animationDelay: `${0.15 + i * 0.09}s` }}
                />
              ))}
            </svg>
            <h1 className="fk-onb-rise text-4xl font-black leading-tight" style={rise(0)}>
              Jouw familie.
              <br />
              Overal ter wereld.
            </h1>
            <p className="fk-onb-rise text-inkt-zacht mt-4" style={rise(0.15)}>
              Van Amsterdam tot Accra. Van Paramaribo tot Londen.
            </p>
          </div>
        )}

        {stap === 1 && (
          <div className="max-w-sm mx-auto w-full text-center">
            <div className="relative h-40 mb-4 flex items-center justify-center">
              <div className="absolute left-1/2 top-1/2 -translate-y-1/2 h-1 w-28 rounded-full -translate-x-1/2 fk-onb-rise" style={{ background: "var(--goud)", ...rise(0.7) }} />
              <div className="absolute" style={{ left: "8%" }}>
                <p className="text-xs text-inkt-zacht mb-1 font-semibold">Nannette · Amsterdam</p>
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-white text-xl font-black fk-onb-pop" style={{ background: "var(--terracotta)" }}>
                  N
                </div>
              </div>
              <div className="absolute" style={{ right: "8%" }}>
                <p className="text-xs text-inkt-zacht mb-1 font-semibold">Boris · New York</p>
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-white text-xl font-black fk-onb-pop" style={{ background: "var(--goud)", animationDelay: "0.15s" }}>
                  B
                </div>
              </div>
            </div>
            <p className="fk-onb-rise text-sm font-bold text-goud" style={rise(0.9)}>
              Jullie overgrootvaders waren broers.
            </p>
            <h1 className="fk-onb-rise text-3xl font-black leading-tight mt-4" style={rise(0.2)}>
              Leer familie kennen die je anders nooit zou ontmoeten.
            </h1>
          </div>
        )}

        {stap === 2 && (
          <div className="max-w-sm mx-auto w-full text-center">
            <div className="relative h-36 mb-2 flex items-center justify-center">
              <span className="absolute left-1/2 -translate-x-1/2 text-4xl fk-onb-envelope" style={{ top: 6 }}>
                ✉️
              </span>
              <div className="text-center fk-onb-pop">
                <div className="text-6xl">👛</div>
                <p className="text-3xl font-black text-groen mt-1">
                  €{bedrag}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              {["Kwame", "Abena", "Richard"].map((n, i) => (
                <span
                  key={n}
                  className="fk-onb-rise text-sm bg-oppervlak rounded-full px-3 py-1 font-semibold"
                  style={rise(0.4 + i * 0.2)}
                >
                  {n} ❤️
                </span>
              ))}
            </div>
            <h1 className="fk-onb-rise text-3xl font-black leading-tight" style={rise(0.2)}>
              Jouw familie viert jou. Samen.
            </h1>
            <p className="fk-onb-rise text-inkt-zacht mt-3" style={rise(0.35)}>
              Op je verjaardag. Bij je diploma. Bij elke mijlpaal die telt.
            </p>
          </div>
        )}

        {stap === 3 && (
          <div className="max-w-sm mx-auto w-full text-center">
            <div className="relative h-40 mb-4 flex items-center justify-center">
              <div className="text-7xl fk-onb-grow">👛</div>
              {["🪙", "🪙", "🪙"].map((c, i) => (
                <span
                  key={i}
                  className="absolute text-3xl fk-onb-coin"
                  style={{ left: `${38 + i * 10}%`, top: 0, animationDelay: `${0.4 + i * 0.2}s` }}
                >
                  {c}
                </span>
              ))}
            </div>
            <h1 className="fk-onb-rise text-4xl font-black leading-tight" style={rise(0.2)}>
              Jij bouwt de familie.
              <br />
              De familie bouwt jou.
            </h1>
            <p className="fk-onb-rise mt-4 font-semibold" style={{ color: "var(--goud)", ...rise(0.4) }}>
              Als Family Keeper verdien jij aan elke transactie in jouw familie.
              Hoe actiever jullie zijn — hoe meer iedereen verdient.
            </p>
          </div>
        )}

        {stap === 4 && (
          <div className="max-w-sm mx-auto w-full text-center">
            <p className="fk-onb-shimmer text-2xl font-black tracking-[0.3em] mb-6">
              FULLKIN
            </p>
            <h1 className="fk-onb-rise text-4xl font-black leading-tight" style={rise(0.1)}>
              Your family. Complete.
            </h1>
            <p className="fk-onb-rise text-inkt-zacht mt-3" style={rise(0.2)}>
              Gratis voor alle familieleden. Jij bouwt. Zij profiteren. Iedereen
              groeit.
            </p>
            <div className="mt-6 space-y-2 text-left max-w-xs mx-auto">
              {[
                ["👨‍👩‍👧‍👦", "Leer je familie kennen"],
                ["💰", "Bouw een familie-economie"],
                ["🌍", "Verbind generaties wereldwijd"],
              ].map(([emoji, tekst], i) => (
                <div
                  key={tekst}
                  className="fk-onb-rise flex items-center gap-3 fk-card py-3"
                  style={rise(0.3 + i * 0.12)}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="font-bold text-inkt">{tekst}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 space-y-3">
              <button
                onClick={() => klaar("/inloggen")}
                className="fk-btn fk-btn-primary fk-btn-full"
              >
                Start mijn familie →
              </button>
              <button
                onClick={() => klaar("/inloggen")}
                className="text-sm font-bold text-inkt-zacht hover:text-inkt"
              >
                Ik ben uitgenodigd door een familielid
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onderbalk: voortgang + Volgende */}
      <div className="px-6 pb-10 pt-4 space-y-5">
        <VoortgangsBalk stap={stap} blauw={blauw} />
        {stap < 4 && (
          <button
            onClick={() => setStap((s) => Math.min(4, s + 1))}
            className="fk-btn fk-btn-full mx-auto max-w-xs block"
            style={{
              background: blauw ? "#ffffff" : "var(--terracotta)",
              color: blauw ? "var(--terracotta)" : "#ffffff",
            }}
          >
            Volgende →
          </button>
        )}
      </div>
    </main>
  )
}
