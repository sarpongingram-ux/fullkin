"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { draagBij, type BijdrageResultaat } from "../../collecte-acties"

export function Bijdragen({
  collectieId,
  suggestieCents,
  voornaamBegunstigde,
}: {
  collectieId: string
  suggestieCents: number
  voornaamBegunstigde: string
}) {
  const router = useRouter()
  const [resultaat, actie, bezig] = useActionState<
    BijdrageResultaat | null,
    FormData
  >(draagBij, null)

  useEffect(() => {
    if (resultaat?.ok) router.refresh()
  }, [resultaat, router])

  const suggestie = (suggestieCents / 100).toFixed(2)

  return (
    <div className="bg-oppervlak rounded-2xl border border-rand p-5 mb-4">
      <h2 className="font-semibold text-inkt mb-3">
        Draag bij voor {voornaamBegunstigde}
      </h2>

      <form action={actie} className="space-y-3">
        <input type="hidden" name="collectie_id" value={collectieId} />

        <div>
          <label className="block text-sm text-inkt-zacht mb-1">Bedrag (€)</label>
          <input
            name="bedrag"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={suggestie}
            required
            className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
          />
          <p className="text-xs text-inkt-zacht mt-1">
            Suggestie: €{suggestie}. Geef wat je wil — je bedrag blijft
            geheim.
          </p>
        </div>

        <input
          name="bericht"
          placeholder="Een berichtje (optioneel)"
          className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
        />

        <label className="flex items-center gap-2 text-sm text-inkt cursor-pointer">
          <input type="checkbox" name="verberg_naam" className="accent-terracotta" />
          Verberg ook mijn naam (volledig anoniem)
        </label>

        {resultaat && !resultaat.ok && (
          <p className="text-sm text-terracotta">{resultaat.fout}</p>
        )}
        {resultaat?.ok && resultaat.devPending && (
          <p className="text-sm text-goud">
            Bijdrage geregistreerd (dev-modus, nog niet afgerekend). Zodra Stripe
            is gekoppeld gaat de echte betaling lopen.
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="w-full rounded-full bg-terracotta py-3 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Bijdragen"}
        </button>
      </form>
    </div>
  )
}
