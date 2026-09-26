"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { stuurOntdekBericht } from "./acties"
import { createClient } from "@/lib/supabase/client"

export type OntdekBericht = {
  id: string
  is_van_mij: boolean
  afzender_naam: string
  tekst: string
  aangemaakt_op: string
}

export function OntdekChat({
  anderId,
  voornaam,
  berichten,
}: {
  anderId: string
  voornaam: string
  berichten: OntdekBericht[]
}) {
  const router = useRouter()
  const [bezig, start] = useTransition()
  const [tekst, setTekst] = useState("")
  const [fout, setFout] = useState<string | null>(null)
  const eindeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    eindeRef.current?.scrollIntoView({ block: "nearest" })
  }, [berichten.length])

  // Realtime: nieuwe berichten komen live binnen. RLS zorgt dat we alleen events van
  // onze eigen gesprekken ontvangen; bij een nieuw bericht verversen we de pagina
  // (server-component herlaadt de berichten en markeert gelezen).
  useEffect(() => {
    const supabase = createClient()
    const kanaal = supabase
      .channel(`ontdek-chat-${anderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ontdek_berichten" },
        () => router.refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(kanaal)
    }
  }, [anderId, router])

  function verstuur() {
    const schoon = tekst.trim()
    if (!schoon) return
    setFout(null)
    start(async () => {
      const res = await stuurOntdekBericht(anderId, schoon)
      if (!res.ok) return setFout(res.fout ?? "Er ging iets mis.")
      setTekst("")
      router.refresh()
    })
  }

  return (
    <section className="fk-card">
      <p className="text-xs font-extrabold tracking-[0.18em] text-terracotta">
        BERICHTEN
      </p>

      {berichten.length === 0 ? (
        <p className="text-sm text-inkt-zacht mt-2 leading-relaxed">
          Nog geen berichten. Stuur {voornaam} een eerste bericht en leer elkaar
          kennen.
        </p>
      ) : (
        <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
          {berichten.map((b) => (
            <div
              key={b.id}
              className={`flex ${b.is_van_mij ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                  b.is_van_mij
                    ? "bg-terracotta text-white rounded-br-sm"
                    : "bg-oppervlak text-inkt rounded-bl-sm"
                }`}
              >
                {!b.is_van_mij && (
                  <p className="text-[11px] font-bold opacity-70 mb-0.5">
                    {b.afzender_naam}
                  </p>
                )}
                {b.tekst}
              </div>
            </div>
          ))}
          <div ref={eindeRef} />
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              verstuur()
            }
          }}
          rows={1}
          placeholder={`Bericht aan ${voornaam}…`}
          disabled={bezig}
          className="flex-1 resize-none rounded-2xl border-2 border-rand bg-white px-4 py-2.5 text-inkt text-sm outline-none focus:border-terracotta"
        />
        <button
          onClick={verstuur}
          disabled={bezig || !tekst.trim()}
          className="fk-btn fk-btn-primary text-sm py-2.5 px-4 shrink-0"
        >
          {bezig ? "…" : "Stuur"}
        </button>
      </div>
      {fout && <p className="text-terracotta text-sm font-semibold mt-2">{fout}</p>}
    </section>
  )
}
