"use client"

import type { Enums } from "@/lib/types/database"
import Link from "next/link"
import { FamilielidToevoegen } from "./FamilielidToevoegen"
import { UitnodigenKnop } from "./UitnodigenKnop"
import { StartCollecte } from "./StartCollecte"

type Collecte = { id: string; title: string; voornaam: string }

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
}

type Stats = { total: number; known: number; silent: number; out_of_touch: number }

const statusKleur: Record<Enums<"contact_status">, string> = {
  verbonden: "var(--groen)",
  stil: "var(--blauw)",
  herstellend: "var(--goud)",
}

function initialen(voor: string, achter: string) {
  return (voor[0] ?? "") + (achter[0] ?? "")
}

function jaarGeleden(iso: string | null): boolean {
  if (!iso) return true
  return new Date(iso) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
}

export function FamilieKaart({
  voornaam,
  familieNaam,
  stats,
  leden,
  collectes,
}: {
  voornaam: string
  familieNaam: string
  stats: Stats
  leden: Lid[]
  collectes: Collecte[]
}) {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-5 py-10">
      <header className="mb-8">
        <p className="text-terracotta font-semibold tracking-[0.25em] text-xs">
          FULLKIN
        </p>
        <h1 className="text-2xl font-bold text-inkt mt-1">
          Dag {voornaam}.
        </h1>
      </header>

      {/* Het zinnetje uit sectie 6 — dit is de kern van laag 1. */}
      <section className="bg-oppervlak rounded-2xl border border-rand p-6 mb-6">
        <p className="text-lg text-inkt leading-relaxed">
          Je familie bestaat uit{" "}
          <strong className="text-terracotta">{stats.total} personen</strong>.
          {stats.known > 0 && (
            <>
              {" "}Je kent er{" "}
              <strong className="text-groen">{stats.known}</strong>.
            </>
          )}
          {stats.out_of_touch > 0 && (
            <>
              {" "}Met{" "}
              <strong className="text-goud">{stats.out_of_touch}</strong> heb je
              al meer dan een jaar geen contact gehad.
            </>
          )}
        </p>
      </section>

      {/* Lopende collectes — de economische hartslag, bovenaan. */}
      {collectes.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide mb-2">
            Lopende collectes
          </h2>
          <ul className="space-y-2">
            {collectes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/collecte/${c.id}`}
                  className="block bg-oppervlak rounded-xl border border-goud/40 p-4 hover:border-goud transition"
                >
                  <p className="font-medium text-inkt">{c.title}</p>
                  <p className="text-sm text-inkt-zacht">
                    voor {c.voornaam} · draag bij →
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-3">
        <StartCollecte leden={leden} />
      </div>

      <div className="mb-4">
        <FamilielidToevoegen />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide">
          Jouw familie
        </h2>
        <span className="text-xs text-inkt-zacht">{leden.length} leden</span>
      </div>

      <ul className="space-y-2">
        {leden.map((lid) => (
          <li
            key={lid.person_id}
            className="bg-oppervlak rounded-xl border border-rand p-3"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                style={{ background: "var(--terracotta)" }}
              >
                {lid.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lid.photo_url}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  initialen(lid.first_name, lid.last_name)
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-inkt truncate">
                  {lid.first_name} {lid.last_name}
                </p>
                <p className="text-sm text-inkt-zacht">
                  {lid.label}
                  {lid.city ? ` · ${lid.city}` : ""}
                </p>
                {!lid.is_claimed && (
                  <UitnodigenKnop
                    personId={lid.person_id}
                    voornaam={lid.first_name}
                    familieNaam={familieNaam}
                    uitnodigerVoornaam={voornaam}
                  />
                )}
              </div>

              <div className="text-right shrink-0 self-start">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: statusKleur[lid.status] }}
                  title={lid.status}
                />
                {!lid.is_claimed && (
                  <p className="text-[11px] text-inkt-zacht mt-1">nog niet actief</p>
                )}
                {lid.is_claimed && jaarGeleden(lid.last_contact) && lid.status !== "stil" && (
                  <p className="text-[11px] text-goud mt-1">lang stil</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-xs text-inkt-zacht italic">
        Familie kun je niet verwijderen. Alleen de afstand tussen jullie kan
        kleiner worden.
      </p>
    </main>
  )
}
