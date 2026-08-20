import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Stemhok, Vragen, Updates } from "./BusinessClient"

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function datum(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default async function BusinessPagina({
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

  const { data: b } = await supabase
    .from("business_dreams")
    .select("*")
    .eq("id", id)
    .single()

  if (!b) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-inkt-zacht">Deze Business Droom bestaat niet.</p>
      </main>
    )
  }

  const [{ data: ondernemer }, { data: tally }, { data: vragenRaw }, { data: updatesRaw }] =
    await Promise.all([
      supabase.from("persons").select("first_name, last_name, city").eq("id", b.person_id).single(),
      supabase.rpc("business_tally", { bid: id }).single(),
      supabase
        .from("business_questions")
        .select("id, question, answer, asker_id")
        .eq("business_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("business_updates")
        .select("id, metric, note, photo_url, created_at")
        .eq("business_id", id)
        .order("created_at", { ascending: false }),
    ])

  // Namen van de vragenstellers apart ophalen.
  const askerIds = [...new Set((vragenRaw ?? []).map((q) => q.asker_id))]
  const { data: askers } = askerIds.length
    ? await supabase.from("persons").select("id, first_name").in("id", askerIds)
    : { data: [] }
  const naamVan = new Map((askers ?? []).map((p) => [p.id, p.first_name]))

  const vragen = (vragenRaw ?? []).map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer,
    askerNaam: naamVan.get(q.asker_id) ?? "Familielid",
  }))

  const updates = (updatesRaw ?? []).map((u) => ({
    id: u.id,
    metric: u.metric,
    note: u.note,
    photo_url: u.photo_url,
    datum: datum(u.created_at),
  }))

  const isEigenaar = b.person_id === meId
  const t = tally ?? { ja: 0, nee: 0, actief: 0, nodig: 0, goedgekeurd: false, mijn_stem: null }

  // Financieringsvoortgang na goedkeuring.
  let opgehaald = 0
  if (b.collection_id) {
    const { data: totaal } = await supabase
      .rpc("collection_total", { col: b.collection_id })
      .single()
    opgehaald = totaal?.total_cents ?? 0
  }

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-4">
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          BUSINESS DROOM
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">{b.name} 🚀</h1>
        <p className="text-inkt-zacht mt-1">
          {ondernemer?.first_name} {ondernemer?.last_name}
          {ondernemer?.city ? ` · ${ondernemer.city}` : ""}
        </p>
      </header>

      {/* Het plan */}
      <section className="fk-card">
        <p className="text-inkt leading-relaxed whitespace-pre-line">
          {b.description}
        </p>
        <dl className="mt-4 space-y-2 border-t border-rand pt-3">
          <div className="flex justify-between">
            <dt className="text-inkt-zacht font-semibold">Doelbedrag</dt>
            <dd className="font-black text-inkt">{euro(b.target_cents)}</dd>
          </div>
          {b.expected_revenue_cents != null && (
            <div className="flex justify-between">
              <dt className="text-inkt-zacht font-semibold">Verwachte omzet</dt>
              <dd className="text-inkt font-bold">{euro(b.expected_revenue_cents)}/jaar</dd>
            </div>
          )}
          {b.give_back && (
            <div className="pt-1">
              <dt className="text-inkt-zacht font-semibold">Teruggave aan de familie</dt>
              <dd className="text-inkt mt-0.5">{b.give_back}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Stemming of goedgekeurd */}
      <Stemhok
        businessId={id}
        ja={t.ja}
        nodig={t.nodig}
        actief={t.actief}
        mijnStem={t.mijn_stem}
        goedgekeurd={t.goedgekeurd}
      />

      {/* Financiering na goedkeuring */}
      {b.status === "goedgekeurd" && b.collection_id && (
        <Link
          href={`/app/collecte/${b.collection_id}`}
          className="block bg-oppervlak rounded-2xl border border-goud/40 p-5 mb-4 hover:border-goud transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-inkt">De business-collecte loopt</p>
              <p className="text-sm text-inkt-zacht">
                {euro(opgehaald)} van {euro(b.target_cents)} · draag bij →
              </p>
            </div>
          </div>
        </Link>
      )}

      <Vragen businessId={id} vragen={vragen} isEigenaar={isEigenaar} />

      {b.status === "goedgekeurd" && (
        <Updates businessId={id} updates={updates} isEigenaar={isEigenaar} />
      )}

      <p className="mt-6 text-center text-xs text-inkt-zacht italic">
        Zijn leven verandert. Niet door een NGO. Niet door een bank. Maar door
        zijn familie.
      </p>
    </main>
  )
}
