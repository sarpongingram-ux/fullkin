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
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          HET RAD · {jaar}
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">Het Rad 🎡</h1>
      </header>

      {/* De pot als hero */}
      <section className="fk-card-dark text-center">
        <p className="text-sm font-bold opacity-70">In de pot</p>
        <p className="fk-amount mt-2 text-goud">{euro(potSaldo)}</p>
        <p className="text-sm opacity-70 mt-2">Eén familielid wint dit dit jaar</p>
      </section>

      {!draw ? (
        <>
          <section className="fk-card text-center">
            <DraaiKnop kanDraaien={totaal > 0} />
          </section>

          {mij && (
            <section className="fk-card text-center">
              <p className="text-sm text-inkt-zacht font-semibold">Jouw winkans</p>
              <p className="fk-amount text-terracotta mt-1">
                {mijnKans.toFixed(1)}%
              </p>
              <p className="text-inkt-zacht mt-1">
                Je hebt {mij.lootjes} {mij.lootjes === 1 ? "lootje" : "lootjes"} van{" "}
                {totaal} in de familie
              </p>
            </section>
          )}

          <section>
            <h2 className="text-lg font-black text-inkt mb-3">Wie draait er mee</h2>
            <ul className="space-y-2">
              {lootjes.map((l) => (
                <li
                  key={l.id}
                  className={`flex items-center justify-between fk-card ${
                    l.id === meId ? "ring-2 ring-terracotta" : ""
                  }`}
                >
                  <span className="font-bold text-inkt">
                    {l.id === meId ? "Jij" : l.naam}
                  </span>
                  <span className="text-inkt-zacht font-semibold">
                    {l.lootjes} {l.lootjes === 1 ? "lootje" : "lootjes"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          <section className="fk-card-dark text-center fk-pop">
            <p className="text-6xl mb-3">🎉</p>
            <p className="text-sm opacity-70 uppercase tracking-wide font-bold">
              De winnaar
            </p>
            <p className="text-3xl font-black text-goud mt-1">{winnaarNaam}</p>
            <p className="text-lg mt-2 font-semibold">
              wint {euro(draw.prize_cents)}
            </p>
          </section>

          {draw.status === "besloten" ? (
            <p className="text-center text-inkt-zacht font-semibold">
              {winnaarNaam} {keuzeTekst[draw.choice ?? ""] ?? "heeft beslist"}.
            </p>
          ) : ikBenWinnaar ? (
            <KeuzePaneel drawId={draw.id} leden={ledenLijst.filter((l) => l.id !== meId)} />
          ) : (
            <p className="text-center text-inkt-zacht font-semibold">
              {winnaarNaam} kiest wat er met de prijs gebeurt.
            </p>
          )}
        </>
      )}

      <p className="text-center text-sm text-inkt-zacht leading-relaxed px-4">
        Alleen wie meedoet in de familie draait mee. Hoe meer je bijdraagt, hoe
        groter je kans — volledig transparant.
      </p>
    </main>
  )
}
