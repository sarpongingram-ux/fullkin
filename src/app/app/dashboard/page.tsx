import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { RollenBeheer } from "./RollenBeheer"
import { KeeperUpgradeKaart } from "./KeeperUpgradeKaart"
import { settleKeeperUpgradeFromSession } from "@/lib/stripe/keeperUpgrade"

function euro(cents: number, decimals = 0) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: decimals,
  }).format(cents / 100)
}

const ABONNEMENT_CENTS = 499 // Family Keeper-upgrade: €4,99 per maand

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ keeper_upgrade?: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  // Net teruggekeerd van de keeper-upgrade-betaling? Leg 'm nu vast (idempotent).
  const sp = await searchParams
  if (sp?.keeper_upgrade) {
    await settleKeeperUpgradeFromSession(sp.keeper_upgrade)
  }

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  const { data: mij } = await supabase
    .from("persons")
    .select("first_name, network_id")
    .eq("id", meId)
    .single()
  if (!mij) redirect("/app")

  // Alleen Family Keepers zien dit dashboard.
  const { data: isCoFounder } = await supabase.rpc("has_role", {
    net: mij.network_id,
    r: "co_founder",
  })
  if (!isCoFounder) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-inkt-zacht max-w-sm">
          Het Family Keeper-dashboard is alleen zichtbaar voor de oprichters van
          de familie.{" "}
          <Link href="/app" className="text-terracotta underline">
            Terug naar je familie
          </Link>
        </p>
      </main>
    )
  }

  const [
    { data: dash },
    { data: rollen },
    { data: leden },
    { data: heeftUpgrade },
    { data: keeperSaldo },
  ] = await Promise.all([
    supabase.rpc("cofounder_dashboard").single(),
    supabase.rpc("family_roles"),
    supabase
      .from("persons")
      .select("id, first_name, last_name")
      .eq("network_id", mij.network_id)
      .not("claimed_by", "is", null),
    supabase.rpc("heeft_keeper_upgrade", { p_net: mij.network_id }),
    supabase.rpc("keeper_saldo", { p_net: mij.network_id }),
  ])

  const d = dash ?? {
    leden_totaal: 0,
    leden_deelnemend: 0,
    leden_sluimerend: 0,
    leden_onbekend: 0,
    groei_maand: 0,
    volume_totaal_cents: 0,
    volume_maand_cents: 0,
    volume_jaar_cents: 0,
    cofounder_verdienste_cents: 0,
    rolpool_cents: 0,
    pot_saldo_cents: 0,
    dromen_actief: 0,
    dromen_bereikt: 0,
    netwerksterkte: 0,
  }

  const ledenLijst = (leden ?? []).map((l) => ({
    id: l.id,
    naam: `${l.first_name} ${l.last_name}`,
  }))

  // Blok 3, Potentie: projecteer op basis van volume per lid.
  const volumePerLid =
    d.leden_totaal > 0 ? d.volume_totaal_cents / d.leden_totaal : 0
  const projectie = [200, 300, 500].map((n) => {
    const volume = Math.round(volumePerLid * n)
    return {
      leden: n,
      volume,
      verdienste: Math.round(volume * 0.02), // 2% als Family Keeper
    }
  })

  // Blok 4, Fullkin suggereert: acties geordend op impact.
  const suggesties: { titel: string; effect: string }[] = []
  if (d.leden_onbekend > 0)
    suggesties.push({
      titel: `Nodig ${d.leden_onbekend} familieleden uit`,
      effect: "Meer leden → meer verjaardagen, meer volume, grotere pot",
    })
  if (d.leden_sluimerend > 0)
    suggesties.push({
      titel: `Activeer ${d.leden_sluimerend} sluimerend ${d.leden_sluimerend === 1 ? "lid" : "leden"}`,
      effect: "Zij dragen nog niet bij. Een collecte trekt ze erin.",
    })
  if (d.dromen_actief < d.leden_deelnemend)
    suggesties.push({
      titel: "Moedig leden aan een droom in te stellen",
      effect: "Dromen geven de familie iets om samen naartoe te werken",
    })
  suggesties.push({
    titel: "Start een collecte voor een aankomende verjaardag",
    effect: "Elke collecte bouwt de pot en jouw verdienste op",
  })

  const abonnementGedekt = (keeperSaldo ?? 0) >= ABONNEMENT_CENTS

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-4">
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          FAMILY KEEPER DASHBOARD
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">
          Dag {mij.first_name} 📊
        </h1>
      </header>

      <KeeperUpgradeKaart
        networkId={mij.network_id}
        actief={!!heeftUpgrade}
        saldoCents={keeperSaldo ?? 0}
      />

      {/* Netwerksterkte, één getal bovenaan. */}
      <section className="fk-card-dark flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide opacity-70 font-bold">
            Netwerksterkte
          </p>
          <p className="text-sm opacity-70 mt-1 max-w-[12rem]">
            Verbinding, economie, dromen en groei in één getal.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="fk-amount text-goud">{d.netwerksterkte}</span>
          <span className="text-xl opacity-60">/100</span>
        </div>
      </section>

      {/* Blok 1, Netwerk Nu */}
      <section className="fk-card">
        <h2 className="font-black text-inkt text-lg mb-3">Netwerk nu</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-groen">{d.leden_deelnemend}</p>
            <p className="text-xs text-inkt-zacht">deelnemend</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-goud">{d.leden_sluimerend}</p>
            <p className="text-xs text-inkt-zacht">sluimerend</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blauw">{d.leden_onbekend}</p>
            <p className="text-xs text-inkt-zacht">nog onbekend</p>
          </div>
        </div>
        <p className="text-sm text-inkt-zacht mt-3 text-center">
          {d.leden_totaal} leden totaal · +{d.groei_maand} deze maand
        </p>
      </section>

      {/* Blok 2, Economie */}
      <section className="fk-card">
        <h2 className="font-black text-inkt text-lg mb-3">Economie</h2>
        <dl className="space-y-2 text-sm">
          <Rij label="Volume dit jaar" waarde={euro(d.volume_jaar_cents)} />
          <Rij label="Volume totaal" waarde={euro(d.volume_totaal_cents)} />
          <Rij
            label={`Jouw verdienste (${heeftUpgrade ? "2%" : "0%"})`}
            waarde={euro(keeperSaldo ?? 0, 2)}
            accent
          />
          <Rij label="Familie Pot saldo (1%)" waarde={euro(d.pot_saldo_cents, 2)} />
        </dl>
        {heeftUpgrade ? (
          <p
            className={`text-sm mt-3 ${abonnementGedekt ? "text-groen" : "text-inkt-zacht"}`}
          >
            {abonnementGedekt
              ? "✓ Je verdienste dekt je Family Keeper-abonnement van €4,99."
              : `Nog ${euro(ABONNEMENT_CENTS - (keeperSaldo ?? 0), 2)} verdienste tot je abonnement van €4,99 gedekt is.`}
          </p>
        ) : (
          <p className="text-sm mt-3 text-inkt-zacht">
            Word Family Keeper om 2% van elke geldstroom te verdienen.
          </p>
        )}
      </section>

      {/* Blok 3, Potentie */}
      <section className="fk-card">
        <h2 className="font-black text-inkt text-lg mb-1">Potentie</h2>
        <p className="text-sm text-inkt-zacht mb-3">
          Wat jullie economie wordt naarmate de familie groeit.
        </p>
        <div className="space-y-2">
          {projectie.map((p) => (
            <div
              key={p.leden}
              className="flex items-center justify-between text-sm border-t border-rand pt-2"
            >
              <span className="text-inkt">Bij {p.leden} leden</span>
              <span className="text-inkt-zacht">
                {euro(p.volume)} volume · jij {euro(p.verdienste)}/jaar
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Blok 4, Fullkin suggereert */}
      <section className="fk-card">
        <h2 className="font-black text-inkt text-lg mb-3">Fullkin suggereert</h2>
        <ul className="space-y-2">
          {suggesties.map((s, i) => (
            <li key={i} className="border-t border-rand pt-2">
              <p className="font-medium text-inkt text-sm">{s.titel}</p>
              <p className="text-xs text-inkt-zacht">{s.effect}</p>
            </li>
          ))}
        </ul>
      </section>

      <RollenBeheer rollen={rollen ?? []} leden={ledenLijst} />
    </main>
  )
}

function Rij({
  label,
  waarde,
  accent,
}: {
  label: string
  waarde: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-inkt-zacht">{label}</dt>
      <dd className={accent ? "font-semibold text-terracotta" : "text-inkt"}>
        {waarde}
      </dd>
    </div>
  )
}
