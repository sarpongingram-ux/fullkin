"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

type Persoon = {
  id: string
  first_name: string
  last_name: string
  photo_url: string | null
  born_on: string | null
  died_on: string | null
}
type Relatie = {
  kind: "parent" | "partner"
  from_person: string
  to_person: string
}

const VIEW = 1000 // viewBox is -500..500
const MAX_R = 430 // buitenste ring; marge voor labels
const START = -Math.PI / 2 // bovenaan beginnen
const ROOT = "__wortel__"

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}
// Kleur per generatie: van goud (hart) naar blauw (buitenrand).
function genKleur(t: number) {
  const g = [201, 151, 43]
  const b = [27, 79, 216]
  return `rgb(${lerp(g[0], b[0], t)},${lerp(g[1], b[1], t)},${lerp(g[2], b[2], t)})`
}

export function Stamboom({
  personen,
  relaties,
  meId,
  familieNaam,
}: {
  personen: Persoon[]
  relaties: Relatie[]
  meId: string
  familieNaam: string
}) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)

  const model = useMemo(() => {
    const byId = new Map(personen.map((p) => [p.id, p]))
    const oudersVan = new Map<string, string[]>()
    const partnerVan = new Map<string, string>()
    for (const r of relaties) {
      if (!byId.has(r.from_person) || !byId.has(r.to_person)) continue
      if (r.kind === "parent") {
        const o = oudersVan.get(r.to_person) ?? []
        o.push(r.from_person)
        oudersVan.set(r.to_person, o)
      } else {
        partnerVan.set(r.from_person, r.to_person)
        partnerVan.set(r.to_person, r.from_person)
      }
    }

    // Eenheden: alleenstaand of een koppel.
    const eenheidVan = new Map<string, string>()
    const eenheden = new Map<string, string[]>()
    const gezien = new Set<string>()
    for (const p of personen) {
      if (gezien.has(p.id)) continue
      const partner = partnerVan.get(p.id)
      if (partner && byId.has(partner) && !gezien.has(partner)) {
        eenheden.set(p.id, [p.id, partner])
        eenheidVan.set(p.id, p.id)
        eenheidVan.set(partner, p.id)
        gezien.add(p.id).add(partner)
      } else {
        eenheden.set(p.id, [p.id])
        eenheidVan.set(p.id, p.id)
        gezien.add(p.id)
      }
    }

    // Ouder-eenheid + kinderen per eenheid.
    const ouderEenheid = new Map<string, string>()
    const kinderen = new Map<string, string[]>()
    for (const [uid, leden] of eenheden) {
      const ouders = oudersVan.get(leden[0])
      if (ouders?.length) {
        const pe = eenheidVan.get(ouders[0])
        if (pe && pe !== uid) {
          ouderEenheid.set(uid, pe)
          const l = kinderen.get(pe) ?? []
          l.push(uid)
          kinderen.set(pe, l)
        }
      }
    }

    // Virtuele wortel in het hart: verbindt alle stamouders.
    const stamouders = [...eenheden.keys()].filter((u) => !ouderEenheid.has(u))
    kinderen.set(ROOT, stamouders)

    const geboorte = (uid: string) => byId.get(eenheden.get(uid)![0])?.born_on ?? ""
    const sorteer = (a: string, b: string) => geboorte(a).localeCompare(geboorte(b))

    // Aantal bladeren (voor de hoekverdeling).
    const bladeren = new Map<string, number>()
    const telBladeren = (u: string): number => {
      if (bladeren.has(u)) return bladeren.get(u)!
      const ch = kinderen.get(u) ?? []
      const n = ch.length ? ch.reduce((s, c) => s + telBladeren(c), 0) : 1
      bladeren.set(u, n)
      return n
    }
    telBladeren(ROOT)

    // Diepte (ringnummer).
    const diepte = new Map<string, number>([[ROOT, 0]])
    const bepaalDiepte = (u: string): number => {
      if (diepte.has(u)) return diepte.get(u)!
      const pe = ouderEenheid.get(u)
      const d = pe != null ? bepaalDiepte(pe) + 1 : 1
      diepte.set(u, d)
      return d
    }
    for (const u of eenheden.keys()) bepaalDiepte(u)
    const maxDiepte = Math.max(1, ...diepte.values())
    const ring = MAX_R / maxDiepte

    // Hoektoewijzing (radiale tidy tree).
    const hoek = new Map<string, number>()
    const wijsHoek = (u: string, a0: number, a1: number) => {
      hoek.set(u, (a0 + a1) / 2)
      const ch = (kinderen.get(u) ?? []).slice().sort(sorteer)
      const totaal = ch.reduce((s, c) => s + telBladeren(c), 0) || 1
      let a = a0
      for (const c of ch) {
        const span = ((a1 - a0) * telBladeren(c)) / totaal
        wijsHoek(c, a, a + span)
        a += span
      }
    }
    wijsHoek(ROOT, START, START + Math.PI * 2)

    // Posities per persoon.
    type Node = { id: string; persoon: Persoon; r: number; deg: number; diepte: number }
    const nodes: Node[] = []
    for (const [uid, leden] of eenheden) {
      const baseHoek = hoek.get(uid)!
      const r = diepte.get(uid)! * ring
      leden.forEach((pid, i) => {
        const dθ = leden.length === 2 ? (i === 0 ? -0.035 : 0.035) : 0
        const θ = baseHoek + dθ
        nodes.push({
          id: pid,
          persoon: byId.get(pid)!,
          r: Math.round(r * 100) / 100,
          deg: Math.round(((θ * 180) / Math.PI) * 1000) / 1000,
          diepte: diepte.get(uid)!,
        })
      })
    }

    // Verbindingslijnen (radiale bezier). Afronden zodat server- en client-
    // render exact dezelfde padstrings geven (geen hydration-mismatch).
    const rnd = (n: number) => Math.round(n * 100) / 100
    const pt = (r: number, θ: number) => [rnd(r * Math.cos(θ)), rnd(r * Math.sin(θ))]
    const lijnen: string[] = []
    for (const [kind, ouder] of ouderEenheid) {
      const r1 = diepte.get(kind)! * ring
      const θ1 = hoek.get(kind)!
      const dOuder = diepte.get(ouder)!
      const r0 = dOuder * ring
      const θ0 = dOuder === 0 ? θ1 : hoek.get(ouder)!
      const rc = (r0 + r1) / 2
      const [x0, y0] = pt(r0, θ0)
      const [cx1, cy1] = pt(rc, θ0)
      const [cx2, cy2] = pt(rc, θ1)
      const [x1, y1] = pt(r1, θ1)
      lijnen.push(`M${x0},${y0} C${cx1},${cy1} ${cx2},${cy2} ${x1},${y1}`)
    }
    // Stamouders vanuit het hart.
    for (const s of stamouders) {
      const r1 = diepte.get(s)! * ring
      const θ1 = hoek.get(s)!
      const [x1, y1] = pt(r1, θ1)
      const [cx, cy] = pt(r1 / 2, θ1)
      lijnen.push(`M0,0 C${cx},${cy} ${cx},${cy} ${x1},${y1}`)
    }

    // Partnerboogjes.
    const partnerBogen: string[] = []
    for (const [, leden] of eenheden) {
      if (leden.length === 2) {
        const uid = eenheidVan.get(leden[0])!
        const r = diepte.get(uid)! * ring
        const [x0, y0] = pt(r, hoek.get(uid)! - 0.035)
        const [x1, y1] = pt(r, hoek.get(uid)! + 0.035)
        partnerBogen.push(`M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`)
      }
    }

    const generaties = maxDiepte
    return { nodes, lijnen, partnerBogen, ring, generaties, maxDiepte }
  }, [personen, relaties])

  if (model.nodes.length === 0) {
    return (
      <div className="fk-card text-center py-10">
        <p className="text-5xl mb-3">🌱</p>
        <p className="font-black text-inkt text-lg">De boom moet nog groeien</p>
        <p className="text-inkt-zacht mt-1">
          Voeg familieleden toe en leg vast wie wiens ouder is — dan verschijnt
          hier jullie stamboom.
        </p>
      </div>
    )
  }

  const medR = Math.min(model.ring * 0.72, 78)

  return (
    <>
      <div
        ref={scrollRef}
        className="fk-card p-2 overflow-auto"
        style={{ maxHeight: "78vh" }}
      >
        <svg
          viewBox={`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`}
          style={{ width: `${zoom * 100}%`, display: "block", margin: "0 auto" }}
        >
          {/* Verbindingslijnen */}
          <g fill="none" stroke="var(--rand)" strokeWidth={2}>
            {model.lijnen.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          {/* Partnerboogjes */}
          <g fill="none" stroke="var(--goud)" strokeWidth={3}>
            {model.partnerBogen.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* Personen */}
          {model.nodes.map((n) => {
            const isIk = n.id === meId
            const overleden = !!n.persoon.died_on
            const nodeR = Math.max(5, 12 - n.diepte * 1.4) + (isIk ? 3 : 0)
            const degN = ((n.deg % 360) + 360) % 360
            const flip = degN > 90 && degN < 270
            const font = Math.max(9, 15 - n.diepte * 1.1)
            return (
              <g key={n.id} transform={`rotate(${n.deg})`}>
                <g transform={`translate(${n.r},0)`}>
                  <circle
                    r={nodeR}
                    fill={overleden ? "var(--inkt-zacht)" : genKleur(model.maxDiepte ? n.diepte / model.maxDiepte : 0)}
                    stroke={isIk ? "var(--goud)" : "#ffffff"}
                    strokeWidth={isIk ? 3.5 : 1.5}
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/app/persoon/${n.id}`)}
                  />
                  <g transform={flip ? "rotate(180)" : undefined}>
                    <text
                      x={flip ? -(nodeR + 5) : nodeR + 5}
                      textAnchor={flip ? "end" : "start"}
                      dominantBaseline="central"
                      fontSize={font}
                      fontWeight={isIk ? 900 : 700}
                      fill={isIk ? "var(--terracotta)" : "var(--inkt)"}
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/app/persoon/${n.id}`)}
                    >
                      {isIk ? "Jij" : n.persoon.first_name}
                    </text>
                  </g>
                </g>
              </g>
            )
          })}

          {/* Medaillon in het hart */}
          <circle r={medR} fill="var(--inkt)" />
          <text
            y={-medR * 0.12}
            textAnchor="middle"
            fontSize={medR * 0.34}
            fontWeight={900}
            fill="#ffffff"
          >
            {familieNaam.length > 14 ? familieNaam.slice(0, 13) + "…" : familieNaam}
          </text>
          <text
            y={medR * 0.42}
            textAnchor="middle"
            fontSize={medR * 0.26}
            fontWeight={700}
            fill="var(--goud)"
          >
            {personen.length} · {model.generaties} gen.
          </text>
        </svg>
      </div>

      {/* Zoom */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-inkt-zacht font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: "var(--goud)" }} />
            oudste
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: "var(--terracotta)" }} />
            jongste
          </span>
          <span>🕯️ overleden</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.5) * 10) / 10))}
            disabled={zoom <= 1}
            aria-label="Uitzoomen"
            className="w-11 h-11 rounded-full bg-white text-inkt text-2xl font-black flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
            style={{ boxShadow: "var(--schaduw)" }}
          >
            −
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.5) * 10) / 10))}
            disabled={zoom >= 3}
            aria-label="Inzoomen"
            className="w-11 h-11 rounded-full bg-white text-inkt text-2xl font-black flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
            style={{ boxShadow: "var(--schaduw)" }}
          >
            +
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-inkt-zacht mt-3 px-4">
        Jullie familie in één beeld — {personen.length} mensen over{" "}
        {model.generaties} generaties. Elke familie is uniek. 🌳
      </p>
    </>
  )
}
