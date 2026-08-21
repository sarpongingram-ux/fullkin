"use client"

import { useState } from "react"
import { Claimen } from "./Claimen"

// Kleine familiemap met een uitgelichte 'jij'-plek in het midden.
const RING = [
  [0, -66], [-58, -34], [58, -34], [-64, 24], [64, 24], [-30, 56], [30, 56],
] as const

export function LidOnboarding({
  token,
  alIngelogd,
  voornaam,
  familieNaam,
  inviterNaam,
}: {
  token: string
  alIngelogd: boolean
  voornaam: string
  familieNaam: string
  inviterNaam: string
}) {
  const [stap, setStap] = useState(0)
  const initiaal = (voornaam[0] ?? "?").toUpperCase()
  const rise = (d: number) =>
    ({ animationDelay: `${0.2 + d}s` }) as React.CSSProperties

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Direct binnenkomen (sla de intro over) */}
      <div className="flex justify-end px-5 pt-5 h-12">
        {stap < 3 && (
          <button
            onClick={() => setStap(3)}
            className="text-sm font-bold text-inkt-zacht"
          >
            Direct binnenkomen →
          </button>
        )}
      </div>

      <div key={stap} className="fk-onb-screen flex-1 flex flex-col justify-center px-6">
        {stap === 0 && (
          <div className="max-w-sm mx-auto w-full text-center">
            <svg viewBox="-100 -90 200 180" className="w-56 mx-auto mb-6">
              <g fill="none" stroke="var(--klei)" strokeWidth={2}>
                {RING.map(([x, y], i) => (
                  <line key={i} x1={0} y1={0} x2={x} y2={y} className="fk-onb-line" style={{ animationDelay: `${0.4 + i * 0.06}s` }} />
                ))}
              </g>
              {RING.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={5} fill="var(--terracotta)" className="fk-onb-pop" style={{ animationDelay: `${0.15 + i * 0.08}s` }} />
              ))}
              <circle cx={0} cy={0} r={20} fill="var(--goud)" className="fk-onb-pop" />
              <text x={0} y={1} textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight={900} fill="#fff">
                {initiaal}
              </text>
            </svg>
            <h1 className="fk-onb-rise text-3xl font-black leading-tight" style={rise(0)}>
              Welkom bij {familieNaam}, {voornaam}. 👋
            </h1>
            <p className="fk-onb-rise text-inkt-zacht mt-3" style={rise(0.15)}>
              {inviterNaam} heeft jouw plek al klaargezet op de familiekaart. Je
              hoort erbij.
            </p>
          </div>
        )}

        {stap === 1 && (
          <div className="max-w-sm mx-auto w-full text-center">
            <div className="flex justify-center gap-3 mb-6">
              {[
                { l: "K", r: "· jouw oom", c: "var(--terracotta)" },
                { l: "A", r: "· jouw nicht", c: "var(--goud)" },
                { l: "R", r: "· jouw neef", c: "var(--groen)" },
              ].map((p, i) => (
                <div key={i} className="fk-onb-pop" style={{ animationDelay: `${i * 0.12}s` }}>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black mx-auto"
                    style={{ background: p.c }}
                  >
                    {p.l}
                  </div>
                  <p className="text-[11px] text-inkt-zacht mt-1 font-semibold">{p.r}</p>
                </div>
              ))}
            </div>
            <h1 className="fk-onb-rise text-3xl font-black leading-tight" style={rise(0.1)}>
              Leer je familie kennen.
            </h1>
            <p className="fk-onb-rise text-inkt-zacht mt-3" style={rise(0.25)}>
              Bij elk familielid zie je meteen wie het is en hoe jullie verbonden
              zijn — ook familie die je nog nooit ontmoette.
            </p>
          </div>
        )}

        {stap === 2 && (
          <div className="max-w-sm mx-auto w-full text-center">
            <div className="relative mb-6 flex items-center justify-center h-28">
              <div className="text-6xl fk-onb-pop">🎁</div>
              {["❤️", "❤️", "❤️"].map((h, i) => (
                <span
                  key={i}
                  className="absolute text-2xl fk-onb-rise"
                  style={{ left: `${34 + i * 12}%`, top: 4, ...rise(0.3 + i * 0.15) }}
                >
                  {h}
                </span>
              ))}
            </div>
            <h1 className="fk-onb-rise text-3xl font-black leading-tight" style={rise(0.1)}>
              De familie viert jou.
            </h1>
            <p className="fk-onb-rise text-inkt-zacht mt-3" style={rise(0.25)}>
              Op je verjaardag, je diploma, elke mijlpaal — samen. Jij hoeft niks
              te bouwen. Je hoort er gewoon bij, en de familie is er voor jou.
            </p>
          </div>
        )}

        {stap === 3 && (
          <div className="max-w-sm mx-auto w-full text-center">
            <div className="text-5xl mb-3 fk-onb-pop">💛</div>
            <h1 className="fk-onb-rise text-3xl font-black leading-tight" style={rise(0)}>
              Jouw plek staat klaar.
            </h1>
            <p className="fk-onb-rise text-inkt-zacht mt-2 mb-6" style={rise(0.12)}>
              Alleen familie. Altijd privé. Kom binnen, {voornaam}.
            </p>
            <div className="fk-onb-rise text-left" style={rise(0.2)}>
              <Claimen token={token} alIngelogd={alIngelogd} voornaam={voornaam} />
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-10 pt-4 space-y-5">
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === stap ? 22 : 8,
                background: i <= stap ? "var(--terracotta)" : "var(--rand)",
              }}
            />
          ))}
        </div>
        {stap < 3 && (
          <button
            onClick={() => setStap((s) => Math.min(3, s + 1))}
            className="fk-btn fk-btn-primary fk-btn-full mx-auto max-w-xs block"
          >
            Volgende →
          </button>
        )}
      </div>
    </main>
  )
}
