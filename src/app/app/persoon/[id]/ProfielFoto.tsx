"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { stelProfielfoto } from "./acties"

export function ProfielFoto({
  personId,
  networkId,
  voornaam,
  heeftFoto,
}: {
  personId: string
  networkId: string
  voornaam: string
  heeftFoto: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = useState(false)
  const [verwijderBezig, start] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  async function kies(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith("image/")) {
      setFout("Kies een afbeelding.")
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setFout("Deze foto is groter dan 10MB.")
      return
    }
    setFout(null)
    setBezig(true)

    const supabase = createClient()
    const ext = f.name.split(".").pop()?.toLowerCase() || "jpg"
    const pad = `${networkId}/${personId}-${crypto.randomUUID()}.${ext}`
    const { error: uploadFout } = await supabase.storage
      .from("avatars")
      .upload(pad, f, { cacheControl: "3600", upsert: true })
    if (uploadFout) {
      setFout("Uploaden mislukt: " + uploadFout.message)
      setBezig(false)
      return
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(pad)
    const res = await stelProfielfoto(personId, data.publicUrl)
    setBezig(false)
    if (!res.ok) {
      setFout(res.fout)
      return
    }
    router.refresh()
  }

  function verwijder() {
    setFout(null)
    start(async () => {
      const res = await stelProfielfoto(personId, null)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={kies}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={bezig}
        className="text-sm font-bold text-terracotta hover:text-inkt transition disabled:opacity-60"
      >
        {bezig
          ? "Uploaden…"
          : heeftFoto
            ? "📷 Foto wijzigen"
            : `📷 Profielfoto voor ${voornaam}`}
      </button>
      {heeftFoto && !bezig && (
        <button
          onClick={verwijder}
          disabled={verwijderBezig}
          className="text-xs font-semibold text-inkt-zacht hover:text-terracotta transition disabled:opacity-60"
        >
          {verwijderBezig ? "Bezig…" : "Verwijderen"}
        </button>
      )}
      {fout && <p className="text-terracotta font-semibold text-sm mt-1">{fout}</p>}
    </div>
  )
}
