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
    <main className="min-h-screen max-w-md mx-auto px-5 py-10">
      <Link href="/app" className="text-sm text-inkt-zacht hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header className="mt-4 mb-6">
        <p className="text-terracotta font-semibold tracking-[0.25em] text-xs">
          FAMILIE POT
        </p>
        <h1 className="text-2xl font-bold text-inkt mt-1">De pot van {familieNaam}</h1>
      </header>

      {/* Het saldo — groot, warm, het feest. */}
      <section className="bg-inkt text-white rounded-2xl p-8 mb-4 text-center">
        <p className="text-xs uppercase tracking-wide opacity-70">Huidig saldo</p>
        <p className="text-5xl font-bold text-goud mt-2">{euro(p.saldo_cents, 0)}</p>
        <p className="text-sm opacity-70 mt-2">
          Samen opgebouwd door {familieNaam}
        </p>
      </section>

      {/* Bronnen — geaggregeerd, nooit individuele bedragen. */}
      <section className="bg-oppervlak rounded-2xl border border-rand p-5 mb-4">
        <h2 className="font-semibold text-inkt mb-3">Waar komt het vandaan</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-inkt-zacht">Automatische 1% van elke bijdrage</dt>
            <dd className="text-inkt">{euro(p.uit_1pct_cents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-inkt-zacht">Maandelijkse bijdragen</dt>
            <dd className="text-inkt">{euro(p.uit_maandbijdrage_cents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-inkt-zacht">
              Donaties ({p.donatie_aantal} {p.donatie_aantal === 1 ? "keer" : "keer"})
            </dt>
            <dd className="text-inkt">{euro(p.uit_donaties_cents)}</dd>
          </div>
          {p.uitgekeerd_cents > 0 && (
            <div className="flex justify-between border-t border-rand pt-2">
              <dt className="text-inkt-zacht">Uitgekeerd</dt>
              <dd className="text-inkt">− {euro(p.uitgekeerd_cents)}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Maandelijkse bijdrage — €3 suggestie, zelf te bepalen. */}
      <div className="mb-3">
        <Maandbijdrage
          mijnBedragCents={mijnSub?.amount_cents ?? null}
          ledenAantal={maand.leden}
          perMaandCents={maand.per_maand_cents}
        />
      </div>

      <div className="mb-4">
        <Doneren />
      </div>

      <p className="text-center text-xs text-inkt-zacht leading-relaxed">
        De pot is altijd groter dan verwacht. €3 per lid per maand, 1% van elke
        transactie, en vrije donaties — samen bouwen jullie iets op dat groter is
        dan ieder van jullie alleen.
      </p>
    </main>
  )
}
