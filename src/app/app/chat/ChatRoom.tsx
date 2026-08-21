"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { stuurBericht, haalNieuweBerichten, type ChatBericht } from "./acties"

export type Directory = Record<
  string,
  { voornaam: string; photoUrl: string | null; relatie: string }
>

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
}: {
  roomId: string
  meId: string
  groepsnaam: string
  aantalLeden: number
  directory: Directory
  initieel: ChatBericht[]
}) {
  const [berichten, setBerichten] = useState<ChatBericht[]>(initieel)
  const [tekst, setTekst] = useState("")
  const [bezig, setBezig] = useState(false)
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
        <Link href="/app/familie" className="text-inkt-zacht font-bold hover:text-inkt">
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
            {aantalLeden} {aantalLeden === 1 ? "familielid" : "familieleden"} · privé
          </p>
        </div>
      </header>

      {/* Berichten */}
      <div className="px-4 pt-4 pb-32 space-y-3">
        {berichten.map((m) => {
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
            title="Binnenkort"
            className="w-10 h-10 rounded-full text-xl flex items-center justify-center opacity-40"
          >
            📷
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
    </div>
  )
}
