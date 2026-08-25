"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  stuurBericht,
  bewerkBericht,
  haalNieuweBerichten,
  startCollecteVanuitChat,
  deelMoment,
  markeerGelezen,
  deelFoto,
  tekenChatFoto,
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
  momentKandidaten,
  subtitel,
  fotoUrls: fotoUrlsInit,
}: {
  roomId: string
  meId: string
  groepsnaam: string
  aantalLeden: number
  directory: Directory
  initieel: ChatBericht[]
  collecteKandidaten: Kandidaat[]
  momentKandidaten: Kandidaat[]
  subtitel?: string
  fotoUrls: Record<string, string>
}) {
  const [berichten, setBerichten] = useState<ChatBericht[]>(initieel)
  const [tekst, setTekst] = useState("")
  const [bezig, setBezig] = useState(false)
  const [collecteOpen, setCollecteOpen] = useState(false)
  const [momentOpen, setMomentOpen] = useState(false)
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>(fotoUrlsInit)
  const [fotoBezig, setFotoBezig] = useState(false)
  const [bewerktId, setBewerktId] = useState<string | null>(null)
  const [bewerkTekst, setBewerkTekst] = useState("")
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const berichtenRef = useRef<ChatBericht[]>(initieel)
  const bodemRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gevraagd = useRef<Set<string>>(new Set())

  berichtenRef.current = berichten

  // Houd de chat exact zo hoog als het zichtbare venster, zodat de invoerbalk
  // boven het toetsenbord blijft (i.p.v. erachter te verdwijnen op mobiel).
  useEffect(() => {
    const vv = window.visualViewport
    const el = containerRef.current
    if (!vv || !el) return
    const pas = () => {
      el.style.height = `${vv.height}px`
    }
    pas()
    vv.addEventListener("resize", pas)
    return () => {
      vv.removeEventListener("resize", pas)
    }
  }, [])

  function voegToe(nieuwe: ChatBericht[]) {
    if (nieuwe.length === 0) return
    setBerichten((prev) => {
      const bestaand = new Set(prev.map((m) => m.id))
      const extra = nieuwe.filter((n) => !bestaand.has(n.id))
      return extra.length ? [...prev, ...extra] : prev
    })
  }

  function vervang(b: ChatBericht) {
    setBerichten((prev) => prev.map((m) => (m.id === b.id ? b : m)))
  }

  async function slaBewerkingOp() {
    if (!bewerktId) return
    const t = bewerkTekst.trim()
    if (!t) return
    const res = await bewerkBericht(bewerktId, t)
    if (res.ok) {
      vervang(res.bericht)
      setBewerktId(null)
      setBewerkTekst("")
    }
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
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_messages",
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => vervang(payload.new as ChatBericht),
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

  // Signeer URL's voor foto's die nog geen link hebben (bv. live binnengekomen).
  useEffect(() => {
    const missend = berichten.filter(
      (m) =>
        m.message_type === "foto" &&
        m.message_text &&
        !fotoUrls[m.id] &&
        !gevraagd.current.has(m.id),
    )
    if (missend.length === 0) return
    missend.forEach((m) => gevraagd.current.add(m.id))
    ;(async () => {
      for (const m of missend) {
        const url = await tekenChatFoto(m.message_text as string)
        if (url) setFotoUrls((prev) => ({ ...prev, [m.id]: url }))
      }
    })()
  }, [berichten, fotoUrls])

  function kiesFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f || fotoBezig) return
    setFotoBezig(true)
    const formData = new FormData()
    formData.set("foto", f)
    ;(async () => {
      const res = await deelFoto(roomId, formData)
      setFotoBezig(false)
      if (res.ok) {
        if (res.url) setFotoUrls((prev) => ({ ...prev, [res.bericht.id]: res.url }))
        voegToe([res.bericht])
      }
    })()
  }

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
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-white"
      style={{ height: "100dvh" }}
    >
      {/* Kop */}
      <header className="flex-none bg-white border-b border-rand px-4 py-3 flex items-center gap-3">
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
              `${aantalLeden} ${aantalLeden === 1 ? "familielid" : "familieleden"} · iedereen leest mee`}
          </p>
        </div>
      </header>

      {/* Berichten */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-4 pb-3 space-y-3">
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
          if (m.message_type === "moment") {
            const wie = m.sender_id ? directory[m.sender_id] : null
            return (
              <div key={m.id} className="flex justify-center my-1">
                <div
                  className="w-full max-w-[94%] rounded-3xl p-5 text-center text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--terracotta), var(--goud))",
                  }}
                >
                  <p className="text-4xl mb-1">🎉</p>
                  <p className="text-xs font-black uppercase tracking-[0.2em] opacity-90">
                    Familiemoment
                  </p>
                  <p className="text-xl font-black mt-1">{m.message_text}</p>
                  {wie && (
                    <p className="text-sm opacity-90 mt-1">
                      gedeeld door {wie.voornaam}
                    </p>
                  )}
                </div>
              </div>
            )
          }
          if (m.message_type === "foto") {
            const ik = m.sender_id === meId
            const wie = m.sender_id ? directory[m.sender_id] : null
            const url = fotoUrls[m.id]
            const foto = (
              <Link
                href={m.reference_id ? `/app/album/${m.reference_id}` : "#"}
                className="block rounded-3xl overflow-hidden bg-oppervlak max-w-[78%]"
                style={{ width: 220 }}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="Gedeelde foto" className="w-full object-cover" />
                ) : (
                  <div className="h-40 flex items-center justify-center text-inkt-zacht text-sm">
                    Foto laden…
                  </div>
                )}
              </Link>
            )
            if (ik) {
              return (
                <div key={m.id} className="flex justify-end">
                  <div>
                    {foto}
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
                  {wie?.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={wie.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (wie?.voornaam[0] ?? "?").toUpperCase()
                  )}
                </div>
                <div>
                  {wie && (
                    <p className="text-xs mb-0.5 ml-1">
                      <span className="font-black text-inkt">{wie.voornaam}</span>{" "}
                      <span className="text-inkt-zacht">· jouw {wie.relatie}</span>
                    </p>
                  )}
                  {foto}
                  <p className="text-[11px] text-inkt-zacht mt-1 ml-1">{tijd(m.created_at)}</p>
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
            if (bewerktId === m.id) {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="w-[85%]">
                    <textarea
                      value={bewerkTekst}
                      onChange={(e) => setBewerkTekst(e.target.value)}
                      rows={2}
                      autoFocus
                      className="w-full rounded-2xl border-2 border-terracotta bg-white px-4 py-2.5 text-inkt text-base outline-none resize-none"
                    />
                    <div className="flex justify-end gap-3 mt-1">
                      <button
                        onClick={() => {
                          setBewerktId(null)
                          setBewerkTekst("")
                        }}
                        className="text-sm font-bold text-inkt-zacht"
                      >
                        Annuleren
                      </button>
                      <button
                        onClick={slaBewerkingOp}
                        disabled={!bewerkTekst.trim()}
                        className="text-sm font-bold text-terracotta disabled:opacity-40"
                      >
                        Opslaan
                      </button>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <div key={m.id} className="flex justify-end group">
                <div className="max-w-[78%]">
                  <div
                    className="rounded-3xl rounded-br-md px-4 py-2.5 text-white"
                    style={{ background: "var(--terracotta)" }}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.message_text}</p>
                  </div>
                  <p className="text-[11px] text-inkt-zacht mt-1 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setBewerktId(m.id)
                        setBewerkTekst(m.message_text ?? "")
                      }}
                      className="font-bold text-terracotta"
                    >
                      Bewerken
                    </button>
                    <span>
                      {m.edited_at ? "bewerkt · " : ""}
                      {tijd(m.created_at)}
                    </span>
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
                <p className="text-[11px] text-inkt-zacht mt-1 ml-1">
                  {m.edited_at ? "bewerkt · " : ""}
                  {tijd(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bodemRef} />
      </div>

      {/* Chatbalk */}
      <div
        className="flex-none bg-white border-t border-rand"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="px-3 py-2 flex items-center gap-1.5">
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            onChange={kiesFoto}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fotoInputRef.current?.click()}
            disabled={fotoBezig}
            title="Deel een foto"
            aria-label="Deel een foto"
            className="w-10 h-10 rounded-full text-xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition"
          >
            {fotoBezig ? "⏳" : "📷"}
          </button>
          <button
            type="button"
            onClick={() => setMomentOpen(true)}
            disabled={momentKandidaten.length === 0}
            title="Deel een moment"
            aria-label="Deel een moment"
            className="w-10 h-10 rounded-full text-xl flex items-center justify-center disabled:opacity-30 active:scale-90 transition"
          >
            🎉
          </button>
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
          onGelukt={() => setCollecteOpen(false)}
          onSluit={() => setCollecteOpen(false)}
        />
      )}

      {/* Familiemoment delen */}
      {momentOpen && (
        <MomentSheet
          roomId={roomId}
          kandidaten={momentKandidaten}
          onKlaar={(bericht) => {
            voegToe([bericht])
            setMomentOpen(false)
          }}
          onSluit={() => setMomentOpen(false)}
        />
      )}
    </div>
  )
}

