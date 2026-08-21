"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Onboarding } from "./onboarding/Onboarding"

export default function Home() {
  const router = useRouter()
  const [toon, setToon] = useState(false)

  useEffect(() => {
    let actief = true
    ;(async () => {
      // Al ingelogd? Direct de app in.
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!actief) return
      if (user) {
        router.replace("/app")
        return
      }
      // Onboarding al gezien? Direct naar inloggen. Anders: laat 'm zien.
      let gezien = false
      try {
        gezien = localStorage.getItem("fk_onboarding_gezien") === "1"
      } catch {}
      if (gezien) router.replace("/inloggen")
      else setToon(true)
    })()
    return () => {
      actief = false
    }
  }, [router])

  if (!toon) return null
  return <Onboarding />
}
