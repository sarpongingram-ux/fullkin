"use client"

import { useActionState, useState } from "react"
import {
  startUitbetaling,
  koppelFlutterwave,
  type StartResultaat,
  type FlutterwaveResultaat,
} from "./acties"
import { UITBETAAL_LANDEN } from "@/lib/payout/provider"

const invoer =
  "w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"

export function Onboarding({ nieuw }: { nieuw: boolean }) {
  const [land, setLand] = useState("NL")
  const provider =
    UITBETAAL_LANDEN.find((l) => l.code === land)?.provider ?? "stripe"

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-inkt-zacht mb-1 font-semibold">
          In welk land ontvang je geld?
        </label>
        <select
          value={land}
          onChange={(e) => setLand(e.target.value)}
          className={invoer}
        >
          {UITBETAAL_LANDEN.map((l) => (
            <option key={l.code} value={l.code}>
              {l.naam}
              {l.provider === "flutterwave" ? " (mobile money / bank)" : ""}
            </option>
          ))}
        </select>
      </div>

      {provider === "stripe" ? (
        <StripeForm land={land} nieuw={nieuw} />
      ) : (
        <FlutterwaveForm land={land} />
      )}
    </div>
  )
}

function StripeForm({ land, nieuw }: { land: string; nieuw: boolean }) {
  const [res, actie, bezig] = useActionState<StartResultaat | null, FormData>(
    startUitbetaling,
    null,
  )
  return (
    <form action={actie} className="space-y-3">
      <input type="hidden" name="land" value={land} />
      {res && !res.ok && <p className="text-sm text-terracotta">{res.fout}</p>}
      <button type="submit" disabled={bezig} className="fk-btn fk-btn-primary fk-btn-full">
        {bezig ? "Bezig…" : nieuw ? "Koppel mijn uitbetaling" : "Ga verder met koppelen"}
      </button>
      <p className="text-xs text-inkt-zacht text-center">
        Je wordt naar Stripe gestuurd om je gegevens veilig in te vullen. Fullkin ziet je
        bankgegevens nooit.
      </p>
    </form>
  )
}

function FlutterwaveForm({ land }: { land: string }) {
  const [method, setMethod] = useState<"bank" | "mobile_money">("mobile_money")
  const [res, actie, bezig] = useActionState<FlutterwaveResultaat | null, FormData>(
    koppelFlutterwave,
    null,
  )

  if (res?.ok) {
    return (
      <p className="text-groen font-semibold">
        ✅ Je uitbetaling is gekoppeld. Vernieuw de pagina om je status te zien.
      </p>
    )
  }

  return (
    <form action={actie} className="space-y-3">
      <input type="hidden" name="land" value={land} />

      <div>
        <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Manier</label>
        <select
          name="method"
          value={method}
          onChange={(e) => setMethod(e.target.value as "bank" | "mobile_money")}
          className={invoer}
        >
          <option value="mobile_money">Mobile money</option>
          <option value="bank">Bankrekening</option>
        </select>
      </div>

      <input name="account_name" placeholder="Naam op de rekening" className={invoer} />

      {method === "mobile_money" ? (
        <>
          <input
            name="momo_network"
            placeholder="Netwerk (bv. MTN, Vodafone, AirtelTigo)"
            className={invoer}
          />
          <input name="phone" placeholder="Telefoonnummer" className={invoer} />
        </>
      ) : (
        <>
          <input name="bank_code" placeholder="Bankcode" className={invoer} />
          <input name="account_number" placeholder="Rekeningnummer" className={invoer} />
        </>
      )}

      {res && !res.ok && <p className="text-sm text-terracotta">{res.fout}</p>}

      <button type="submit" disabled={bezig} className="fk-btn fk-btn-primary fk-btn-full">
        {bezig ? "Bezig…" : "Koppel mijn uitbetaling"}
      </button>
      <p className="text-xs text-inkt-zacht text-center">
        Je gegevens worden versleuteld opgeslagen en zijn alleen voor jou zichtbaar. Fullkin
        gebruikt ze alleen om jouw geld naar je te sturen.
      </p>
    </form>
  )
}
