import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Bijdragen } from "./Bijdragen"
import { settleFromSession } from "@/lib/stripe/settle"
import { Confetti } from "@/components/Confetti"
import { totaalZichtbaar } from "@/lib/collecte/privacy"

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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const { id } = await params
  const { session_id } = await searchParams

  // Terug van Stripe? Verifieer de betaling en reken direct af.
  if (session_id) {
    await settleFromSession(session_id)
  }

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
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      {session_id && <Confetti />}
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug
      </Link>

      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          COLLECTE
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">{collectie.title}</h1>
        <p className="text-inkt-zacht mt-1">
          voor {begunstigde?.first_name} {begunstigde?.last_name}
          {begunstigde?.city ? ` · ${begunstigde.city}` : ""}
        </p>
      </header>

      {/* Het totaal is het feest — maar pas zichtbaar zodra genoeg familieleden
          hebben bijgedragen. Anders kun je uit het totaal iemands eigen bedrag
          afleiden (bij 1 gever is het totaal zijn bedrag; bij 2 kan de één de
          ander uitrekenen). Vanaf 3 gevers is dat niet meer mogelijk. */}
      <section className="fk-card-dark text-center">
        {totaalZichtbaar(aantal) ? (
          <>
            <p className="fk-amount text-goud">{euro(total)}</p>
            <p className="text-sm opacity-70 mt-2">
              bijeengebracht door {aantal} familieleden
            </p>
          </>
        ) : (
          <>
            <p className="fk-amount text-goud">€ •••</p>
            <p className="text-sm opacity-70 mt-2 leading-relaxed">
              {aantal === 0
                ? "Nog geen bijdragen — wees de eerste 💛"
                : `${aantal} ${aantal === 1 ? "familielid heeft" : "familieleden hebben"} al bijgedragen. Het totaal verschijnt zodra meer familie meedoet — zo blijft ieders bedrag privé.`}
            </p>
          </>
        )}
      </section>

      {/* Bijdragen, alleen als je niet de begunstigde bent en nog niet gaf. */}
      {collectie.status === "open" && !isBegunstigde && !alBijgedragen && (
        <Bijdragen
          collectieId={id}
          suggestieCents={collectie.suggested_cents}
          voornaamBegunstigde={begunstigde?.first_name ?? ""}
        />
      )}
      {alBijgedragen && (
        <div className="fk-card text-center">
          <p className="text-groen font-black text-lg">Je hebt bijgedragen 💛</p>
          <p className="text-inkt-zacht">Dankjewel.</p>
        </div>
      )}

      {/* Wie gaf, namen, nooit bedragen. Dit is de wet uit sectie 7.1. */}
      <section>
        <h2 className="text-lg font-black text-inkt mb-3">Wie heeft bijgedragen</h2>
        <ul className="space-y-3">
          {(gevers ?? []).map((g, i) => (
            <li key={i} className="fk-card flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black shrink-0"
                style={{ background: g.hide_name ? "var(--inkt-zacht)" : "var(--terracotta)" }}
              >
                {g.hide_name ? "?" : initialen(g.first_name, g.last_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-inkt">
                  {g.hide_name ? "Een familielid" : `${g.first_name} ${g.last_name}`}
                </p>
                {g.message && (
                  <p className="text-inkt-zacht truncate">{g.message}</p>
                )}
              </div>
            </li>
          ))}
          {(gevers ?? []).length === 0 && (
            <li className="fk-card text-inkt-zacht text-center">
              Nog niemand heeft bijgedragen. Wees de eerste. 💛
            </li>
          )}
        </ul>
      </section>

      <p className="text-center text-sm text-inkt-zacht leading-relaxed px-4">
        Iedereen ziet wie heeft bijgedragen. Niemand ziet hoeveel. De oma die
        €0,75 geeft staat naast de oom die €200 geeft.
      </p>
    </main>
  )
}
