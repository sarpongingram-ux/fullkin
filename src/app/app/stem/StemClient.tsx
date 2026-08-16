"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { nomineer, stem, sluitStem } from "./acties"

type Lid = { id: string; naam: string }

// Nomineren — één familielid, één zin waarom.
export function Nomineren({
  roundId,
  leden,
}: {
  roundId: string
  leden: Lid[]
}) {
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
        className="w-full rounded-full border border-terracotta text-terracotta font-medium py-3 hover:bg-klei/40 transition"
      >
        Iemand nomineren
      </button>
    )
  }

  return (
    <div className="bg-oppervlak rounded-2xl border border-rand p-5 space-y-3">
      <p className="font-semibold text-inkt">Wie wil je nomineren?</p>
      <select
        value={nominee}
        onChange={(e) => setNominee(e.target.value)}
        className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta"
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
        className="w-full rounded-lg border border-rand bg-achtergrond px-3 py-2 text-inkt outline-none focus:border-terracotta resize-none"
      />
      {fout && <p className="text-sm text-terracotta">{fout}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setOpen(false)
            setFout(null)
          }}
          className="flex-1 rounded-full border border-rand py-2.5 text-inkt-zacht hover:bg-klei/40 transition"
        >
          Terug
        </button>
        <button
          onClick={verstuur}
          disabled={bezig || !nominee || reden.trim().length < 3}
          className="flex-1 rounded-full bg-terracotta py-2.5 text-white font-medium hover:bg-terracotta-diep transition disabled:opacity-60"
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
        className="w-full rounded-full bg-inkt text-white text-sm font-medium py-2.5 hover:opacity-90 transition disabled:opacity-60"
      >
        Stem op deze persoon
      </button>
      {fout && <p className="text-sm text-terracotta mt-2">{fout}</p>}
    </>
  )
}

// Co-Founder sluit de stemming — de meest gekozen persoon wint.
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
        className="w-full rounded-full border border-rand text-inkt-zacht text-sm py-2.5 hover:bg-klei/40 transition"
      >
        Stemming sluiten (Co-Founder)
      </button>
    )
  }

  return (
    <div className="bg-oppervlak rounded-2xl border border-goud/40 p-4 space-y-3 text-center">
      <p className="text-sm text-inkt">
        Weet je het zeker? De persoon met de meeste stemmen wint. Dit kan niet
        terug.
      </p>
      {fout && <p className="text-sm text-terracotta">{fout}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setBevestig(false)}
          className="flex-1 rounded-full border border-rand py-2.5 text-inkt-zacht hover:bg-klei/40 transition"
        >
          Terug
        </button>
        <button
          onClick={sluit}
          disabled={bezig}
          className="flex-1 rounded-full bg-goud py-2.5 text-inkt font-semibold hover:opacity-90 transition disabled:opacity-60"
        >
          Sluiten
        </button>
      </div>
    </div>
  )
}
