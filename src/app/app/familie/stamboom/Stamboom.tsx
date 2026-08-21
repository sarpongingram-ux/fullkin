"use client"

import { useMemo, useState } from "react"
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

// Layout-maten (in SVG-eenheden).
const COL = 140 // horizontale ruimte per persoon-kolom
const ROW = 168 // verticale ruimte per generatie
const AV = 22 // straal avatar
const COUPLE = 38 // halve afstand tussen partners
const PAD = 70 // marge rond de tekening

function initialen(voor: string, achter: string) {
  return ((voor[0] ?? "") + (achter[0] ?? "")).toUpperCase()
}
function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}
// Kleur per generatie: goud (oudste) → blauw (jongste).
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

    // Eenheden: alleenstaand of een koppel. De eerste persoon is de "drager".
    const unitLeden = new Map<string, string[]>()
    const unitVan = new Map<string, string>()
    const gezien = new Set<string>()
    for (const p of personen) {
      if (gezien.has(p.id)) continue
      const partner = partnerVan.get(p.id)
      if (partner && byId.has(partner) && !gezien.has(partner)) {
        unitLeden.set(p.id, [p.id, partner])
        unitVan.set(p.id, p.id)
        unitVan.set(partner, p.id)
        gezien.add(p.id).add(partner)
      } else {
        unitLeden.set(p.id, [p.id])
        unitVan.set(p.id, p.id)
        gezien.add(p.id)
      }
    }

    // Primaire ouder-eenheid (voor de boomstructuur) + kinderen per eenheid.
    const ouderUnit = new Map<string, string>()
    const kinderen = new Map<string, string[]>()
    for (const [uid, leden] of unitLeden) {
      const ouders = oudersVan.get(leden[0])
      if (ouders?.length) {
        const pe = unitVan.get(ouders[0])
        if (pe && pe !== uid) {
          ouderUnit.set(uid, pe)
          const l = kinderen.get(pe) ?? []
          l.push(uid)
          kinderen.set(pe, l)
        }
      }
    }

    const geboorte = (uid: string) => byId.get(unitLeden.get(uid)![0])?.born_on ?? "9999"
    const naam = (uid: string) => byId.get(unitLeden.get(uid)![0])?.first_name ?? ""
    const sorteer = (a: string, b: string) =>
      geboorte(a).localeCompare(geboorte(b)) || naam(a).localeCompare(naam(b))

    // Stamouders (geen ouder-eenheid) = wortels van het bos.
    const wortels = [...unitLeden.keys()]
      .filter((u) => !ouderUnit.has(u))
      .sort(sorteer)

    // Rij (generatie) = diepte in het bos, vanaf de wortels.
    const rij = new Map<string, number>()
    const zetRij = (u: string, d: number) => {
      rij.set(u, d)
      for (const c of (kinderen.get(u) ?? []).slice().sort(sorteer)) zetRij(c, d + 1)
    }
    for (const w of wortels) zetRij(w, 0)
    for (const u of unitLeden.keys()) if (!rij.has(u)) rij.set(u, 0)

    // Horizontale plaatsing: nette "tidy tree". Bladeren krijgen oplopende
    // kolommen, ouders komen precies boven het midden van hun kinderen.
    const kolom = new Map<string, number>()
    let cursor = 0
    const plaats = (u: string) => {
      const ch = (kinderen.get(u) ?? []).slice().sort(sorteer)
      if (ch.length === 0) {
        kolom.set(u, cursor)
        cursor += 1
        return
      }
      for (const c of ch) plaats(c)
      const eerste = kolom.get(ch[0])!
      const laatste = kolom.get(ch[ch.length - 1])!
      kolom.set(u, (eerste + laatste) / 2)
    }
    for (const w of wortels) {
      plaats(w)
      cursor += 1 // ruimte tussen aparte stamtakken
    }

    // Persoon-posities.
    type Node = {
      id: string
      persoon: Persoon
      x: number
      y: number
      rij: number
    }
    const nodes: Node[] = []
    const posVan = new Map<string, { x: number; y: number }>()
    const centerVan = new Map<string, { x: number; y: number }>()
    for (const [uid, leden] of unitLeden) {
      const cx = kolom.get(uid)! * COL
      const cy = rij.get(uid)! * ROW
      centerVan.set(uid, { x: cx, y: cy })
      leden.forEach((pid, i) => {
        const x =
          leden.length === 2 ? (i === 0 ? cx - COUPLE : cx + COUPLE) : cx
        posVan.set(pid, { x, y: cy })
        nodes.push({ id: pid, persoon: byId.get(pid)!, x, y: cy, rij: rij.get(uid)! })
      })
    }

    // Verbindingslijnen (rechte "elleboog"-lijnen ouder → kind).
    const lijnen: string[] = []
    for (const [kindU, pu] of ouderUnit) {
      const p = centerVan.get(pu)!
      const k = centerVan.get(kindU)!
      const py = p.y + AV
      const ky = k.y - AV
      const midY = (py + ky) / 2
      lijnen.push(`M${p.x},${py} L${p.x},${midY} L${k.x},${midY} L${k.x},${ky}`)
    }

    // Tweede ouder (samengestelde gezinnen: bv. een opvoedvader). Lichte,
    // gestippelde lijn van die ouder naar het kind, zodat de band zichtbaar is.
    const extraLijnen: string[] = []
    for (const [uid, leden] of unitLeden) {
      const ouders = oudersVan.get(leden[0]) ?? []
      const primair = ouders[0]
      const primU = primair ? unitVan.get(primair) : undefined
      for (const q of ouders.slice(1)) {
        if (!posVan.has(q)) continue
        if (unitVan.get(q) === primU) continue // al gedekt door partnerlijn
        const a = posVan.get(q)!
        const k = centerVan.get(uid)!
        const midY = (a.y + AV + (k.y - AV)) / 2
        extraLijnen.push(
          `M${a.x},${a.y + AV} L${a.x},${midY} L${k.x},${midY} L${k.x},${k.y - AV}`,
        )
      }
    }

    // Partnerbalkjes.
    const partnerLijnen: string[] = []
    for (const [, leden] of unitLeden) {
      if (leden.length === 2) {
        const a = posVan.get(leden[0])!
        const b = posVan.get(leden[1])!
        partnerLijnen.push(`M${a.x + AV},${a.y} L${b.x - AV},${b.y}`)
      }
    }

    // Bounding box.
    let minX = 0,
      maxX = 0,
      maxRij = 0
    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x)
      maxRij = Math.max(maxRij, n.rij)
    }
    const vb = {
      x: minX - PAD,
      y: -PAD,
      w: maxX - minX + PAD * 2,
      h: maxRij * ROW + PAD * 2,
    }

    return {
      nodes,
      lijnen,
      extraLijnen,
      partnerLijnen,
      vb,
      generaties: maxRij + 1,
    }
  }, [personen, relaties])

  if (model.nodes.length === 0) {
    return (
      <div className="fk-card text-center py-10">
        <p className="text-5xl mb-3">🌱</p>
        <p className="font-black text-inkt text-lg">De boom moet nog groeien</p>
        <p className="text-inkt-zacht mt-1">
          Voeg familieleden toe en leg vast wie wiens ouder is. Dan verschijnt
          hier jullie stamboom.
        </p>
      </div>
    )
  }

  const gMax = Math.max(1, model.generaties - 1)

  return (
    <>
      <div
        className="fk-card p-2 overflow-auto"
        style={{ maxHeight: "78vh" }}
      >
        <svg
          viewBox={`${model.vb.x} ${model.vb.y} ${model.vb.w} ${model.vb.h}`}
          style={{
            width: `${zoom * 100}%`,
            display: "block",
            margin: "0 auto",
          }}
        >
          {/* Zachte generatiebanden om het oog te leiden. */}
          {Array.from({ length: model.generaties }).map((_, g) =>
            g % 2 === 1 ? (
              <rect
                key={`band-${g}`}
                x={model.vb.x}
                y={g * ROW - ROW / 2}
                width={model.vb.w}
                height={ROW}
                fill="var(--oppervlak)"
                opacity={0.7}
              />
            ) : null,
          )}

          {/* Verbindingslijnen ouder → kind. */}
          <g fill="none" stroke="var(--rand)" strokeWidth={2.5} strokeLinejoin="round">
            {model.lijnen.map((d, i) => (
              <path key={`l-${i}`} d={d} />
            ))}
          </g>
          {/* Tweede-ouder-lijnen (bv. opvoedouder). */}
          <g
            fill="none"
            stroke="var(--inkt-zacht)"
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinejoin="round"
            opacity={0.6}
          >
            {model.extraLijnen.map((d, i) => (
              <path key={`e-${i}`} d={d} />
            ))}
          </g>
          {/* Partnerbalkjes. */}
          <g fill="none" stroke="var(--goud)" strokeWidth={3.5}>
            {model.partnerLijnen.map((d, i) => (
              <path key={`p-${i}`} d={d} />
            ))}
          </g>

          {/* Personen. */}
          {model.nodes.map((n) => {
            const isIk = n.id === meId
            const overleden = !!n.persoon.died_on
            const kleur = overleden
              ? "var(--inkt-zacht)"
              : genKleur(n.rij / gMax)
            const clip = `foto-${n.id}`
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/app/persoon/${n.id}`)}
              >
                {n.persoon.photo_url && (
                  <clipPath id={clip}>
                    <circle r={AV} />
                  </clipPath>
                )}
                <circle
                  r={AV}
                  fill="#ffffff"
                  stroke={isIk ? "var(--goud)" : kleur}
                  strokeWidth={isIk ? 4 : 3}
                  opacity={overleden ? 0.85 : 1}
                />
                {n.persoon.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <image
                    href={n.persoon.photo_url}
                    x={-AV}
                    y={-AV}
                    width={AV * 2}
                    height={AV * 2}
                    clipPath={`url(#${clip})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={AV * 0.72}
                    fontWeight={800}
                    fill={overleden ? "var(--inkt-zacht)" : kleur}
                  >
                    {initialen(n.persoon.first_name, n.persoon.last_name)}
                  </text>
                )}
                {overleden && (
                  <text
                    y={-AV - 6}
                    textAnchor="middle"
                    fontSize={16}
                  >
                    🕯️
                  </text>
                )}
                <text
                  y={AV + 17}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight={isIk ? 900 : 700}
                  fill={isIk ? "var(--terracotta)" : "var(--inkt)"}
                >
                  {isIk ? "Jij" : n.persoon.first_name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legenda + zoom. */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-inkt-zacht font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: "var(--goud)" }} />
            oudste gen.
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: "var(--terracotta)" }} />
            jongste
          </span>
          <span>🕯️ overleden</span>
          <span>- - opvoed/stief</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.5) * 10) / 10))}
            disabled={zoom <= 0.5}
            aria-label="Uitzoomen"
            className="w-11 h-11 rounded-full bg-white text-inkt text-2xl font-black flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
            style={{ boxShadow: "var(--schaduw)" }}
          >
            −
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(4, Math.round((z + 0.5) * 10) / 10))}
            disabled={zoom >= 4}
            aria-label="Inzoomen"
            className="w-11 h-11 rounded-full bg-white text-inkt text-2xl font-black flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
            style={{ boxShadow: "var(--schaduw)" }}
          >
            +
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-inkt-zacht mt-3 px-4">
        {familieNaam} · {personen.length} mensen over {model.generaties}{" "}
        {model.generaties === 1 ? "generatie" : "generaties"}. Tik op iemand voor
        meer. 🌳
      </p>
    </>
  )
}
