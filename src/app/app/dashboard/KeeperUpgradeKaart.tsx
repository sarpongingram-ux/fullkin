"use client"

import { useTransition } from "react"
import { neemKeeperUpgrade } from "../familie-acties"

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function KeeperUpgradeKaart({
  networkId,
  actief,
  saldoCents,
}: {
  networkId: string
  actief: boolean
  saldoCents: number
}) {
  const [bezig, start] = useTransition()

  if (actief) {
    return (
      <section className="fk-card-dark">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide opacity-70 font-bold">
              👑 Family Keeper
            </p>
            <p className="text-sm opacity-70 mt-1 max-w-[13rem]">
              Je verdient 2% van elke geldstroom in je familie.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="fk-amount text-goud">{euro(saldoCents)}</span>
            <p className="text-xs opacity-60">verdiend</p>
          </div>
        </div>
        <p className="text-xs opacity-70 mt-3 border-t border-white/15 pt-3">
          Uitbetaling volgt zodra je je uitbetaalrekening koppelt — je saldo
          blijft veilig oplopen.
        </p>
      </section>
    )
  }

  return (
    <section className="fk-card border-2 border-goud/50">
      <p className="text-goud font-extrabold tracking-[0.15em] text-xs">
        FAMILY KEEPER-UPGRADE
      </p>
      <h2 className="font-black text-inkt text-lg mt-1">
        Verdien mee aan je familie 👑
      </h2>
      <p className="text-sm text-inkt-zacht mt-1">
        Word de vaste Family Keeper en ontvang <b>2%</b> van elke geldstroom in
        deze familie. Hoe actiever en groter je familie, hoe meer je verdient.
      </p>
      <button
        type="button"
        disabled={bezig}
        onClick={() => start(async () => void (await neemKeeperUpgrade(networkId)))}
        className="fk-btn fk-btn-primary fk-btn-full mt-4"
      >
        {bezig ? "Bezig…" : "Word Family Keeper — €4,99/mnd"}
      </button>
    </section>
  )
}
