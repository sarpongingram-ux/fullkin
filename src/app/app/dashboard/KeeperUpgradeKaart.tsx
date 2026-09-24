"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { neemKeeperUpgrade, betaalKeeperUit } from "../familie-acties"

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
  beschikbaarCents,
  benKeeper,
  uitbetaalKlaar,
}: {
  networkId: string
  actief: boolean
  saldoCents: number
  beschikbaarCents: number
  benKeeper: boolean
  uitbetaalKlaar: boolean
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [fout, setFout] = useState<string | null>(null)
  const [gelukt, setGelukt] = useState<string | null>(null)

  function betaalUit() {
    setFout(null)
    setGelukt(null)
    start(async () => {
      const res = await betaalKeeperUit(networkId)
      if (!res.ok) return setFout(res.fout)
      setGelukt(`${euro(res.bedrag)} onderweg naar je rekening 🎉`)
      router.refresh()
    })
  }

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
            <span className="fk-amount text-goud">{euro(beschikbaarCents)}</span>
            <p className="text-xs opacity-60">beschikbaar</p>
          </div>
        </div>

        <div className="border-t border-white/15 mt-3 pt-3">
          <p className="text-xs opacity-70">
            Totaal verdiend: {euro(saldoCents)}
          </p>

          {benKeeper && uitbetaalKlaar && (
            <button
              type="button"
              disabled={bezig || beschikbaarCents < 100}
              onClick={betaalUit}
              className="fk-btn fk-btn-primary fk-btn-full mt-3 disabled:opacity-50"
            >
              {bezig
                ? "Bezig…"
                : beschikbaarCents < 100
                  ? "Nog te weinig om uit te betalen"
                  : `Laat ${euro(beschikbaarCents)} uitbetalen`}
            </button>
          )}

          {benKeeper && !uitbetaalKlaar && (
            <Link
              href="/app/uitbetaling"
              className="fk-btn fk-btn-primary fk-btn-full mt-3"
            >
              Koppel je uitbetaalrekening →
            </Link>
          )}

          {gelukt && (
            <p className="text-groen font-bold text-sm mt-2">{gelukt}</p>
          )}
          {fout && <p className="text-goud font-semibold text-sm mt-2">{fout}</p>}
        </div>
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
