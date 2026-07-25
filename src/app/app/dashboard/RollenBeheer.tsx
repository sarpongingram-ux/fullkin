"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { wijsRolToe } from "../rol-acties"
import type { Enums } from "@/lib/types/database"

type Rol = {
  role: Enums<"family_role">
  drempel: number
  ontgrendeld: boolean
  houder_id: string | null
  houder_naam: string | null
}

type Lid = { id: string; naam: string }

const rolNamen: Record<Enums<"family_role">, string> = {
  co_founder: "Co-Founder Family Keeper",
  events_manager: "Events Manager",
  verhalen_manager: "Verhalen Manager",
  pot_beheerder: "Pot Beheerder",
  connector: "Connector",
  welzijn_manager: "Welzijn Manager",
  mediator: "Mediator",
  archivaris: "Archivaris",
}

export function RollenBeheer({ rollen, leden }: { rollen: Rol[]; leden: Lid[] }) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  function toewijzen(role: Enums<"family_role">, personId: string) {
    if (!personId) return
    setFout(null)
    start(async () => {
      const res = await wijsRolToe(personId, role)
      if (!res.ok) setFout(res.fout)
      else router.refresh()
    })
  }

  return (
    <section className="bg-oppervlak rounded-2xl border border-rand p-5">
      <h2 className="font-semibold text-inkt mb-1">De rolstructuur</h2>
      <p className="text-sm text-inkt-zacht mb-4">
        Rollen ontgrendelen naarmate de familie groeit. Elke rolhouder verdient
        mee uit de 0,50%.
      </p>

      {fout && <p className="text-sm text-terracotta mb-3">{fout}</p>}

      <ul className="space-y-2">
        {rollen.map((r) => (
          <li
            key={r.role}
            className={`rounded-xl border p-3 ${
              r.ontgrendeld ? "border-rand bg-achtergrond" : "border-rand/50 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-inkt">{rolNamen[r.role]}</p>
                <p className="text-xs text-inkt-zacht">
                  {r.ontgrendeld
                    ? r.houder_naam
                      ? `Vervuld door ${r.houder_naam}`
                      : "Nog niet vervuld"
                    : `Ontgrendelt bij ${r.drempel} leden`}
                </p>
              </div>

              {r.role === "co_founder" ? (
                <span className="text-xs text-goud font-medium shrink-0">
                  permanent
                </span>
              ) : r.ontgrendeld ? (
                <select
                  disabled={bezig}
                  defaultValue=""
                  onChange={(e) => toewijzen(r.role, e.target.value)}
                  className="text-sm rounded-lg border border-rand bg-oppervlak px-2 py-1.5 text-inkt outline-none focus:border-terracotta shrink-0 max-w-[45%]"
                >
                  <option value="">
                    {r.houder_naam ? "Wijzig…" : "Wijs toe…"}
                  </option>
                  {leden.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.naam}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-inkt-zacht shrink-0">🔒</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
