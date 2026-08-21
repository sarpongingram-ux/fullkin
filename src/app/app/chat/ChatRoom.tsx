"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  stuurBericht,
  haalNieuweBerichten,
  startCollecteVanuitChat,
  markeerGelezen,
  type ChatBericht,
} from "./acties"

export type Directory = Record<
  string,
  { voornaam: string; photoUrl: string | null; relatie: string }
>

type Kandidaat = { id: string; naam: string; label: string }

const momenten = [
  { waarde: "verjaardag", label: "Verjaardag" },
  { waarde: "ronde_verjaardag", label: "Ronde verjaardag" },
  { waarde: "afstuderen", label: "Afstuderen" },
  { waarde: "huwelijk", label: "Huwelijk" },
  { waarde: "geboorte", label: "Geboorte" },
  { waarde: "zwemdiploma", label: "Zwemdiploma / A-diploma" },
  { waarde: "nieuwe_school", label: "Nieuwe school" },
  { waarde: "diaspora_mijlpaal", label: "Diaspora-mijlpaal" },
] as const

function tijd(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ChatRoom({
  roomId,
  meId,
  groepsnaam,
  aantalLeden,
  directory,
  initieel,
  collecteKandidaten,
  subtitel,
}: {
  roomId: string
  meId: string
  groepsnaam: string
  aantalLeden: number
  directory: Directory
  initieel: ChatBericht[]
  collecteKandidaten: Kandidaat[]
  subtitel?: string
}) {
  const [berichten, setBerichten] = useState<ChatBericht[]>(initieel)
  const [tekst, setTekst] = useState("")
  const [bezig, setBezig] = useState(false)
  const [collecteOpen, setCollecteOpen] = useState(false)
  const berichtenRef = useRef<ChatBericht[]>(initieel)
  const bodemRef = useRef<HTMLDivElement>(null)

  berichtenRef.current = berichten

  function voegToe(nieuwe: ChatBericht[]) {
    if (nieuwe.length === 0) return
    setBerichten((prev) => {
      const bestaand = new Set(prev.map((m) => m.id))
      const extra = nieuwe.filter((n) => !bestaand.has(n.id))
      return extra.length ? [...prev, ...extra] : prev
    })
  }

  // Live berichten via Supabase Realtime.
  useEffect(() => {
    const supabase = createClient()
    let kanaal: ReturnType<typeof supabase.channel> | null = null
    let actief = true
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) supabase.realtime.setAuth(session.access_token)
      if (!actief) return
      kanaal = supabase
        .channel(`room:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => voegToe([payload.new as ChatBericht]),
        )
        .subscribe()
    })()
    return () => {
      actief = false
      if (kanaal) supabase.removeChannel(kanaal)
    }
  }, [roomId])

  // Vangnet: elke 12s ophalen wat Realtime eventueel miste.
  useEffect(() => {
    const id = setInterval(async () => {
      const laatste = berichtenRef.current[berichtenRef.current.length - 1]
      if (!laatste) return
      const nieuwe = await haalNieuweBerichten(roomId, laatste.created_at)
      voegToe(nieuwe)
    }, 12000)
    return () => clearInterval(id)
  }, [roomId])

  // Naar beneden scrollen bij nieuwe berichten.
  useEffect(() => {
    bodemRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [berichten])

  // Markeer de ruimte als gelezen bij openen.
  useEffect(() => {
    markeerGelezen(roomId)
  }, [roomId])

  async function verstuur() {
    const t = tekst.trim()
    if (!t || bezig) return
    setBezig(true)
    setTekst("")
    const res = await stuurBericht(roomId, t)
    setBezig(false)
    if (res.ok) voegToe([res.bericht])
    else setTekst(t)
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Kop */}
      <header className="sticky top-0 z-20 bg-white border-b border-rand px-4 py-3 flex items-center gap-3">
        <Link href="/app/chat" className="text-inkt-zacht font-bold hover:text-inkt">
          ←
        </Link>
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg shrink-0"
          style={{ background: "var(--terracotta)" }}
        >
          💬
        </div>
        <div className="min-w-0">
          <p className="font-black text-inkt truncate">{groepsnaam}</p>
          <p className="text-xs text-inkt-zacht">
            {subtitel ??
              `${aantalLeden} ${aantalLeden === 1 ? "familielid" : "familieleden"} · privé`}
          </p>
        </div>
      </header>

      {/* Berichten */}
      <div className="px-4 pt-4 pb-32 space-y-3">
        {berichten.map((m) => {
          if (m.message_type === "collecte_link" && m.reference_id) {
            const wie = m.sender_id ? directory[m.sender_id] : null
            return (
              <div key={m.id} className="flex justify-center">
                <div
                  className="fk-card w-full max-w-[92%] border-2"
                  style={{ borderColor: "var(--goud)" }}
                >
                  <p className="text-xs font-black text-goud uppercase tracking-wide">
                    ❤️ Collecte
                  </p>
                  <p className="font-black text-inkt mt-1">{m.message_text}</p>
                  {wie && (
                    <p className="text-xs text-inkt-zacht mt-0.5">
                      gestart door {wie.voornaam}
                    </p>
                  )}
                  <Link
                    href={`/app/collecte/${m.reference_id}`}
                    className="fk-btn fk-btn-primary fk-btn-full mt-3 text-sm"
                  >
                    Draag bij →
                  </Link>
                </div>
              </div>
            )
          }
          if (m.sender_id === null || m.message_type === "systeem") {
            return (
              <div key={m.id} className="flex justify-center">
                <p className="text-xs text-inkt-zacht bg-oppervlak rounded-full px-4 py-1.5 text-center max-w-[85%]">
                  {m.message_text}
                </p>
              </div>
            )
          }
          const ik = m.sender_id === meId
          const wie = directory[m.sender_id] ?? {
            voornaam: "Familielid",
            photoUrl: null,
            relatie: "familielid",
          }
          if (ik) {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[78%]">
                  <div
                    className="rounded-3xl rounded-br-md px-4 py-2.5 text-white"
                    style={{ background: "var(--terracotta)" }}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                  </div>
                  <p className="text-[11px] text-inkt-zacht mt-1 text-right">
                    {tijd(m.created_at)}
                  </p>
                </div>
              </div>
            )
          }
          return (
            <div key={m.id} className="flex gap-2 items-end">
              <div className="w-9 h-9 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-sm bg-inkt">
                {wie.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={wie.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (wie.voornaam[0] ?? "?").toUpperCase()
                )}
              </div>
              <div className="max-w-[78%]">
                <p className="text-xs mb-0.5 ml-1">
                  <span className="font-black text-inkt">{wie.voornaam}</span>{" "}
                  <span className="text-inkt-zacht">· jouw {wie.relatie}</span>
                </p>
                <div className="rounded-3xl rounded-bl-md px-4 py-2.5 bg-oppervlak text-inkt">
                  <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                </div>
                <p className="text-[11px] text-inkt-zacht mt-1 ml-1">{tijd(m.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bodemRef} />
      </div>

      {/* Chatbalk */}
      <div
        className="fixed inset-x-0 z-30 bg-white border-t border-rand"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 60px)" }}
      >
        <div className="max-w-md mx-auto px-3 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollecteOpen(true)}
            disabled={collecteKandidaten.length === 0}
            title="Start een collecte"
            aria-label="Start een collecte"
            className="w-10 h-10 rounded-full text-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition"
          >
            💰
          </button>
          <input
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                verstuur()
              }
            }}
            placeholder="Typ een bericht…"
            className="flex-1 rounded-full border-2 border-rand bg-white px-4 py-2.5 text-inkt text-base outline-none focus:border-terracotta"
          />
          <button
            onClick={verstuur}
            disabled={bezig || !tekst.trim()}
            aria-label="Verstuur"
            className="w-11 h-11 rounded-full text-white text-lg flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition"
            style={{ background: "var(--terracotta)" }}
          >
            ➤
          </button>
        </div>
      </div>

      {/* Collecte starten vanuit de chat */}
      {collecteOpen && (
        <CollecteSheet
          roomId={roomId}
          kandidaten={collecteKandidaten}
          onKlaar={(bericht) => {
            voegToe([bericht])
            setCollecteOpen(false)
          }}
          onSluit={() => setCollecteOpen(false)}
        />
      )}
    </div>
  )
}

function CollecteSheet({
  roomId,
  kandidaten,
  onKlaar,
  onSluit,
}: {
  roomId: string
  kandidaten: Kandidaat[]
  onKlaar: (bericht: ChatBericht) => void
  onSluit: () => void
}) {
  const [beneficiaryId, setBeneficiaryId] = useState(kandidaten[0]?.id ?? "")
  const [kind, setKind] = useState<string>(momenten[0].waarde)
  const [titel, setTitel] = useState("")
  const [datum, setDatum] = useState("")
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  async function start() {
    if (!beneficiaryId || !titel.trim() || !datum) {
      setFout("Vul alle velden in.")
      return
    }
    setFout(null)
    setBezig(true)
    const res = await startCollecteVanuitChat({
      roomId,
      beneficiaryId,
      kind,
      titel,
      datum,
    })
    setBezig(false)
    if (res.ok) onKlaar(res.bericht)
    else setFout(res.fout)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-inkt/40 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 mb-24 sm:mb-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-inkt text-lg">❤️ Start een collecte</h3>
          <button onClick={onSluit} className="text-inkt-zacht font-bold hover:text-inkt">
            Sluiten
          </button>
        </div>

        <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Voor wie?</label>
        <select
          value={beneficiaryId}
          onChange={(e) => setBeneficiaryId(e.target.value)}
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
        >
          {kandidaten.map((k) => (
            <option key={k.id} value={k.id}>
              {k.naam} ({k.label})
            </option>
          ))}
        </select>

        <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Welk moment?</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
        >
          {momenten.map((m) => (
            <option key={m.waarde} value={m.waarde}>
              {m.label}
            </option>
          ))}
        </select>

        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Titel, bv. 'Verjaardag van opa'"
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
        />
        <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Datum</label>
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
        />

        {fout && <p className="text-terracotta font-semibold mb-2">{fout}</p>}

        <button
          onClick={start}
          disabled={bezig}
          className="fk-btn fk-btn-primary fk-btn-full"
        >
          {bezig ? "Bezig…" : "Collecte openen en delen"}
        </button>
      </div>
    </div>
  )
}
