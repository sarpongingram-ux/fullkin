import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { DraaiKnop, KeuzePaneel } from "./RadClient"

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

const keuzeTekst: Record<string, string> = {
  zelf: "hield de prijs zelf",
  gunnen: "gunde de prijs aan een familielid",
  pot: "zette de prijs terug in de pot",
  dromen: "verdeelde de prijs over dromen",
}

export default async function RadPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  const jaar = new Date().getFullYear()

  const [{ data: pot }, { data: lootjesRaw }, { data: draw }, { data: leden }] =
    await Promise.all([
      supabase.rpc("my_pot_summary").single(),
      supabase.rpc("rad_lootjes"),
      supabase.from("rad_draws").select("*").eq("year", jaar).maybeSingle(),
      supabase
        .from("persons")
        .select("id, first_name, last_name")
        .not("claimed_by", "is", null),
    ])

  const lootjes = (lootjesRaw ?? []).map((l) => ({
    id: l.person_id,
    naam: `${l.first_name} ${l.last_name}`,
    lootjes: l.lootjes,
  }))
  const totaal = lootjes.reduce((s, l) => s + l.lootjes, 0)
  const mij = lootjes.find((l) => l.id === meId)
  const mijnKans = totaal > 0 && mij ? (mij.lootjes / totaal) * 100 : 0
  const potSaldo = pot?.saldo_cents ?? 0

  const ledenLijst = (leden ?? []).map((l) => ({
    id: l.id,
    naam: `${l.first_name} ${l.last_name}`,
  }))
  const winnaarNaam = draw?.winner_person_id
    ? ledenLijst.find((l) => l.id === draw.winner_person_id)?.naam ?? "Een familielid"
    : null
  const ikBenWinnaar = draw?.winner_person_id === meId

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 py-10">
      <Link href="/app" className="text-sm text-inkt-zacht hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header className="mt-4 mb-6 text-center">
        <p className="text-terracotta font-semibold tracking-[0.25em] text-xs">
          HET RAD · {jaar}
        </p>
        <h1 className="text-2xl font-bold text-inkt mt-1">
          {euro(potSaldo)} in de pot
        </h1>
      </header>

      {!draw ? (
        <>
          {/* Nog niet getrokken: draaiknop + jouw kans + lootjes */}
          <section className="bg-oppervlak rounded-2xl border border-goud/40 p-6 mb-4">
            <DraaiKnop kanDraaien={totaal > 0} />
          </section>

          {mij && (
            <section className="bg-inkt text-white rounded-2xl p-5 mb-4 text-center">
              <p className="text-sm opacity-70">Jouw winkans</p>
              <p className="text-3xl font-bold text-goud mt-1">
                {mijnKans.toFixed(1)}%
              </p>
              <p className="text-sm opacity-70 mt-1">
                Je hebt {mij.lootjes} {mij.lootjes === 1 ? "lootje" : "lootjes"} van{" "}
                {totaal} in de familie
              </p>
            </section>
          )}

          <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide mb-2">
            Wie draait er mee
          </h2>
          <ul className="space-y-1.5">
            {lootjes.map((l) => (
              <li
                key={l.id}
                className={`flex items-center justify-between rounded-xl border p-3 ${
                  l.id === meId ? "border-terracotta bg-klei/40" : "border-rand bg-oppervlak"
                }`}
              >
                <span className="text-inkt">{l.naam}</span>
                <span className="text-sm text-inkt-zacht">
                  {l.lootjes} {l.lootjes === 1 ? "lootje" : "lootjes"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {/* Getrokken: de winnaar */}
          <section className="bg-inkt text-white rounded-2xl p-8 mb-4 text-center">
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-sm opacity-70 uppercase tracking-wide">De winnaar</p>
            <p className="text-3xl font-bold text-goud mt-1">{winnaarNaam}</p>
            <p className="text-lg mt-2">wint {euro(draw.prize_cents)}</p>
          </section>

          {draw.status === "besloten" ? (
            <p className="text-center text-inkt-zacht">
              {winnaarNaam} {keuzeTekst[draw.choice ?? ""] ?? "heeft beslist"}.
            </p>
          ) : ikBenWinnaar ? (
            <KeuzePaneel drawId={draw.id} leden={ledenLijst.filter((l) => l.id !== meId)} />
          ) : (
            <p className="text-center text-inkt-zacht">
              {winnaarNaam} kiest wat er met de prijs gebeurt.
            </p>
          )}
        </>
      )}

      <p className="mt-10 text-center text-xs text-inkt-zacht leading-relaxed">
        Alleen wie meedoet in de familie draait mee. Hoe meer je bijdraagt, hoe
        groter je kans — volledig transparant.
      </p>
    </main>
  )
}
