"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { maakHerinnering } from "../acties"
import type { Enums } from "@/lib/types/database"

type Lid = { id: string; naam: string }

function mediaSoort(mime: string): Enums<"media_kind"> {
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  return "foto"
}

export function Uploader({
  networkId,
  familie,
}: {
  networkId: string
  familie: Lid[]
}) {
  const router = useRouter()
  const [bestand, setBestand] = useState<File | null>(null)
  const [soort, setSoort] = useState<Enums<"media_kind">>("foto")
  const [voorbeeld, setVoorbeeld] = useState<string | null>(null)
  const [titel, setTitel] = useState("")
  const [datum, setDatum] = useState("")
  const [locatie, setLocatie] = useState("")
  const [verhaal, setVerhaal] = useState("")
  const [getagd, setGetagd] = useState<Set<string>>(new Set())
  const [zoek, setZoek] = useState("")
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  function kiesBestand(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 200 * 1024 * 1024) {
      setFout("Dit bestand is groter dan 200MB.")
      return
    }
    setFout(null)
    setBestand(f)
    setSoort(mediaSoort(f.type))
    setVoorbeeld(URL.createObjectURL(f))
  }

  function toggleTag(id: string) {
    setGetagd((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function delen() {
    if (!bestand) {
      setFout("Kies eerst iets om te delen.")
      return
    }
    setBezig(true)
    setFout(null)

    const supabase = createClient()
    const ext = bestand.name.split(".").pop()?.toLowerCase() || "jpg"
    const pad = `${networkId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadFout } = await supabase.storage
      .from("family-album")
      .upload(pad, bestand, { cacheControl: "3600", upsert: false })
    if (uploadFout) {
      setFout("Uploaden mislukt: " + uploadFout.message)
      setBezig(false)
      return
    }

    const res = await maakHerinnering({
      filePath: pad,
      fileType: soort,
      title: titel,
      memoryText: verhaal,
      dateOfMemory: datum || null,
      location: locatie,
      tagPersonIds: [...getagd],
    })
    if (!res.ok) {
      setFout(res.fout)
      setBezig(false)
      return
    }
    router.push(`/app/album/${res.id}`)
  }

  const zichtbaar = zoek
    ? familie.filter((l) => l.naam.toLowerCase().includes(zoek.toLowerCase()))
    : familie.slice(0, 8)

  return (
    <div className="space-y-5">
      {/* Media kiezen, foto, video of geluid */}
      <div>
        {voorbeeld ? (
          soort === "video" ? (
            <video
              src={voorbeeld}
              controls
              className="w-full rounded-2xl bg-black max-h-80"
            />
          ) : soort === "audio" ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-oppervlak border border-rand py-8">
              <span className="text-4xl">🎙️</span>
              <audio src={voorbeeld} controls className="w-full max-w-xs" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={voorbeeld}
              alt="Voorbeeld"
              className="w-full rounded-2xl object-cover max-h-80"
            />
          )
        ) : (
          <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-rand bg-oppervlak py-14 cursor-pointer hover:bg-klei/40 transition">
            <span className="text-4xl mb-2">📷🎬🎙️</span>
            <span className="text-inkt font-medium">Kies foto, video of geluid</span>
            <span className="text-xs text-inkt-zacht mt-1">Tot 200MB</span>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={kiesBestand}
              className="hidden"
            />
          </label>
        )}
        {voorbeeld && (
          <label className="mt-2 block text-center text-sm text-terracotta cursor-pointer">
            Iets anders kiezen
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={kiesBestand}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Taggen */}
      <div>
        <p className="text-sm text-inkt-zacht mb-2">Wie staat erop?</p>
        {getagd.size > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[...getagd].map((id) => {
              const l = familie.find((f) => f.id === id)
              return (
                <button
                  key={id}
                  onClick={() => toggleTag(id)}
                  className="rounded-full bg-terracotta text-white text-xs px-3 py-1"
                >
                  {l?.naam} ✕
                </button>
              )
            })}
          </div>
        )}
        <input
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek familielid…"
          className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base text-sm outline-none focus:border-terracotta mb-2"
        />
        <div className="flex flex-wrap gap-1.5">
          {zichtbaar
            .filter((l) => !getagd.has(l.id))
            .map((l) => (
              <button
                key={l.id}
                onClick={() => toggleTag(l.id)}
                className="rounded-full border border-rand text-inkt text-xs px-3 py-1 hover:bg-klei/40 transition"
              >
                {l.naam}
              </button>
            ))}
        </div>
      </div>

      {/* Optioneel */}
      <input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder="Titel (optioneel)"
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta"
      />
      <textarea
        value={verhaal}
        onChange={(e) => setVerhaal(e.target.value)}
        placeholder="Het verhaal erbij (optioneel)"
        rows={2}
        className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base outline-none focus:border-terracotta resize-none"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-inkt-zacht mb-1">Wanneer?</label>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base text-sm outline-none focus:border-terracotta"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-inkt-zacht mb-1">Waar?</label>
          <input
            value={locatie}
            onChange={(e) => setLocatie(e.target.value)}
            placeholder="Locatie"
            className="w-full rounded-2xl border-2 border-rand bg-white px-4 py-3 text-inkt text-base text-sm outline-none focus:border-terracotta"
          />
        </div>
      </div>

      {fout && <p className="text-terracotta font-semibold">{fout}</p>}

      <button
        onClick={delen}
        disabled={bezig || !bestand}
        className="fk-btn fk-btn-primary fk-btn-full"
      >
        {bezig ? "Bezig…" : "💛 Deel met de familie"}
      </button>
    </div>
  )
}
