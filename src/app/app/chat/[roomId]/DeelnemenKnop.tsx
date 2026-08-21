"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { neemDeelAanTak } from "../acties"

export function DeelnemenKnop({ roomId }: { roomId: string }) {
  const router = useRouter()
  const [bezig, start] = useTransition()

  return (
    <button
      onClick={() =>
        start(async () => {
          const res = await neemDeelAanTak(roomId)
          if (res.ok) router.refresh()
        })
      }
      disabled={bezig}
      className="fk-btn fk-btn-primary fk-btn-full"
    >
      {bezig ? "Bezig…" : "🤝 Deelnemen aan deze tak"}
    </button>
  )
}
