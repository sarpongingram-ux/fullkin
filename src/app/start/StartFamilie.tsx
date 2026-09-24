"use client"

import { useActionState } from "react"
import { startFamilie, type StartResultaat } from "./acties"

export function StartFamilie() {
  const [res, actie, bezig] = useActionState<StartResultaat | null, FormData>(
    async (v, fd) => {
      const r = await startFamilie(v, fd)
      if (r.ok) window.location.assign("/app/opbouw")
      return r
    },
    null,
  )

  return (
    <form action={actie} className="fk-card-white space-y-4" style={{ padding: 24 }}>
      <div>
        <label className="block text-sm text-inkt-zacht mb-1">
          Naam van de familie
        </label>
        <input
          name="familienaam"
          required
          placeholder="Bijv. Familie Sarpong"
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        />
      </div>

      <div>
        <label className="block text-sm text-inkt-zacht mb-1">
          Land van herkomst <span className="text-inkt-zacht/60">(optioneel)</span>
        </label>
        <input
          name="land"
          placeholder="Bijv. Ghana"
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        />
      </div>

      <div className="border-t border-rand pt-4">
        <p className="text-sm font-medium text-inkt mb-2">Jouw naam</p>
        <div className="flex gap-2">
          <input
            name="voornaam"
            required
            placeholder="Voornaam"
            className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
          <input
            name="achternaam"
            required
            placeholder="Achternaam"
            className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>
        <input
          name="stad"
          placeholder="Woonplaats (optioneel)"
          className="w-full mt-2 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
        />
      </div>

      {res && !res.ok && <p className="text-terracotta font-semibold">{res.fout}</p>}

      <button
        type="submit"
        disabled={bezig}
        className="fk-btn fk-btn-primary fk-btn-full"
      >
        {bezig ? "Bezig…" : "Start mijn familie"}
      </button>
    </form>
  )
}
