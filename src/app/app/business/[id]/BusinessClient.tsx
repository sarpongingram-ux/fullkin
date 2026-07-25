"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  stem,
  stelVraag,
  beantwoordVraag,
  plaatsUpdate,
} from "../../business-acties"

// ---- Stemhok -------------------------------------------------------------

export function Stemhok({
  businessId,
  ja,
  nodig,
  actief,
  mijnStem,
  goedgekeurd,
}: {
  businessId: string
  ja: number
  nodig: number
  actief: number
  mijnStem: boolean | null
  goedgekeurd: boolean
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const pct = nodig > 0 ? Math.min(100, Math.round((ja / nodig) * 100)) : 0

  function doeStem(akkoord: boolean) {
    start(async () => {
      await stem(businessId, akkoord)
      router.refresh()
    })
  }

  if (goedgekeurd) {
    return (
      <div className="bg-groen/10 border border-groen/40 rounded-2xl p-5 mb-4 text-center">
        <p className="font-semibold text-groen">
          Goedgekeurd door de familie ✓
        </p>
        <p className="text-sm text-inkt-zacht mt-1">
          {ja} van {actief} actieve leden stemden voor.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-oppervlak rounded-2xl border border-rand p-5 mb-4">
      <h2 className="font-semibold text-inkt mb-1">Familie-stemming</h2>
      <p className="text-sm text-inkt-zacht mb-3">
        60% van de actieve leden moet akkoord zijn om de collecte te openen.
      </p>
      <div className="h-2.5 rounded-full bg-klei overflow-hidden mb-1.5">
        <div className="h-full rounded-full bg-terracotta" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-inkt-zacht mb-4">
        {ja} voor · {nodig} nodig (van {actief} actieve leden)
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => doeStem(true)}
          disabled={bezig}
          className={`flex-1 rounded-full py-2.5 font-medium transition disabled:opacity-60 ${
            mijnStem === true
              ? "bg-groen text-white"
              : "border border-groen text-groen hover:bg-groen/10"
          }`}
        >
          Voor
        </button>
        <button
          onClick={() => doeStem(false)}
          disabled={bezig}
          className={`flex-1 rounded-full py-2.5 font-medium transition disabled:opacity-60 ${
            mijnStem === false
              ? "bg-inkt text-white"
              : "border border-rand text-inkt-zacht hover:bg-klei/40"
          }`}
        >
          Tegen
        </button>
      </div>
      {mijnStem !== null && (
        <p className="text-xs text-inkt-zacht mt-2 text-center">
          Je stemde {mijnStem ? "voor" : "tegen"}. Je kunt dit wijzigen.
        </p>
      )}
    </div>
  )
}

// ---- Vragenronde ---------------------------------------------------------

type Vraag = {
  id: string
  question: string
  answer: string | null
  askerNaam: string
}

export function Vragen({
  businessId,
  vragen,
  isEigenaar,
}: {
  businessId: string
  vragen: Vraag[]
  isEigenaar: boolean
}) {
  const router = useRouter()
  const [nieuw, setNieuw] = useState("")
  const [bezig, start] = useTransition()

  function vraagStellen() {
    if (!nieuw.trim()) return
    start(async () => {
      await stelVraag(businessId, nieuw)
      setNieuw("")
      router.refresh()
    })
  }

  return (
    <section className="bg-oppervlak rounded-2xl border border-rand p-5 mb-4">
      <h2 className="font-semibold text-inkt mb-3">Vragenronde</h2>

      <ul className="space-y-3 mb-4">
        {vragen.map((v) => (
          <li key={v.id} className="border-t border-rand pt-3">
            <p className="text-sm text-inkt">
              <span className="text-inkt-zacht">{v.askerNaam}:</span> {v.question}
            </p>
            {v.answer ? (
              <p className="text-sm text-groen mt-1 pl-3 border-l-2 border-groen/40">
                {v.answer}
              </p>
            ) : isEigenaar ? (
              <Antwoorden businessId={businessId} questionId={v.id} />
            ) : (
              <p className="text-xs text-inkt-zacht mt-1 italic">
                Nog geen antwoord
              </p>
            )}
          </li>
        ))}
        {vragen.length === 0 && (
          <li className="text-sm text-inkt-zacht">Nog geen vragen gesteld.</li>
        )}
      </ul>

      <div className="flex gap-2">
        <input
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
          placeholder="Stel een vraag…"
          className="flex-1 rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt text-sm outline-none focus:border-terracotta"
        />
        <button
          onClick={vraagStellen}
          disabled={bezig}
          className="rounded-full bg-terracotta px-4 py-2 text-white text-sm font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
        >
          Vraag
        </button>
      </div>
    </section>
  )
}

function Antwoorden({
  businessId,
  questionId,
}: {
  businessId: string
  questionId: string
}) {
  const router = useRouter()
  const [antwoord, setAntwoord] = useState("")
  const [bezig, start] = useTransition()
  return (
    <div className="flex gap-2 mt-2">
      <input
        value={antwoord}
        onChange={(e) => setAntwoord(e.target.value)}
        placeholder="Beantwoord…"
        className="flex-1 rounded-lg border border-rand bg-achtergrond px-3 py-1.5 text-inkt text-sm outline-none focus:border-terracotta"
      />
      <button
        onClick={() =>
          start(async () => {
            await beantwoordVraag(questionId, businessId, antwoord)
            setAntwoord("")
            router.refresh()
          })
        }
        disabled={bezig}
        className="rounded-full border border-groen text-groen px-3 py-1.5 text-sm hover:bg-groen/10 transition disabled:opacity-60"
      >
        Antwoord
      </button>
    </div>
  )
}

// ---- Maandelijkse updates ------------------------------------------------

type Update = {
  id: string
  metric: string | null
  note: string | null
  photo_url: string | null
  datum: string
}

export function Updates({
  businessId,
  updates,
  isEigenaar,
}: {
  businessId: string
  updates: Update[]
  isEigenaar: boolean
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()

  return (
    <section className="bg-oppervlak rounded-2xl border border-rand p-5 mb-4">
      <h2 className="font-semibold text-inkt mb-3">Maandelijkse updates</h2>

      <ul className="space-y-3 mb-4">
        {updates.map((u) => (
          <li key={u.id} className="border-t border-rand pt-3">
            {u.metric && (
              <p className="text-lg font-semibold text-terracotta">{u.metric}</p>
            )}
            {u.note && <p className="text-sm text-inkt">{u.note}</p>}
            <p className="text-xs text-inkt-zacht mt-1">{u.datum}</p>
          </li>
        ))}
        {updates.length === 0 && (
          <li className="text-sm text-inkt-zacht">Nog geen updates.</li>
        )}
      </ul>

      {isEigenaar && (
        <form
          action={(fd) =>
            start(async () => {
              await plaatsUpdate(businessId, fd)
              router.refresh()
            })
          }
          className="space-y-2"
        >
          <input
            name="metric"
            placeholder="Eén getal (bv. '40 kippen')"
            className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt text-sm outline-none focus:border-terracotta"
          />
          <input
            name="note"
            placeholder="Korte notitie (optioneel)"
            className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt text-sm outline-none focus:border-terracotta"
          />
          <button
            type="submit"
            disabled={bezig}
            className="w-full rounded-full bg-terracotta py-2 text-white text-sm font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
          >
            Update plaatsen
          </button>
        </form>
      )}
    </section>
  )
}
