"use client"

import { useState } from "react"
import { maakUitnodiging } from "./uitnodigen"

export function UitnodigenKnop({
  personId,
  voornaam,
  familieNaam,
  uitnodigerVoornaam,
}: {
  personId: string
  voornaam: string
  familieNaam: string
  uitnodigerVoornaam: string
}) {
  const [link, setLink] = useState<string | null>(null)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [gekopieerd, setGekopieerd] = useState(false)

  async function genereer() {
    setBezig(true)
    setFout(null)
    const res = await maakUitnodiging(personId)
    setBezig(false)
    if (!res.ok) {
      setFout(res.fout)
      return
    }
    setLink(`${window.location.origin}/welkom/${res.token}`)
  }

  const bericht = link
    ? `Hoi ${voornaam}! ${uitnodigerVoornaam} heeft jou toegevoegd aan ${familieNaam} op Fullkin, de plek waar onze familie samenkomt. Jouw plek staat al klaar. Open 'm hier: ${link}`
    : ""

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(bericht)}`

  if (!link) {
    return (
      <div className="mt-2">
        <button
          onClick={genereer}
          disabled={bezig}
          className="inline-flex items-center gap-1.5 rounded-full border-2 font-bold text-sm px-4 py-2 transition disabled:opacity-60"
          style={{ borderColor: "var(--groen)", color: "var(--groen)" }}
        >
          {bezig ? "Bezig…" : "📲 Uitnodigen"}
        </button>
        {fout && <p className="text-sm text-terracotta font-semibold mt-1">{fout}</p>}
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-2xl bg-klei p-3 space-y-2">
      <p className="text-sm text-inkt-zacht font-semibold">
        Deel de uitnodiging met {voornaam}. Fullkin verstuurt niets voor je.
      </p>
      <div className="flex gap-2">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center rounded-full py-2.5 text-white font-bold hover:opacity-90 transition"
          style={{ background: "var(--groen)" }}
        >
          💬 Deel via WhatsApp
        </a>
        <button
          onClick={() => {
            navigator.clipboard.writeText(link)
            setGekopieerd(true)
            setTimeout(() => setGekopieerd(false), 1500)
          }}
          className="rounded-full border-2 border-rand px-4 py-2.5 text-sm font-bold text-inkt hover:bg-white transition"
        >
          {gekopieerd ? "Gekopieerd ✓" : "Kopieer"}
        </button>
      </div>
    </div>
  )
}
