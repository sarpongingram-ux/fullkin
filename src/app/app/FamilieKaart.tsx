"use client"

import type { Enums } from "@/lib/types/database"
import Link from "next/link"
import { FamilielidToevoegen } from "./FamilielidToevoegen"
import { UitnodigenKnop } from "./UitnodigenKnop"
import { StartCollecte } from "./StartCollecte"
import { StartBusiness } from "./StartBusiness"
import { MijnDroom } from "./MijnDroom"

type Collecte = { id: string; title: string; voornaam: string }
type BusinessDroom = { id: string; name: string; voornaam: string; status: string }

export type Droom = {
  dream_id: string
  person_id: string
  first_name: string
  last_name: string
  title: string
  target_cents: number
  raised_cents: number
  collection_id: string | null
}

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

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function FamilieKaart({
  voornaam,
  familieNaam,
  stats,
  leden,
  collectes,
  dromen,
  mijnPersonId,
  mijnDroom,
  isCoFounder,
  businessDromen,
}: {
  voornaam: string
  familieNaam: string
  stats: Stats
  leden: Lid[]
  collectes: Collecte[]
  dromen: Droom[]
  mijnPersonId: string | null
  mijnDroom: Droom | null
  isCoFounder: boolean
  businessDromen: BusinessDroom[]
}) {
  const anderenDromen = dromen.filter((d) => d.person_id !== mijnPersonId)
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-5 py-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-terracotta font-semibold tracking-[0.25em] text-xs">
            FULLKIN
          </p>
          <h1 className="text-2xl font-bold text-inkt mt-1">
            Dag {voornaam}.
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 justify-end shrink-0 max-w-[55%]">
          <Link
            href="/app/rad"
            className="mt-1 rounded-full border border-goud/50 text-goud text-sm px-4 py-2 hover:bg-klei/40 transition"
          >
            Het Rad
          </Link>
          <Link
            href="/app/album"
            className="mt-1 rounded-full border border-rand text-inkt text-sm px-4 py-2 hover:bg-oppervlak transition"
          >
            Album
          </Link>
          <Link
            href="/app/pot"
            className="mt-1 rounded-full border border-rand text-inkt text-sm px-4 py-2 hover:bg-oppervlak transition"
          >
            Pot
          </Link>
          <Link
            href="/app/uitbetaling"
            className="mt-1 rounded-full border border-rand text-inkt text-sm px-4 py-2 hover:bg-oppervlak transition"
          >
            Uitbetaling
          </Link>
          {isCoFounder && (
            <Link
              href="/app/dashboard"
              className="mt-1 rounded-full bg-inkt text-white text-sm px-4 py-2 hover:opacity-90 transition"
            >
              Dashboard
            </Link>
          )}
        </div>
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

      {/* Mijn droom — één zin, één bedrag, zichtbare voortgang (sectie 7.2). */}
      <MijnDroom
        huidigeTitel={mijnDroom?.title ?? null}
        huidigStreefCents={mijnDroom?.target_cents ?? null}
        opgehaaldCents={mijnDroom?.raised_cents ?? 0}
      />

      {/* Dromen van de familie — waar je aan kunt bijdragen. */}
      {anderenDromen.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide mb-2">
            Dromen in de familie
          </h2>
          <ul className="space-y-2">
            {anderenDromen.map((d) => {
              const pct = Math.min(
                100,
                Math.round((d.raised_cents / d.target_cents) * 100),
              )
              return (
                <li key={d.dream_id}>
                  <Link
                    href={d.collection_id ? `/app/collecte/${d.collection_id}` : "#"}
                    className="block bg-oppervlak rounded-xl border border-rand p-4 hover:border-goud transition"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-inkt">{d.title}</p>
                      <span className="text-xs text-inkt-zacht">
                        {d.first_name}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-klei overflow-hidden">
                      <div
                        className="h-full rounded-full bg-goud"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-inkt-zacht mt-1.5">
                      {euro(d.raised_cents)} van {euro(d.target_cents)} · draag bij →
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Business Dromen — familie als investeerder. */}
      {businessDromen.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide mb-2">
            Business Dromen
          </h2>
          <ul className="space-y-2">
            {businessDromen.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/app/business/${b.id}`}
                  className="block bg-oppervlak rounded-xl border border-blauw/40 p-4 hover:border-blauw transition"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-inkt">{b.name}</p>
                    <span className="text-xs text-inkt-zacht">
                      {b.status === "stemming" ? "stemming loopt" : "goedgekeurd"}
                    </span>
                  </div>
                  <p className="text-sm text-inkt-zacht">
                    van {b.voornaam} · {b.status === "stemming" ? "stem mee →" : "bekijk →"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      <StartBusiness />

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
