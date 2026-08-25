"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  maakAvatarUploadUrl,
  koppelProfielfoto,
  verwijderProfielfoto,
} from "./acties"

const AVATAR_MAX = 10 * 1024 * 1024

export function ProfielFoto({
  personId,
  voornaam,
  heeftFoto,
}: {
  personId: string
  voornaam: string
  heeftFoto: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [bezig, start] = useTransition()
  const [fout, setFout] = useState<string | null>(null)

  function kies(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    // laat dezelfde foto opnieuw kiezen mogelijk blijven
    e.target.value = ""
    if (!f) return
    setFout(null)
    if (!f.type.startsWith("image/")) {
      setFout("Dit is geen afbeelding.")
      return
    }
    if (f.size > AVATAR_MAX) {
      setFout("Deze foto is groter dan 10MB.")
      return
    }
    start(async () => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg"
      // 1) De server maakt een geautoriseerde upload-link.
      const link = await maakAvatarUploadUrl(personId, ext)
      if (!link.ok) {
        setFout(link.fout)
        return
      }
      // 2) De telefoon uploadt de foto rechtstreeks naar Storage.
      const supabase = createClient()
      const { error } = await supabase.storage
        .from("avatars")
        .uploadToSignedUrl(link.pad, link.token, f, {
          contentType: f.type || undefined,
          upsert: false,
        })
      if (error) {
        setFout("Uploaden mislukt: " + error.message)
        return
      }
      // 3) De foto aan de persoon koppelen.
      const res = await koppelProfielfoto(personId, link.pad)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      router.refresh()
    })
  }

  function verwijder() {
    setFout(null)
    start(async () => {
      const res = await verwijderProfielfoto(personId)
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
          ? "Bezig…"
          : heeftFoto
            ? "📷 Foto wijzigen"
            : `📷 Profielfoto voor ${voornaam}`}
      </button>
      {heeftFoto && !bezig && (
        <button
          onClick={verwijder}
          className="text-xs font-semibold text-inkt-zacht hover:text-terracotta transition"
        >
          Verwijderen
        </button>
      )}
      {fout && <p className="text-terracotta font-semibold text-sm mt-1">{fout}</p>}
    </div>
  )
}
