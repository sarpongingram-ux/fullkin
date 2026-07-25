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
    ? `Hoi ${voornaam}! ${uitnodigerVoornaam} heeft jou toegevoegd aan ${familieNaam} op Fullkin — de plek waar onze familie samenkomt. Jouw plek staat al klaar. Open 'm hier: ${link}`
    : ""

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(bericht)}`

  if (!link) {
    return (
      <div className="mt-2">
        <button
          onClick={genereer}
          disabled={bezig}
          className="text-xs text-terracotta font-medium hover:underline disabled:opacity-60"
        >
          {bezig ? "Bezig…" : "Uitnodigen"}
        </button>
        {fout && <p className="text-xs text-terracotta mt-1">{fout}</p>}
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-lg bg-klei/40 border border-rand p-3 space-y-2">
      <p className="text-xs text-inkt-zacht">
        Deel deze uitnodiging zelf met {voornaam}. Fullkin verstuurt niets voor
        je.
      </p>
      <div className="flex gap-2">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center rounded-full bg-groen py-2 text-white text-sm font-medium hover:opacity-90 transition"
        >
          Deel via WhatsApp
        </a>
        <button
          onClick={() => {
            navigator.clipboard.writeText(link)
            setGekopieerd(true)
            setTimeout(() => setGekopieerd(false), 1500)
          }}
          className="rounded-full border border-rand px-4 py-2 text-sm text-inkt hover:bg-oppervlak transition"
        >
          {gekopieerd ? "Gekopieerd" : "Kopieer link"}
        </button>
      </div>
    </div>
  )
}
