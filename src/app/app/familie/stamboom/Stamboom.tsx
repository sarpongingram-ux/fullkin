"use client"

import { useMemo, useRef, useEffect } from "react"
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

// Afmetingen van de tekening.
const STAP_X = 96 // horizontale afstand tussen slots
const RIJ_H = 150 // verticale afstand tussen generaties
const PAD = 48
const NODE = 60 // avatar-diameter

export function Stamboom({
  personen,
  relaties,
  meId,
}: {
  personen: Persoon[]
  relaties: Relatie[]
  meId: string
}) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

  const layout = useMemo(() => {
    const byId = new Map(personen.map((p) => [p.id, p]))

    const kinderenVan = new Map<string, string[]>() // ouder -> kinderen
    const oudersVan = new Map<string, string[]>() // kind -> ouders
    const partnerVan = new Map<string, string>()

    for (const r of relaties) {
      if (!byId.has(r.from_person) || !byId.has(r.to_person)) continue
      if (r.kind === "parent") {
        const k = kinderenVan.get(r.from_person) ?? []
        k.push(r.to_person)
        kinderenVan.set(r.from_person, k)
        const o = oudersVan.get(r.to_person) ?? []
        o.push(r.from_person)
        oudersVan.set(r.to_person, o)
      } else {
        partnerVan.set(r.from_person, r.to_person)
        partnerVan.set(r.to_person, r.from_person)
      }
    }

    // Stel eenheden samen: alleenstaand [a] of een koppel [a, b].
    const eenheidVan = new Map<string, string>() // persoon -> eenheid-id
    const eenheden = new Map<string, string[]>() // eenheid-id -> personen
    const gezien = new Set<string>()
    for (const p of personen) {
      if (gezien.has(p.id)) continue
      const partner = partnerVan.get(p.id)
      if (partner && byId.has(partner) && !gezien.has(partner)) {
        eenheden.set(p.id, [p.id, partner])
        eenheidVan.set(p.id, p.id)
        eenheidVan.set(partner, p.id)
        gezien.add(p.id)
        gezien.add(partner)
      } else {
        eenheden.set(p.id, [p.id])
        eenheidVan.set(p.id, p.id)
        gezien.add(p.id)
      }
    }

    // Ouder-eenheid per kind-eenheid (primaire ouder = eerste ouder).
    const ouderEenheid = new Map<string, string>()
    const eenheidKinderen = new Map<string, string[]>()
    for (const [uid, leden] of eenheden) {
      const primair = leden[0]
      const ouders = oudersVan.get(primair)
      if (ouders && ouders.length) {
        const pe = eenheidVan.get(ouders[0])
        if (pe && pe !== uid) {
          ouderEenheid.set(uid, pe)
          const lijst = eenheidKinderen.get(pe) ?? []
          lijst.push(uid)
          eenheidKinderen.set(pe, lijst)
        }
      }
    }

    // Generatie (diepte vanaf de stamouders).
    const gen = new Map<string, number>()
    const bepaalGen = (uid: string, pad = new Set<string>()): number => {
      if (gen.has(uid)) return gen.get(uid)!
      if (pad.has(uid)) return 0 // veiligheid tegen cycli
      pad.add(uid)
      const pe = ouderEenheid.get(uid)
      const g = pe ? bepaalGen(pe, pad) + 1 : 0
      gen.set(uid, g)
      return g
    }
    for (const uid of eenheden.keys()) bepaalGen(uid)

    // Horizontale plaatsing: bladeren op volgorde, ouders gecentreerd erboven.
    const midden = new Map<string, number>() // eenheid -> slot-midden
    let cursor = 0
    const plaats = (uid: string) => {
      const breedte = eenheden.get(uid)!.length // 1 of 2
      const kinderen = (eenheidKinderen.get(uid) ?? []).slice().sort((a, b) => {
        const pa = byId.get(eenheden.get(a)![0])
        const pb = byId.get(eenheden.get(b)![0])
        return (pa?.born_on ?? "").localeCompare(pb?.born_on ?? "")
      })
      if (!kinderen.length) {
        midden.set(uid, cursor + (breedte - 1) / 2)
        cursor += breedte
      } else {
        kinderen.forEach(plaats)
        const xs = kinderen.map((k) => midden.get(k)!)
        midden.set(uid, (Math.min(...xs) + Math.max(...xs)) / 2)
      }
    }
    const wortels = [...eenheden.keys()].filter((u) => !ouderEenheid.has(u))
    // Wortels met de meeste nakomelingen eerst, oudste bovenaan.
    wortels.sort((a, b) => {
      const pa = byId.get(eenheden.get(a)![0])
      const pb = byId.get(eenheden.get(b)![0])
      return (pa?.born_on ?? "").localeCompare(pb?.born_on ?? "")
    })
    for (const w of wortels) {
      plaats(w)
      cursor += 0.6 // ademruimte tussen losse takken
    }

    // Pixelposities per persoon.
    type Node = {
      id: string
      x: number
      y: number
      persoon: Persoon
    }
    const nodes: Node[] = []
    const nodePos = new Map<string, { x: number; y: number }>()
    for (const [uid, leden] of eenheden) {
      const cx = midden.get(uid)! * STAP_X + PAD
      const cy = gen.get(uid)! * RIJ_H + PAD
      leden.forEach((pid, i) => {
        // koppel: twee nodes links/rechts van het midden
        const dx = leden.length === 2 ? (i === 0 ? -STAP_X * 0.55 : STAP_X * 0.55) : 0
        const p = byId.get(pid)!
        const pos = { x: cx + dx, y: cy }
        nodePos.set(pid, pos)
        nodes.push({ id: pid, x: pos.x, y: pos.y, persoon: p })
      })
    }

    // Verbindingslijnen ouder-eenheid → kind-eenheid.
    const lijnen: { d: string }[] = []
    for (const [kind, ouder] of ouderEenheid) {
      const ox = midden.get(ouder)! * STAP_X + PAD
      const oy = gen.get(ouder)! * RIJ_H + PAD + NODE / 2
      const kx = midden.get(kind)! * STAP_X + PAD
      const ky = gen.get(kind)! * RIJ_H + PAD - NODE / 2
      const midY = (oy + ky) / 2
      lijnen.push({
        d: `M ${ox} ${oy} L ${ox} ${midY} L ${kx} ${midY} L ${kx} ${ky}`,
      })
    }

    // Partnerlijnen (binnen een koppel).
    const partnerLijnen: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (const [uid, leden] of eenheden) {
      if (leden.length === 2) {
        const a = nodePos.get(leden[0])!
        const b = nodePos.get(leden[1])!
        partnerLijnen.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
      }
    }

    const maxGen = Math.max(0, ...[...gen.values()])
    const width = cursor * STAP_X + PAD * 2
    const height = maxGen * RIJ_H + PAD * 2 + NODE

    return { nodes, lijnen, partnerLijnen, width, height }
  }, [personen, relaties])

  // Start gecentreerd op jezelf (beide richtingen), zodat je meteen je eigen
  // tak ziet en van daaruit kunt rondkijken.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ik = layout.nodes.find((n) => n.id === meId) ?? layout.nodes[0]
    if (ik) {
      el.scrollLeft = Math.max(0, ik.x - el.clientWidth / 2)
      el.scrollTop = Math.max(0, ik.y - el.clientHeight / 2)
    }
  }, [layout, meId])

  function initialen(p: Persoon) {
    return (p.first_name[0] ?? "") + (p.last_name[0] ?? "")
  }
  function jaar(iso: string | null) {
    return iso ? iso.slice(0, 4) : null
  }

  if (layout.nodes.length === 0) {
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

  return (
    <>
    <div
      ref={scrollRef}
      className="fk-card p-0 overflow-auto"
      style={{ height: "70vh", touchAction: "pan-x pan-y" }}
    >
      <div
        className="relative"
        style={{ width: layout.width, height: layout.height }}
      >
        {/* Verbindingslijnen */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={layout.width}
          height={layout.height}
        >
          {layout.lijnen.map((l, i) => (
            <path
              key={i}
              d={l.d}
              fill="none"
              stroke="var(--rand)"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          ))}
          {layout.partnerLijnen.map((l, i) => (
            <line
              key={`p${i}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="var(--goud)"
              strokeWidth={3}
            />
          ))}
        </svg>

        {/* Personen */}
        {layout.nodes.map((n) => {
          const isIk = n.id === meId
          const overleden = !!n.persoon.died_on
          const j = jaar(n.persoon.born_on)
          return (
            <button
              key={n.id}
              onClick={() => router.push(`/app/persoon/${n.id}`)}
              className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: n.x, top: n.y, width: STAP_X }}
            >
              <span
                className={`flex items-center justify-center rounded-full text-white font-black overflow-hidden transition-transform group-active:scale-95 ${
                  isIk ? "ring-4 ring-terracotta" : ""
                }`}
                style={{
                  width: NODE,
                  height: NODE,
                  background: overleden ? "var(--inkt-zacht)" : "var(--terracotta)",
                  opacity: overleden ? 0.7 : 1,
                  boxShadow: "var(--schaduw)",
                }}
              >
                {n.persoon.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.persoon.photo_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg">{initialen(n.persoon)}</span>
                )}
              </span>
              <span className="text-xs font-bold text-inkt leading-tight text-center max-w-[84px] truncate">
                {isIk ? "Jij" : n.persoon.first_name}
              </span>
              {j && (
                <span className="text-[10px] text-inkt-zacht leading-none">
                  {overleden ? "🕯️ " : ""}
                  {j}
                </span>
              )}
            </button>
          )
        })}
      </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-xs text-inkt-zacht font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-terracotta ring-2 ring-terracotta ring-offset-1" />
          Jij
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-[3px] rounded-full bg-goud" /> partners
        </span>
        <span>🕯️ overleden</span>
        <span>👆 sleep om rond te kijken</span>
      </div>
    </>
  )
}
