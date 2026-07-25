import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Bijdragen } from "./Bijdragen"

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100)
}

function initialen(voor: string, achter: string) {
  return (voor[0] ?? "") + (achter[0] ?? "")
}

export default async function CollectiePagina({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")

  const { data: collectie } = await supabase
    .from("collections")
    .select("id, title, message, suggested_cents, status, beneficiary_id")
    .eq("id", id)
    .single()

  if (!collectie) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-inkt-zacht">Deze collecte bestaat niet.</p>
      </main>
    )
  }

  const [{ data: begunstigde }, { data: totaal }, { data: gevers }] =
    await Promise.all([
      supabase
        .from("persons")
        .select("first_name, last_name, city")
        .eq("id", collectie.beneficiary_id)
        .single(),
      supabase.rpc("collection_total", { col: id }).single(),
      supabase.rpc("collection_contributors", { col: id }),
    ])

  const total = totaal?.total_cents ?? 0
  const aantal = totaal?.contributor_count ?? 0
  const alBijgedragen = (gevers ?? []).some((g) => g.contributor_id === meId)
  const isBegunstigde = collectie.beneficiary_id === meId

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-5 py-10">
      <Link href="/app" className="text-sm text-inkt-zacht hover:text-inkt">
        ← Terug
      </Link>

      <header className="mt-4 mb-6">
        <p className="text-terracotta font-semibold tracking-[0.25em] text-xs">
          COLLECTE
        </p>
        <h1 className="text-2xl font-bold text-inkt mt-1">{collectie.title}</h1>
        <p className="text-inkt-zacht mt-1">
          voor {begunstigde?.first_name} {begunstigde?.last_name}
          {begunstigde?.city ? ` · ${begunstigde.city}` : ""}
        </p>
      </header>

      {/* Het totaal is het feest — dat mag iedereen zien. */}
      <section className="bg-oppervlak rounded-2xl border border-rand p-6 mb-4 text-center">
        <p className="text-4xl font-bold text-terracotta">{euro(total)}</p>
        <p className="text-sm text-inkt-zacht mt-1">
          bijeengebracht door {aantal} {aantal === 1 ? "familielid" : "familieleden"}
        </p>
      </section>

      {/* Bijdragen — alleen als je niet de begunstigde bent en nog niet gaf. */}
      {collectie.status === "open" && !isBegunstigde && !alBijgedragen && (
        <Bijdragen
          collectieId={id}
          suggestieCents={collectie.suggested_cents}
          voornaamBegunstigde={begunstigde?.first_name ?? ""}
        />
      )}
      {alBijgedragen && (
        <p className="text-center text-sm text-groen mb-4">
          Je hebt bijgedragen. Dankjewel.
        </p>
      )}

      {/* Wie gaf — namen, nooit bedragen. Dit is de wet uit sectie 7.1. */}
      <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide mt-8 mb-3">
        Wie heeft bijgedragen
      </h2>
      <ul className="space-y-2">
        {(gevers ?? []).map((g, i) => (
          <li
            key={i}
            className="bg-oppervlak rounded-xl border border-rand p-3 flex items-center gap-3"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              style={{ background: g.hide_name ? "var(--inkt-zacht)" : "var(--terracotta)" }}
            >
              {g.hide_name ? "?" : initialen(g.first_name, g.last_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-inkt">
                {g.hide_name ? "Een familielid" : `${g.first_name} ${g.last_name}`}
              </p>
              {g.message && (
                <p className="text-sm text-inkt-zacht truncate">{g.message}</p>
              )}
            </div>
          </li>
        ))}
        {(gevers ?? []).length === 0 && (
          <li className="text-sm text-inkt-zacht text-center py-4">
            Nog niemand heeft bijgedragen. Wees de eerste.
          </li>
        )}
      </ul>

      <p className="mt-8 text-center text-xs text-inkt-zacht leading-relaxed">
        Iedereen ziet wie heeft bijgedragen. Niemand ziet hoeveel. De oma die
        €0,75 geeft staat naast de oom die €200 geeft.
      </p>
    </main>
  )
}
