import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Nomineren, StemPaneel, SluitKnop } from "./StemClient"

export default async function StemPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  // De ronde van dit jaar (wordt aangemaakt als die nog niet bestaat).
  const { data: ronde, error: rondeFout } = await supabase.rpc("stem_ronde")
  if (rondeFout || !ronde) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-inkt-zacht">De Stem kon niet worden geladen.</p>
      </main>
    )
  }

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()

  const [{ data: uitslag }, { data: leden }, { data: isCoFounder }] =
    await Promise.all([
      supabase.rpc("stem_uitslag", { p_round: ronde.id }),
      supabase
        .from("persons")
        .select("id, first_name, last_name")
        .not("claimed_by", "is", null),
      mij
        ? supabase.rpc("has_role", { net: mij.network_id, r: "co_founder" })
        : Promise.resolve({ data: false }),
    ])

  const nominaties = uitslag ?? []
  const ledenLijst = (leden ?? []).map((l) => ({
    id: l.id,
    naam: `${l.first_name} ${l.last_name}`,
  }))
  // Al genomineerde personen niet nog eens aanbieden.
  const genomineerd = new Set(nominaties.map((n) => n.nominee_id))
  const teNomineren = ledenLijst.filter((l) => !genomineerd.has(l.id))

  const ikHebGestemd = nominaties.some((n) => n.mijn_stem)
  const afgerond = ronde.status === "afgerond"
  const totaalStemmen = nominaties.reduce((s, n) => s + n.stemmen, 0)
  const winnaarNaam = ronde.winner_person_id
    ? nominaties.find((n) => n.nominee_id === ronde.winner_person_id)?.nominee_naam ??
      ledenLijst.find((l) => l.id === ronde.winner_person_id)?.naam ??
      "Een familielid"
    : null

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 py-10">
      <Link href="/app" className="text-sm text-inkt-zacht hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header className="mt-4 mb-6 text-center">
        <p className="text-terracotta font-semibold tracking-[0.25em] text-xs">
          DE STEM · {ronde.year}
        </p>
        <h1 className="text-2xl font-bold text-inkt mt-1">
          Wie verdient dit jaar erkenning?
        </h1>
        <p className="text-sm text-inkt-zacht mt-2 leading-relaxed">
          De familie kiest bewust één persoon. Nomineer met één zin waarom.
          Iedereen stemt anoniem.
        </p>
      </header>

      {afgerond && winnaarNaam && (
        <section className="bg-inkt text-white rounded-2xl p-8 mb-6 text-center">
          <p className="text-5xl mb-3">🕊️</p>
          <p className="text-sm opacity-70 uppercase tracking-wide">
            De familie koos
          </p>
          <p className="text-3xl font-bold text-goud mt-1">{winnaarNaam}</p>
          <Link
            href="/app"
            className="inline-block mt-5 rounded-full bg-goud text-inkt text-sm font-semibold px-5 py-2.5 hover:opacity-90 transition"
          >
            Start een collecte voor {winnaarNaam.split(" ")[0]} →
          </Link>
        </section>
      )}

      {/* De nominaties met stemtellingen */}
      {nominaties.length > 0 ? (
        <ul className="space-y-3 mb-6">
          {nominaties.map((n) => {
            const pct =
              totaalStemmen > 0 ? Math.round((n.stemmen / totaalStemmen) * 100) : 0
            const isWinnaar = afgerond && n.nominee_id === ronde.winner_person_id
            return (
              <li
                key={n.nomination_id}
                className={`rounded-2xl border p-4 ${
                  isWinnaar
                    ? "border-goud bg-klei/40"
                    : n.mijn_stem
                      ? "border-terracotta bg-oppervlak"
                      : "border-rand bg-oppervlak"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/app/persoon/${n.nominee_id}`}
                    className="font-semibold text-inkt hover:text-terracotta transition"
                  >
                    {n.nominee_naam}
                  </Link>
                  <span className="text-sm text-inkt-zacht">
                    {n.stemmen} {n.stemmen === 1 ? "stem" : "stemmen"}
                  </span>
                </div>
                <p className="text-sm text-inkt mt-1 italic leading-relaxed">
                  “{n.reason}”
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-klei overflow-hidden">
                  <div
                    className="h-full rounded-full bg-goud"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {!afgerond && !ikHebGestemd && (
                  <div className="mt-3">
                    <StemPaneel roundId={ronde.id} nominationId={n.nomination_id} />
                  </div>
                )}
                {n.mijn_stem && (
                  <p className="text-xs text-terracotta mt-2">Jouw stem ✓</p>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-center text-sm text-inkt-zacht mb-6">
          Nog niemand genomineerd. Wees de eerste.
        </p>
      )}

      {ikHebGestemd && !afgerond && (
        <p className="text-center text-sm text-inkt-zacht mb-6">
          Je hebt gestemd. Bedankt voor je stem.
        </p>
      )}

      {/* Nomineren — kan zolang de ronde open is */}
      {!afgerond && teNomineren.length > 0 && (
        <Nomineren roundId={ronde.id} leden={teNomineren} />
      )}

      {/* Family Keeper sluit de stemming af */}
      {!afgerond && isCoFounder && nominaties.length > 0 && (
        <div className="mt-6">
          <SluitKnop roundId={ronde.id} />
        </div>
      )}

      <p className="mt-10 text-center text-xs text-inkt-zacht leading-relaxed">
        Iedereen ziet de tellingen, niemand ziet wie op wie stemde. Eén stem per
        familielid.
      </p>
    </main>
  )
}
