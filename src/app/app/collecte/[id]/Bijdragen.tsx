"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { draagBij, type BijdrageResultaat } from "../../collecte-acties"
import { Confetti } from "@/components/Confetti"

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
    <div className="fk-card">
      {resultaat?.ok && <Confetti />}
      <h2 className="font-black text-inkt text-lg mb-3">
        Draag bij voor {voornaamBegunstigde} ❤️
      </h2>

      <form action={actie} className="space-y-4">
        <input type="hidden" name="collectie_id" value={collectieId} />

        <div>
          <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Bedrag (€)</label>
          <input
            name="bedrag"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={suggestie}
            required
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
          <p className="text-sm text-inkt-zacht mt-2">
            Suggestie: €{suggestie}. Geef wat je wil, je bedrag blijft geheim.
          </p>
        </div>

        <input
          name="bericht"
          placeholder="Een berichtje (optioneel)"
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        />

        <label className="flex items-center gap-2 text-inkt font-semibold cursor-pointer">
          <input type="checkbox" name="verberg_naam" className="w-5 h-5 accent-terracotta" />
          Verberg ook mijn naam (volledig anoniem)
        </label>

        {resultaat && !resultaat.ok && (
          <p className="text-terracotta font-semibold">{resultaat.fout}</p>
        )}
        {resultaat?.ok && resultaat.devPending && (
          <p className="text-goud font-semibold">
            Bijdrage geregistreerd (dev-modus, nog niet afgerekend). Zodra Stripe
            is gekoppeld gaat de echte betaling lopen.
          </p>
        )}

        <button
          type="submit"
          disabled={bezig}
          className="fk-btn fk-btn-primary fk-btn-full"
        >
          {bezig ? "Bezig…" : "Bijdragen"}
        </button>
      </form>
    </div>
  )
}
