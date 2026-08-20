import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Doneren } from "./Doneren"
import { Maandbijdrage } from "./Maandbijdrage"
import { settlePotDonationFromSession } from "@/lib/stripe/potDonation"
import { settlePotSubscriptionFromSession } from "@/lib/stripe/potSubscription"

function euro(cents: number, decimals = 2) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: decimals,
  }).format(cents / 100)
}

export default async function PotPagina({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; sub_session?: string }>
}) {
  const { session_id, sub_session } = await searchParams

  // Terug van een donatie-betaling? Boek 'm in het grootboek.
  if (session_id) {
    await settlePotDonationFromSession(session_id)
  }
  // Terug van het instellen van een maandbijdrage? Leg 'm vast + boek maand 1.
  if (sub_session) {
    await settlePotSubscriptionFromSession(sub_session)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  const [{ data: samenvatting }, { data: maandStats }, { data: mijnSub }] =
    await Promise.all([
      supabase.rpc("my_pot_summary").single(),
      supabase.rpc("pot_maandbijdrage_stats").single(),
      supabase
        .from("pot_subscriptions")
        .select("amount_cents")
        .eq("person_id", meId)
        .eq("status", "actief")
        .maybeSingle(),
    ])
  const p = samenvatting ?? {
    saldo_cents: 0,
    uit_1pct_cents: 0,
    uit_donaties_cents: 0,
    uit_maandbijdrage_cents: 0,
    uitgekeerd_cents: 0,
    donatie_aantal: 0,
  }
  const maand = maandStats ?? { leden: 0, per_maand_cents: 0 }

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()
  const { data: netwerk } = mij
    ? await supabase
        .from("family_networks")
        .select("name")
        .eq("id", mij.network_id)
        .single()
    : { data: null }
  const familieNaam = netwerk?.name ?? "de familie"

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          FAMILIEPOT
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">De familiepot 🌍</h1>
      </header>

      {/* Het saldo — groot, Cash App-stijl. */}
      <section className="fk-card-dark text-center">
        <p className="text-sm font-bold opacity-70">Huidig saldo</p>
        <p className="fk-amount mt-2 text-goud">{euro(p.saldo_cents, 0)}</p>
        <p className="text-sm opacity-70 mt-2">
          Samen opgebouwd door {familieNaam}
        </p>
      </section>

      {/* Bronnen — geaggregeerd, nooit individuele bedragen. */}
      <section className="fk-card">
        <h2 className="font-black text-inkt mb-3 text-lg">Waar komt het vandaan</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-inkt-zacht font-semibold">Automatische 1% van elke bijdrage</dt>
            <dd className="text-inkt font-bold">{euro(p.uit_1pct_cents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-inkt-zacht font-semibold">Maandelijkse bijdragen</dt>
            <dd className="text-inkt font-bold">{euro(p.uit_maandbijdrage_cents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-inkt-zacht font-semibold">
              Donaties ({p.donatie_aantal}×)
            </dt>
            <dd className="text-inkt font-bold">{euro(p.uit_donaties_cents)}</dd>
          </div>
          {p.uitgekeerd_cents > 0 && (
            <div className="flex justify-between border-t border-rand pt-3">
              <dt className="text-inkt-zacht font-semibold">Uitgekeerd</dt>
              <dd className="text-inkt font-bold">− {euro(p.uitgekeerd_cents)}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Maandelijkse bijdrage — €3 suggestie, zelf te bepalen. */}
      <Maandbijdrage
        mijnBedragCents={mijnSub?.amount_cents ?? null}
        ledenAantal={maand.leden}
        perMaandCents={maand.per_maand_cents}
      />

      <Doneren />

      <p className="text-center text-sm text-inkt-zacht leading-relaxed px-4">
        De pot is altijd groter dan verwacht. €3 per lid per maand, 1% van elke
        transactie, en vrije donaties — samen bouwen jullie iets op dat groter is
        dan ieder van jullie alleen.
      </p>
    </main>
  )
}
