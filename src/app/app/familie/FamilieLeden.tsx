"use client"

import Link from "next/link"
import type { Enums } from "@/lib/types/database"
import { FamilielidToevoegen } from "../FamilielidToevoegen"
import { UitnodigenKnop } from "../UitnodigenKnop"
import { StartCollecte } from "../StartCollecte"

type Lid = {
  person_id: string
  first_name: string
  last_name: string
  city: string | null
  country: string | null
  photo_url: string | null
  is_claimed: boolean
  label: string
  status: Enums<"contact_status">
  last_contact: string | null
  managed_by: string | null
  born_on: string | null
  died_on: string | null
}

function leeftijd(bornOn: string | null): number | null {
  if (!bornOn) return null
  const d = new Date(bornOn)
  const nu = new Date()
  let jr = nu.getFullYear() - d.getFullYear()
  const m = nu.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && nu.getDate() < d.getDate())) jr--
  return jr
}

const statusKleur: Record<Enums<"contact_status">, string> = {
  verbonden: "var(--groen)",
  stil: "var(--blauw)",
  herstellend: "var(--goud)",
}

function initialen(voor: string, achter: string) {
  return (voor[0] ?? "") + (achter[0] ?? "")
}

export function FamilieLeden({
  meId,
  voornaam,
  familieNaam,
  leden,
  isFamilyKeeper,
}: {
  meId: string
  voornaam: string
  familieNaam: string
  leden: Lid[]
  isFamilyKeeper: boolean
}) {
  const ledenVoorAnker = leden.map((l) => ({
    id: l.person_id,
    naam: `${l.first_name} ${l.last_name}`,
  }))
  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          FAMILIE
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">{familieNaam}</h1>
        <p className="text-inkt-zacht mt-1">
          {leden.length} {leden.length === 1 ? "familielid" : "familieleden"} op de kaart
        </p>
      </header>

      {/* Acties */}
      <div className="space-y-3">
        <Link href="/app/familie/stamboom" className="fk-btn fk-btn-full block bg-inkt text-white">
          🌳 Bekijk de stamboom
        </Link>
        <FamilielidToevoegen meId={meId} leden={ledenVoorAnker} />
        <StartCollecte leden={leden} />
        {isFamilyKeeper && (
          <Link href="/app/dashboard" className="fk-btn fk-btn-secondary fk-btn-full">
            📊 Family Keeper-dashboard
          </Link>
        )}
      </div>

      {/* Ledenlijst */}
      {leden.length <= 1 ? (
        <div className="fk-card text-center py-10">
          <p className="text-5xl mb-3">👋</p>
          <p className="font-black text-inkt text-lg">Jouw familie wacht op jou</p>
          <p className="text-inkt-zacht mt-1">
            Nodig je eerste familielid uit. Duurt 30 seconden.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {leden.map((lid) => {
            const jr = leeftijd(lid.born_on)
            // Beheerd kind onder de 16: geen uitnodiging, alleen een label.
            const beheerdKind =
              !lid.is_claimed &&
              lid.managed_by != null &&
              (jr == null || jr < 16)
            return (
            <li key={lid.person_id} className="fk-card">
              <div className="flex items-center gap-3">
                <Link
                  href={`/app/persoon/${lid.person_id}`}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shrink-0 overflow-hidden"
                  style={{ background: "var(--terracotta)" }}
                >
                  {lid.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lid.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initialen(lid.first_name, lid.last_name)
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/app/persoon/${lid.person_id}`}
                    className="font-bold text-inkt truncate block"
                  >
                    {lid.first_name} {lid.last_name}
                  </Link>
                  <p className="text-inkt-zacht text-sm">
                    {lid.label}
                    {lid.city ? ` · ${lid.city}` : ""}
                  </p>
                  {lid.died_on ? (
                    <p className="mt-1 text-sm text-inkt-zacht font-semibold">
                      🕯️ In herinnering
                    </p>
                  ) : beheerdKind ? (
                    <p className="mt-1 text-sm text-inkt-zacht font-semibold">
                      👶 Kind · beheerd door jou
                    </p>
                  ) : (
                    !lid.is_claimed && (
                      <div className="mt-2">
                        <UitnodigenKnop
                          personId={lid.person_id}
                          voornaam={lid.first_name}
                          familieNaam={familieNaam}
                          uitnodigerVoornaam={voornaam}
                        />
                      </div>
                    )
                  )}
                </div>

                <span
                  className="w-3 h-3 rounded-full shrink-0 self-start mt-1"
                  style={{ background: statusKleur[lid.status] }}
                  title={lid.status}
                />
              </div>
            </li>
            )
          })}
        </ul>
      )}

      <p className="text-center text-sm text-inkt-zacht px-4">
        Familie kun je niet verwijderen. Alleen de afstand tussen jullie kan
        kleiner worden. 🌍
      </p>
    </main>
  )
}
