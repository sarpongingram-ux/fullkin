import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Enums } from "@/lib/types/database"
import { MijlpaalToevoegen, MijlpaalCollecte } from "./Mijlpalen"

export const emojiVan: Record<Enums<"life_event_kind">, string> = {
  verjaardag: "🎂",
  ronde_verjaardag: "🎉",
  zwemdiploma: "🏊",
  nieuwe_school: "🎒",
  afstuderen: "🎓",
  huwelijk: "💍",
  geboorte: "👶",
  overlijden: "🕯️",
  diaspora_mijlpaal: "✈️",
  business_droom: "🚀",
  nood: "🆘",
}

export const labelVan: Record<Enums<"life_event_kind">, string> = {
  verjaardag: "Verjaardag",
  ronde_verjaardag: "Ronde verjaardag",
  zwemdiploma: "Zwemdiploma",
  nieuwe_school: "Nieuwe school",
  afstuderen: "Afstuderen",
  huwelijk: "Huwelijk",
  geboorte: "Geboorte",
  overlijden: "Overlijden",
  diaspora_mijlpaal: "Diaspora-mijlpaal",
  business_droom: "Business Droom",
  nood: "Noodhulp",
}

function dagenTekst(dagen: number): string {
  if (dagen === 0) return "vandaag"
  if (dagen === 1) return "morgen"
  if (dagen > 1) return `over ${dagen} dagen`
  if (dagen === -1) return "gisteren"
  return `${Math.abs(dagen)} dagen geleden`
}

function volleDatum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function dagenTot(iso: string): number {
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - vandaag.getTime()) / 86400000)
}

export default async function MijlpalenPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  const [{ data: verjaardagen }, { data: tijdlijn }, { data: leden }] =
    await Promise.all([
      supabase.rpc("komende_verjaardagen"),
      supabase.rpc("mijlpalen_tijdlijn"),
      supabase
        .from("persons")
        .select("id, first_name, last_name")
        .order("first_name"),
    ])

  const jarigen = verjaardagen ?? []
  const alle = tijdlijn ?? []
  const aankomend = alle.filter((m) => dagenTot(m.occurs_on) >= 0)
  const eerder = alle.filter((m) => dagenTot(m.occurs_on) < 0)
  const ledenLijst = (leden ?? []).map((l) => ({
    id: l.id,
    naam: `${l.first_name} ${l.last_name}`,
  }))

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 py-10">
      <Link href="/app" className="text-sm text-inkt-zacht hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header className="mt-4 mb-6">
        <p className="text-terracotta font-semibold tracking-[0.25em] text-xs">
          MIJLPALEN
        </p>
        <h1 className="text-2xl font-bold text-inkt mt-1">De levenslijn</h1>
        <p className="text-sm text-inkt-zacht mt-2 leading-relaxed">
          Wat er aankomt en wat er net was. Elke mijlpaal is een reden om er even
          voor elkaar te zijn.
        </p>
      </header>

      {/* Binnenkort jarig — automatisch uit de geboortedata. */}
      {jarigen.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide mb-2">
            Binnenkort jarig
          </h2>
          <ul className="space-y-2">
            {jarigen.map((v) => (
              <li
                key={v.person_id}
                className="flex items-center gap-3 rounded-xl border border-goud/40 bg-oppervlak p-4"
              >
                <span className="text-xl shrink-0">🎂</span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/persoon/${v.person_id}`}
                    className="font-medium text-inkt hover:text-terracotta transition"
                  >
                    {v.naam}
                  </Link>
                  <p className="text-sm text-inkt-zacht">
                    wordt {v.wordt} · {dagenTekst(v.dagen_tot)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Een mijlpaal toevoegen. */}
      <div className="mb-6">
        <MijlpaalToevoegen leden={ledenLijst} />
      </div>

      {/* Aankomende mijlpalen. */}
      {aankomend.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide mb-2">
            Binnenkort
          </h2>
          <ul className="space-y-2">
            {aankomend.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-rand bg-oppervlak p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{emojiVan[m.kind]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-inkt">{m.title}</p>
                    <p className="text-sm text-inkt-zacht">
                      <Link
                        href={`/app/persoon/${m.person_id}`}
                        className="hover:text-terracotta transition"
                      >
                        {m.naam}
                      </Link>{" "}
                      · {dagenTekst(dagenTot(m.occurs_on))}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <MijlpaalCollecte
                    eventId={m.id}
                    collectionId={m.collection_id}
                    voornaam={m.naam.split(" ")[0]}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Eerder. */}
      {eerder.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide mb-2">
            Eerder
          </h2>
          <ul className="space-y-2">
            {eerder.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-3 rounded-xl border border-rand bg-oppervlak p-4"
              >
                <span className="text-xl shrink-0">{emojiVan[m.kind]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-inkt">{m.title}</p>
                  <p className="text-sm text-inkt-zacht">
                    <Link
                      href={`/app/persoon/${m.person_id}`}
                      className="hover:text-terracotta transition"
                    >
                      {m.naam}
                    </Link>{" "}
                    · {volleDatum(m.occurs_on)}
                  </p>
                </div>
                {m.collection_id && (
                  <Link
                    href={`/app/collecte/${m.collection_id}`}
                    className="text-xs text-terracotta hover:underline shrink-0 mt-1"
                  >
                    collecte →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {jarigen.length === 0 && alle.length === 0 && (
        <div className="text-center py-12 px-6">
          <p className="text-5xl mb-4">🎈</p>
          <p className="text-inkt font-medium">Nog geen mijlpalen.</p>
          <p className="text-inkt-zacht mt-1">
            Voeg een verjaardag, geboorte of afstuderen toe — de familie viert mee.
          </p>
        </div>
      )}
    </main>
  )
}
