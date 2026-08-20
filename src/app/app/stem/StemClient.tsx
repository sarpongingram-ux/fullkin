"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { nomineer, stem, sluitStem } from "./acties"

type Lid = { id: string; naam: string }

const invoer =
  "w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"

// Nomineren — één familielid, één zin waarom.
export function Nomineren({ roundId, leden }: { roundId: string; leden: Lid[] }) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [nominee, setNominee] = useState("")
  const [reden, setReden] = useState("")
  const [fout, setFout] = useState<string | null>(null)

  function verstuur() {
    setFout(null)
    start(async () => {
      const res = await nomineer(roundId, nominee, reden)
      if (!res.ok) {
        setFout(res.fout ?? "Er ging iets mis.")
        return
      }
      setNominee("")
      setReden("")
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fk-btn fk-btn-secondary fk-btn-full"
      >
        🌟 Iemand nomineren
      </button>
    )
  }

  return (
    <div className="fk-card space-y-3">
      <p className="font-black text-inkt text-lg">Wie wil je nomineren?</p>
      <select
        value={nominee}
        onChange={(e) => setNominee(e.target.value)}
        className={invoer}
      >
        <option value="">Kies een familielid…</option>
        {leden.map((l) => (
          <option key={l.id} value={l.id}>
            {l.naam}
          </option>
        ))}
      </select>
      <textarea
        value={reden}
        onChange={(e) => setReden(e.target.value)}
        placeholder="Eén zin waarom. Bijv. “Ze heeft dit jaar veel voor iedereen gedaan.”"
        rows={2}
        maxLength={200}
        className={`${invoer} resize-none`}
      />
      {fout && <p className="text-terracotta font-semibold">{fout}</p>}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setOpen(false)
            setFout(null)
          }}
          className="fk-btn fk-btn-secondary flex-1"
        >
          Terug
        </button>
        <button
          onClick={verstuur}
          disabled={bezig || !nominee || reden.trim().length < 3}
          className="fk-btn fk-btn-primary flex-1"
        >
          Nomineren
        </button>
      </div>
    </div>
  )
}

// Eén stemknop per nominatie.
export function StemPaneel({
  roundId,
  nominationId,
}: {
  roundId: string
  nominationId: string
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  function stemUit() {
    setFout(null)
    start(async () => {
      const res = await stem(roundId, nominationId)
      if (!res.ok) {
        setFout(res.fout ?? "Er ging iets mis.")
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={stemUit}
        disabled={bezig}
        className="fk-btn fk-btn-primary fk-btn-full"
        style={{ minHeight: 48 }}
      >
        Stem op deze persoon
      </button>
      {fout && <p className="text-terracotta font-semibold mt-2">{fout}</p>}
    </>
  )
}

// Family Keeper sluit de stemming — de meest gekozen persoon wint.
export function SluitKnop({ roundId }: { roundId: string }) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [bevestig, setBevestig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  function sluit() {
    setFout(null)
    start(async () => {
      const res = await sluitStem(roundId)
      if (!res.ok) {
        setFout(res.fout ?? "Er ging iets mis.")
        return
      }
      router.refresh()
    })
  }

  if (!bevestig) {
    return (
      <button
        onClick={() => setBevestig(true)}
        className="w-full text-inkt-zacht font-bold py-3 hover:text-inkt transition"
      >
        Stemming sluiten (Family Keeper)
      </button>
    )
  }

  return (
    <div className="fk-card space-y-3 text-center">
      <p className="text-inkt font-semibold">
        Weet je het zeker? De persoon met de meeste stemmen wint. Dit kan niet
        terug.
      </p>
      {fout && <p className="text-terracotta font-semibold">{fout}</p>}
      <div className="flex gap-3">
        <button
          onClick={() => setBevestig(false)}
          className="fk-btn fk-btn-secondary flex-1"
        >
          Terug
        </button>
        <button
          onClick={sluit}
          disabled={bezig}
          className="fk-btn fk-btn-gold flex-1"
        >
          Sluiten
        </button>
      </div>
    </div>
  )
}
