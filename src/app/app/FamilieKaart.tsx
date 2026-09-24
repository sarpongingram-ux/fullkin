import Link from "next/link"
import { totaalZichtbaar } from "@/lib/collecte/privacy"

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
  contributor_count: number
}

type Stats = { total: number; known: number; silent: number; out_of_touch: number }

type Verjaardag = {
  person_id: string
  naam: string
  wordt: number
  dagen_tot: number
} | null

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
  collectes,
  dromen,
  mijnPersonId,
  businessDromen,
  ongelezenMeldingen,
  komendeVerjaardag,
  partnerNudge,
  geboorteHerinnering,
  vorm,
}: {
  voornaam: string
  familieNaam: string
  stats: Stats
  collectes: Collecte[]
  dromen: Droom[]
  mijnPersonId: string | null
  mijnDroom: Droom | null
  isCoFounder: boolean
  businessDromen: BusinessDroom[]
  ongelezenMeldingen: number
  komendeVerjaardag: Verjaardag
  partnerNudge: { partnerNaam: string } | null
  geboorteHerinnering: {
    eigenOntbreekt: boolean
    aantalAnders: number
    meId: string | null
  }
  vorm: { leden: number; herkend: number; generaties: number }
}) {
  const anderenDromen = dromen.filter((d) => d.person_id !== mijnPersonId)

  // Eén grote actieknop op basis van context.
  const jarigBinnenkort =
    komendeVerjaardag && komendeVerjaardag.dagen_tot <= 7
  const cta = jarigBinnenkort
    ? {
        tekst: `Vier ${komendeVerjaardag!.naam.split(" ")[0]}'s verjaardag 🎂`,
        href: "/app/mijlpalen",
      }
    : stats.total <= 1
      ? { tekst: "Nodig je familie uit 👨‍👩‍👧‍👦", href: "/app/familie" }
      : collectes.length > 0
        ? {
            tekst: `Draag bij aan ${collectes[0].voornaam} ❤️`,
            href: `/app/collecte/${collectes[0].id}`,
          }
        : { tekst: "Start een collecte ❤️", href: "/app/familie" }

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-8">
      {/* Familienaam groot + meldingen */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
            FULLKIN
          </p>
          <h1 className="text-3xl font-black text-inkt mt-1 leading-tight">
            {familieNaam}
          </h1>
          <p className="text-inkt-zacht mt-1">Fijn dat je er bent, {voornaam}.</p>
        </div>
        <Link
          href="/app/meldingen"
          className="relative shrink-0 w-12 h-12 rounded-2xl bg-oppervlak flex items-center justify-center text-xl"
          aria-label="Meldingen"
        >
          🔔
          {ongelezenMeldingen > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-terracotta text-white text-xs font-black flex items-center justify-center">
              {ongelezenMeldingen > 9 ? "9+" : ongelezenMeldingen}
            </span>
          )}
        </Link>
      </header>

      {/* Magic moment: je familie krijgt vorm — Fullkin rekent de relaties zelf uit. */}
      <section className="fk-card-white text-center">
        <p className="text-terracotta font-extrabold tracking-[0.18em] text-xs">
          JE FAMILIE KRIJGT VORM 🌱
        </p>
        <p className="fk-stat-num text-inkt mt-2">{vorm.leden}</p>
        <p className="text-sm text-inkt-zacht font-semibold">
          {vorm.leden === 1 ? "familielid" : "familieleden"}
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-rand">
          <div>
            <p className="text-2xl font-black text-groen">{vorm.herkend}</p>
            <p className="text-xs text-inkt-zacht mt-0.5">
              relaties automatisch herkend
            </p>
          </div>
          <div>
            <p className="text-2xl font-black text-goud">{vorm.generaties}</p>
            <p className="text-xs text-inkt-zacht mt-0.5">
              {vorm.generaties === 1 ? "generatie" : "generaties"} in beeld
            </p>
          </div>
        </div>
      </section>

      {/* Groei-motor: familie uitnodigen is de belangrijkste actie. */}
      <Link href="/app/familie" className="fk-btn fk-btn-primary fk-btn-full">
        Nodig familie uit 👨‍👩‍👧‍👦
      </Link>
      {cta.href !== "/app/familie" && (
        <Link
          href={cta.href}
          className="block text-center text-sm font-bold text-inkt-zacht hover:text-inkt -mt-4"
        >
          {cta.tekst}
        </Link>
      )}

      {/* Herinnering: eigen geboortedatum ontbreekt → viert de familie je verjaardag. */}
      {geboorteHerinnering.eigenOntbreekt && geboorteHerinnering.meId && (
        <Link
          href={`/app/persoon/${geboorteHerinnering.meId}`}
          className="fk-card block border-2 border-terracotta/40 bg-terracotta/5"
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl">🎂</span>
            <div className="min-w-0">
              <p className="font-black text-inkt leading-snug">
                Vul je geboortedatum in
              </p>
              <p className="text-sm text-inkt-zacht mt-1">
                Dan opent de familie automatisch een cadeaupot rond jouw
                verjaardag — zodat niemand het mist.
              </p>
              <span className="inline-block mt-2 text-terracotta font-bold text-sm">
                Mijn geboortedatum invullen →
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Herinnering: anderen missen een geboortedatum (alleen tonen als die van jou wél klopt). */}
      {!geboorteHerinnering.eigenOntbreekt &&
        geboorteHerinnering.aantalAnders > 0 && (
          <Link href="/app/familie" className="fk-card block fk-rise">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🎂</span>
              <div className="min-w-0">
                <p className="font-black text-inkt leading-snug">
                  {geboorteHerinnering.aantalAnders}{" "}
                  {geboorteHerinnering.aantalAnders === 1
                    ? "familielid mist een geboortedatum"
                    : "familieleden missen een geboortedatum"}
                </p>
                <p className="text-sm text-inkt-zacht mt-1">
                  Vul ze aan, dan viert de familie ook hún verjaardag met een
                  cadeaupot.
                </p>
                <span className="inline-block mt-2 text-terracotta font-bold text-sm">
                  Naar de familie →
                </span>
              </div>
            </div>
          </Link>
        )}

      {/* Partner-nudge: je hangt hier via je partner, bouw je eigen kant. */}
      {partnerNudge && (
        <Link
          href="/app/familie/nieuw"
          className="fk-card block border-2 border-terracotta/40 bg-terracotta/5 fk-rise"
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl">🌳</span>
            <div className="min-w-0">
              <p className="font-black text-inkt leading-snug">
                Breng ook jouw kant in beeld
              </p>
              <p className="text-sm text-inkt-zacht mt-1">
                Je bent hier verbonden via {partnerNudge.partnerNaam}. Je eigen
                vader- en moederskant staat er nog niet. Bouw jouw familie erbij —
                dan hoor je straks aan beide kanten thuis.
              </p>
              <span className="inline-block mt-2 text-terracotta font-bold text-sm">
                Bouw mijn vader- of moederskant →
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Familiemomenten, als kaarten, niet als lijst */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-inkt">Wat er speelt</h2>

        {komendeVerjaardag && (
          <Link
            href="/app/mijlpalen"
            className="fk-card flex items-center gap-4 fk-rise"
          >
            <span className="text-3xl">🎂</span>
            <div>
              <p className="font-bold text-inkt">
                {komendeVerjaardag.naam} wordt {komendeVerjaardag.wordt}
              </p>
              <p className="text-inkt-zacht">
                {komendeVerjaardag.dagen_tot === 0
                  ? "Vandaag! Vier mee."
                  : komendeVerjaardag.dagen_tot === 1
                    ? "Morgen al. Vier mee."
                    : `Over ${komendeVerjaardag.dagen_tot} dagen. Vier mee.`}
              </p>
            </div>
          </Link>
        )}

        {collectes.map((c) => (
          <Link
            key={c.id}
            href={`/app/collecte/${c.id}`}
            className="fk-card flex items-center gap-4"
          >
            <span className="text-3xl">❤️</span>
            <div className="min-w-0">
              <p className="font-bold text-inkt truncate">{c.title}</p>
              <p className="text-inkt-zacht">
                Collecte voor {c.voornaam}. Draag bij.
              </p>
            </div>
          </Link>
        ))}

        {anderenDromen.map((d) => {
          const pct = Math.min(
            100,
            Math.round((d.raised_cents / d.target_cents) * 100),
          )
          return (
            <Link
              key={d.dream_id}
              href={d.collection_id ? `/app/collecte/${d.collection_id}` : "#"}
              className="fk-card block"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">✨</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-inkt truncate">{d.title}</p>
                  <p className="text-inkt-zacht">
                    De droom van {d.first_name}. Help mee.
                  </p>
                </div>
              </div>
              {totaalZichtbaar(d.contributor_count) ? (
                <>
                  <div className="fk-progress mt-3">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-sm text-inkt-zacht mt-2 font-semibold">
                    {euro(d.raised_cents)} van {euro(d.target_cents)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-inkt-zacht mt-2 font-semibold">
                  Onderweg naar {euro(d.target_cents)} 💛 — voortgang vanaf 3 gevers.
                </p>
              )}
            </Link>
          )
        })}

        {businessDromen.map((b) => (
          <Link
            key={b.id}
            href={`/app/business/${b.id}`}
            className="fk-card flex items-center gap-4"
          >
            <span className="text-3xl">🚀</span>
            <div className="min-w-0">
              <p className="font-bold text-inkt truncate">{b.name}</p>
              <p className="text-inkt-zacht">
                Business Droom van {b.voornaam} ·{" "}
                {b.status === "stemming" ? "stem mee" : "bekijk"}
              </p>
            </div>
          </Link>
        ))}

        {komendeVerjaardag === null &&
          collectes.length === 0 &&
          anderenDromen.length === 0 &&
          businessDromen.length === 0 && (
            <div className="fk-card text-center py-8">
              <p className="text-4xl mb-2">🌱</p>
              <p className="font-bold text-inkt">Nog rustig hier.</p>
              <p className="text-inkt-zacht mt-1">
                Zodra iemand jarig is, een droom deelt of een collecte start, zie
                je het hier.
              </p>
            </div>
          )}
      </section>

      {/* Snelkoppelingen naar de belevingen */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-inkt">Ontdek</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/app/rad"
            className="fk-card text-center py-5 flex flex-col items-center gap-1.5"
          >
            <span className="text-3xl">🎡</span>
            <span className="font-bold text-inkt text-sm">Het Rad</span>
          </Link>
          <Link
            href="/app/stem"
            className="fk-card text-center py-5 flex flex-col items-center gap-1.5"
          >
            <span className="text-3xl">🕊️</span>
            <span className="font-bold text-inkt text-sm">De Stem</span>
          </Link>
          <Link
            href="/app/mijlpalen"
            className="fk-card text-center py-5 flex flex-col items-center gap-1.5"
          >
            <span className="text-3xl">🎂</span>
            <span className="font-bold text-inkt text-sm">Mijlpalen</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