function MomentSheet({
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
  const [personId, setPersonId] = useState(kandidaten[0]?.id ?? "")
  const [kind, setKind] = useState<string>(momenten[0].waarde)
  const [titel, setTitel] = useState("")
  const [datum, setDatum] = useState("")
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  async function deel() {
    if (!personId || !titel.trim() || !datum) {
      setFout("Vul alle velden in.")
      return
    }
    setFout(null)
    setBezig(true)
    const res = await deelMoment({ roomId, personId, kind, titel, datum })
    setBezig(false)
    if (res.ok) onKlaar(res.bericht)
    else setFout(res.fout)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-inkt/40 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 mb-24 sm:mb-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-inkt text-lg">🎉 Deel een moment</h3>
          <button onClick={onSluit} className="text-inkt-zacht font-bold hover:text-inkt">
            Sluiten
          </button>
        </div>

        <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Over wie?</label>
        <select
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
        >
          {kandidaten.map((k) => (
            <option key={k.id} value={k.id}>
              {k.naam}
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
          placeholder="Bijv. 'Geboorte van kleine Kwame'"
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
        />
        <label className="block text-sm text-inkt-zacht mb-1 font-semibold">Wanneer?</label>
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta mb-3"
        />

        {fout && <p className="text-terracotta font-semibold mb-2">{fout}</p>}

        <button
          onClick={deel}
          disabled={bezig}
          className="fk-btn fk-btn-primary fk-btn-full"
        >
          {bezig ? "Bezig…" : "Delen met de familie"}
        </button>
      </div>
    </div>
  )
}

function CollecteSheet({
  roomId,
  kandidaten,
  onGelukt,
  onSluit,
}: {
  roomId: string
  kandidaten: Kandidaat[]
  onGelukt: () => void
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
    if (res.ok) onGelukt()
    else setFout(res.fout)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-inkt/40 px-4">
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
