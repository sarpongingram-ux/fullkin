"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  stem,
  stelVraag,
  beantwoordVraag,
  plaatsUpdate,
} from "../../business-acties"

const invoer =
  "w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"

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
      <div className="fk-card text-center" style={{ background: "rgba(21,128,61,0.08)" }}>
        <p className="font-black text-groen text-lg">Goedgekeurd door de familie ✅</p>
        <p className="text-inkt-zacht mt-1">
          {ja} van {actief} actieve leden stemden voor.
        </p>
      </div>
    )
  }

  return (
    <div className="fk-card">
      <h2 className="font-black text-inkt text-lg mb-1">Familie-stemming</h2>
      <p className="text-sm text-inkt-zacht mb-3">
        60% van de actieve leden moet akkoord zijn om de collecte te openen.
      </p>
      <div className="fk-progress mb-2" style={{ height: 12 }}>
        <span style={{ width: `${pct}%`, background: "var(--terracotta)" }} />
      </div>
      <p className="text-sm text-inkt-zacht mb-4 font-semibold">
        {ja} voor · {nodig} nodig (van {actief} actieve leden)
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => doeStem(true)}
          disabled={bezig}
          className={`fk-btn flex-1 disabled:opacity-60 ${
            mijnStem === true ? "text-white" : "bg-white"
          }`}
          style={
            mijnStem === true
              ? { background: "var(--groen)" }
              : { border: "2px solid var(--groen)", color: "var(--groen)" }
          }
        >
          Voor
        </button>
        <button
          onClick={() => doeStem(false)}
          disabled={bezig}
          className={`fk-btn flex-1 disabled:opacity-60 ${
            mijnStem === false ? "bg-inkt text-white" : "bg-white text-inkt-zacht"
          }`}
          style={mijnStem === false ? {} : { border: "2px solid var(--rand)" }}
        >
          Tegen
        </button>
      </div>
      {mijnStem !== null && (
        <p className="text-sm text-inkt-zacht mt-2 text-center">
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
    <section className="fk-card">
      <h2 className="font-black text-inkt text-lg mb-3">Vragenronde</h2>

      <ul className="space-y-3 mb-4">
        {vragen.map((v) => (
          <li key={v.id} className="border-t border-rand pt-3">
            <p className="text-inkt">
              <span className="text-inkt-zacht font-semibold">{v.askerNaam}:</span> {v.question}
            </p>
            {v.answer ? (
              <p className="text-groen mt-1 pl-3 border-l-2 border-groen/40">
                {v.answer}
              </p>
            ) : isEigenaar ? (
              <Antwoorden businessId={businessId} questionId={v.id} />
            ) : (
              <p className="text-sm text-inkt-zacht mt-1 italic">Nog geen antwoord</p>
            )}
          </li>
        ))}
        {vragen.length === 0 && (
          <li className="text-inkt-zacht">Nog geen vragen gesteld.</li>
        )}
      </ul>

      <div className="flex gap-2">
        <input
          value={nieuw}
          onChange={(e) => setNieuw(e.target.value)}
          placeholder="Stel een vraag…"
          className={`flex-1 ${invoer}`}
        />
        <button
          onClick={vraagStellen}
          disabled={bezig}
          className="rounded-2xl bg-terracotta px-5 text-white font-bold hover:bg-terracotta-diep transition active:scale-95 disabled:opacity-60"
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
        className={`flex-1 ${invoer}`}
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
        className="rounded-2xl px-4 font-bold transition active:scale-95 disabled:opacity-60"
        style={{ border: "2px solid var(--groen)", color: "var(--groen)" }}
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
    <section className="fk-card">
      <h2 className="font-black text-inkt text-lg mb-3">Maandelijkse updates</h2>

      <ul className="space-y-3 mb-4">
        {updates.map((u) => (
          <li key={u.id} className="border-t border-rand pt-3">
            {u.metric && (
              <p className="text-xl font-black text-terracotta">{u.metric}</p>
            )}
            {u.note && <p className="text-inkt">{u.note}</p>}
            <p className="text-sm text-inkt-zacht mt-1">{u.datum}</p>
          </li>
        ))}
        {updates.length === 0 && (
          <li className="text-inkt-zacht">Nog geen updates.</li>
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
          className="space-y-3"
        >
          <input name="metric" placeholder="Eén getal (bv. '40 kippen')" className={invoer} />
          <input name="note" placeholder="Korte notitie (optioneel)" className={invoer} />
          <button
            type="submit"
            disabled={bezig}
            className="fk-btn fk-btn-primary fk-btn-full"
          >
            Update plaatsen
          </button>
        </form>
      )}
    </section>
  )
}
