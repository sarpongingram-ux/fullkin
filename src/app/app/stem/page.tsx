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

  const { data: ronde, error: rondeFout } = await supabase.rpc("stem_ronde")
  if (rondeFout || !ronde) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-inkt-zacht font-semibold">De Stem kon niet worden geladen.</p>
      </main>
    )
  }

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()

  const [{ data: uitslag }, { data: leden }, { data: isKeeper }] =
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
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          DE STEM · {ronde.year}
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">
          Wie verdient erkenning? 🕊️
        </h1>
        <p className="text-inkt-zacht mt-2 leading-relaxed">
          De familie kiest bewust één persoon. Nomineer met één zin waarom.
          Iedereen stemt anoniem.
        </p>
      </header>

      {afgerond && winnaarNaam && (
        <section className="fk-card-dark text-center fk-pop">
          <p className="text-6xl mb-3">🕊️</p>
          <p className="text-sm opacity-70 uppercase tracking-wide font-bold">
            De familie koos
          </p>
          <p className="text-3xl font-black text-goud mt-1">{winnaarNaam}</p>
          <Link
            href="/app/familie"
            className="fk-btn fk-btn-gold mt-5 inline-flex"
          >
            Start een collecte voor {winnaarNaam.split(" ")[0]} →
          </Link>
        </section>
      )}

      {nominaties.length > 0 ? (
        <ul className="space-y-3">
          {nominaties.map((n) => {
            const pct =
              totaalStemmen > 0 ? Math.round((n.stemmen / totaalStemmen) * 100) : 0
            const isWinnaar = afgerond && n.nominee_id === ronde.winner_person_id
            return (
              <li
                key={n.nomination_id}
                className={`fk-card ${
                  isWinnaar
                    ? "ring-2 ring-goud"
                    : n.mijn_stem
                      ? "ring-2 ring-terracotta"
                      : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/app/persoon/${n.nominee_id}`}
                    className="font-black text-inkt hover:text-terracotta transition"
                  >
                    {n.nominee_naam}
                  </Link>
                  <span className="text-inkt-zacht font-bold">
                    {n.stemmen} {n.stemmen === 1 ? "stem" : "stemmen"}
                  </span>
                </div>
                <p className="text-inkt mt-1 italic leading-relaxed">
                  “{n.reason}”
                </p>
                <div className="fk-progress mt-3" style={{ height: 10 }}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                {!afgerond && !ikHebGestemd && (
                  <div className="mt-3">
                    <StemPaneel roundId={ronde.id} nominationId={n.nomination_id} />
                  </div>
                )}
                {n.mijn_stem && (
                  <p className="text-sm text-terracotta font-bold mt-2">Jouw stem ✓</p>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="fk-card text-center py-8">
          <p className="text-4xl mb-2">🌟</p>
          <p className="font-black text-inkt">Nog niemand genomineerd</p>
          <p className="text-inkt-zacht mt-1">Wees de eerste die iemand eert.</p>
        </div>
      )}

      {ikHebGestemd && !afgerond && (
        <p className="text-center text-inkt-zacht font-semibold">
          Je hebt gestemd. Bedankt voor je stem. 💛
        </p>
      )}

      {!afgerond && teNomineren.length > 0 && (
        <Nomineren roundId={ronde.id} leden={teNomineren} />
      )}

      {!afgerond && isKeeper && nominaties.length > 0 && (
        <SluitKnop roundId={ronde.id} />
      )}

      <p className="text-center text-sm text-inkt-zacht leading-relaxed px-4">
        Iedereen ziet de tellingen, niemand ziet wie op wie stemde. Eén stem per
        familielid.
      </p>
    </main>
  )
}
