"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { stuurOntdekBericht, maakOntdekFotoUploadUrl, stuurOntdekFoto } from "./acties"
import { createClient } from "@/lib/supabase/client"

export type OntdekBericht = {
  id: string
  is_van_mij: boolean
  afzender_naam: string
  tekst: string | null
  foto_url?: string | null
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
  const [uploadt, setUploadt] = useState(false)
  const eindeRef = useRef<HTMLDivElement>(null)
  const fotoInput = useRef<HTMLInputElement>(null)

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

  async function stuurFoto(bestand: File) {
    setFout(null)
    setUploadt(true)
    try {
      const supabase = createClient()
      const ext = bestand.name.split(".").pop()?.toLowerCase() || "jpg"
      const link = await maakOntdekFotoUploadUrl(ext)
      if (!link.ok) return setFout(link.fout)
      const { error: uploadFout } = await supabase.storage
        .from("ontdek-media")
        .uploadToSignedUrl(link.pad, link.token, bestand, {
          contentType: bestand.type || undefined,
          upsert: false,
        })
      if (uploadFout) return setFout("Uploaden mislukt: " + uploadFout.message)
      const res = await stuurOntdekFoto(anderId, link.pad, tekst.trim() || undefined)
      if (!res.ok) return setFout(res.fout ?? "Kon de foto niet versturen.")
      setTekst("")
      router.refresh()
    } finally {
      setUploadt(false)
      if (fotoInput.current) fotoInput.current.value = ""
    }
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
                {b.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.foto_url}
                    alt="Gedeelde foto"
                    className="rounded-lg max-h-60 w-auto mb-1"
                  />
                )}
                {b.tekst}
              </div>
            </div>
          ))}
          <div ref={eindeRef} />
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <input
          ref={fotoInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) stuurFoto(f)
          }}
        />
        <button
          type="button"
          onClick={() => fotoInput.current?.click()}
          disabled={bezig || uploadt}
          aria-label="Foto sturen"
          className="shrink-0 rounded-2xl border-2 border-rand bg-white px-3 py-2.5 text-lg leading-none hover:border-terracotta disabled:opacity-60"
        >
          📷
        </button>
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
          disabled={bezig || uploadt}
          className="flex-1 resize-none rounded-2xl border-2 border-rand bg-white px-4 py-2.5 text-inkt text-sm outline-none focus:border-terracotta"
        />
        <button
          onClick={verstuur}
          disabled={bezig || uploadt || !tekst.trim()}
          className="fk-btn fk-btn-primary text-sm py-2.5 px-4 shrink-0"
        >
          {uploadt ? "Foto…" : bezig ? "…" : "Stuur"}
        </button>
      </div>
      {fout && <p className="text-terracotta text-sm font-semibold mt-2">{fout}</p>}
    </section>
  )
}
