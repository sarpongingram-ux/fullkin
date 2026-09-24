import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MatchKnop } from "./MatchKnop"

export default async function OntdekPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  const [{ data: matches }, { data: ontdekt }, { data: groeten }] =
    await Promise.all([
      supabase.rpc("mogelijke_matches", { me: meId }),
      supabase.rpc("ontdekte_familie", { me: meId }),
      supabase.rpc("mijn_begroetingen", { me: meId }),
    ])
  const matchLijst = matches ?? []
  const ontdektLijst = ontdekt ?? []
  const groetLijst = groeten ?? []

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-8">
      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          ONTDEK
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1 leading-tight">
          Familie die je nog niet kende
        </h1>
        <p className="text-inkt-zacht mt-2">
          Wanneer twee families dezelfde persoon delen, verbindt Fullkin ze — en
          verschijnen familieleden die je nog niet kende.
        </p>
      </header>

      {/* Familie die jou gedag heeft gezegd. */}
      {groetLijst.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-inkt">Familie zei hallo 👋</h2>
          {groetLijst.map((g) => (
            <div key={g.van_id} className="fk-card flex items-center gap-3">
              <span className="text-2xl shrink-0">👋</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-inkt">{g.van_naam}</p>
                <p className="text-sm text-inkt-zacht">
                  uit de familie {g.van_familie}
                  {g.wederzijds ? " · jullie hebben allebei hallo gezegd" : ""}
                </p>
              </div>
              {!g.wederzijds && (
                <Link
                  href={`/app/ontdek/${g.van_id}`}
                  className="ml-auto text-terracotta font-bold text-sm shrink-0"
                >
                  Terug →
                </Link>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Het tweede magic moment: je familie is groter geworden. */}
      {ontdektLijst.length > 0 && (
        <section className="fk-card-dark">
          <p className="text-sm uppercase tracking-wide opacity-70 font-bold">
            Je familie is groter geworden 🎉
          </p>
          <p className="fk-amount text-goud mt-1">
            {ontdektLijst.length}
          </p>
          <p className="text-sm opacity-70 mb-4">
            {ontdektLijst.length === 1
              ? "nieuw familielid ontdekt"
              : "nieuwe familieleden ontdekt"}
          </p>
          <ul className="space-y-3">
            {ontdektLijst.map((o) => (
              <li key={o.ontdekt_id} className="border-t border-white/15 pt-3">
                <p className="font-black">{o.ontdekt_naam}</p>
                <p className="text-sm opacity-80">
                  via je {o.mijn_kant} {o.brug_naam} → {o.brug_naam}
                  {"'s "} {o.hun_kant}
                </p>
                <Link
                  href={`/app/ontdek/${o.ontdekt_id}`}
                  className="inline-block mt-1 text-goud font-bold text-sm"
                >
                  Bekijk →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Mogelijke matches: menselijke bevestiging, nooit automatisch. */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-inkt">Mogelijke matches</h2>
        {matchLijst.length === 0 ? (
          <div className="fk-card text-center py-8">
            <p className="text-4xl mb-2">🔍</p>
            <p className="font-bold text-inkt">Nog geen matches</p>
            <p className="text-sm text-inkt-zacht mt-1">
              Nodig meer familie uit. Zodra iemand dezelfde persoon in zijn
              familie heeft, zie je het hier.
            </p>
          </div>
        ) : (
          matchLijst.map((m) => (
            <div key={`${m.mijn_id}-${m.ander_id}`} className="fk-card">
              <p className="text-sm text-inkt-zacht">{m.signaal}</p>
              <p className="font-black text-inkt mt-1">{m.mijn_naam}</p>
              <p className="text-sm text-inkt-zacht">
                lijkt dezelfde persoon als <b>{m.ander_naam}</b> uit de familie{" "}
                {m.ander_familie}.
              </p>
              <MatchKnop mijnId={m.mijn_id} anderId={m.ander_id} />
            </div>
          ))
        )}
      </section>
    </main>
  )
}
