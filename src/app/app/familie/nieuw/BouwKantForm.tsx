"use client"

import { useActionState, useState } from "react"
import { startExtraFamilie, type StartResultaat } from "./acties"

const ZIJDEN = [
  { key: "vaderskant", emoji: "👨🏾", titel: "Mijn vaderskant" },
  { key: "moederskant", emoji: "👩🏾", titel: "Mijn moederskant" },
  { key: "anders", emoji: "🌳", titel: "Een andere familie" },
]

export function BouwKantForm({
  voornaam,
  achternaam,
}: {
  voornaam: string
  achternaam: string
}) {
  const [zijde, setZijde] = useState("vaderskant")
  const [res, actie, bezig] = useActionState<StartResultaat | null, FormData>(
    async (v, fd) => startExtraFamilie(v, fd),
    null,
  )

  return (
    <form action={actie} className="space-y-5">
      <input type="hidden" name="soort" value={zijde} />

      {/* Welke kant bouw je? */}
      <div className="grid grid-cols-3 gap-2">
        {ZIJDEN.map((z) => (
          <button
            key={z.key}
            type="button"
            onClick={() => setZijde(z.key)}
            className={`rounded-2xl border-2 px-2 py-4 text-center transition ${
              zijde === z.key
                ? "border-terracotta bg-terracotta/5"
                : "border-rand bg-white"
            }`}
          >
            <span className="block text-2xl mb-1">{z.emoji}</span>
            <span className="block text-xs font-bold text-inkt leading-tight">
              {z.titel}
            </span>
          </button>
        ))}
      </div>

      <div className="fk-card-white space-y-4" style={{ padding: 24 }}>
        <div>
          <label className="block text-sm text-inkt-zacht mb-1">
            Naam van deze familie
          </label>
          <input
            name="familienaam"
            required
            placeholder="Bijv. Familie Gyamfi"
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>

        <div>
          <label className="block text-sm text-inkt-zacht mb-1">
            Land van herkomst{" "}
            <span className="text-inkt-zacht/60">(optioneel)</span>
          </label>
          <input
            name="land"
            placeholder="Bijv. Ghana"
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
          />
        </div>

        <div className="border-t border-rand pt-4">
          <p className="text-sm font-medium text-inkt mb-2">
            Jouw naam in deze familie
          </p>
          <div className="flex gap-2">
            <input
              name="voornaam"
              required
              defaultValue={voornaam}
              placeholder="Voornaam"
              className="flex-1 rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
            />
            <input
              name="achternaam"
              required
              defaultValue={achternaam}
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
      </div>

      {res && !res.ok && (
        <p className="text-terracotta font-semibold">{res.fout}</p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="fk-btn fk-btn-primary fk-btn-full"
      >
        {bezig ? "Bezig…" : "Verder — €0,99 per maand"}
      </button>
      <p className="text-center text-xs text-inkt-zacht">
        Je wordt tijdelijke keeper van deze familie. Je kunt maandelijks
        opzeggen; je familie blijft altijd van jullie.
      </p>
    </form>
  )
}
