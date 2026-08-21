"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadProfielfoto, verwijderProfielfoto } from "./acties"

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
    if (!f) return
    setFout(null)
    const formData = new FormData()
    formData.set("personId", personId)
    formData.set("foto", f)
    start(async () => {
      const res = await uploadProfielfoto(formData)
      if (!res.ok) {
        setFout(res.fout)
        return
      }
      router.refresh()
    })
    // laat dezelfde foto opnieuw kiezen mogelijk blijven
    e.target.value = ""
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
