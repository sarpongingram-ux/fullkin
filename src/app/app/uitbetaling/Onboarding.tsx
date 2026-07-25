"use client"

import { useActionState } from "react"
import { startUitbetaling, type StartResultaat } from "./acties"
import { UITBETAAL_LANDEN } from "@/lib/payout/provider"

export function Onboarding({ nieuw }: { nieuw: boolean }) {
  const [res, actie, bezig] = useActionState<StartResultaat | null, FormData>(
    startUitbetaling,
    null,
  )

  return (
    <form action={actie} className="space-y-3">
      <div>
        <label className="block text-sm text-inkt-zacht mb-1">
          In welk land ontvang je geld?
        </label>
        <select
          name="land"
          defaultValue="NL"
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
        >
          {UITBETAAL_LANDEN.map((l) => (
            <option key={l.code} value={l.code}>
              {l.naam}
              {l.provider === "flutterwave" ? " (mobile money — binnenkort)" : ""}
            </option>
          ))}
        </select>
      </div>

      {res && !res.ok && (
        <p className="text-sm text-terracotta">{res.fout}</p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-full bg-terracotta py-3 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
      >
        {bezig
          ? "Bezig…"
          : nieuw
            ? "Koppel mijn uitbetaling"
            : "Ga verder met koppelen"}
      </button>
      <p className="text-xs text-inkt-zacht text-center">
        Je wordt naar Stripe gestuurd om je gegevens veilig in te vullen. Fullkin
        ziet je bankgegevens nooit.
      </p>
    </form>
  )
}
