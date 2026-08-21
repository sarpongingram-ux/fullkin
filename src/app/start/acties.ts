"use server"

import { createClient } from "@/lib/supabase/server"

export type StartResultaat = { ok: true } | { ok: false; fout: string }

export async function startFamilie(
  _v: StartResultaat | null,
  formData: FormData,
): Promise<StartResultaat> {
  const naam = String(formData.get("familienaam") ?? "").trim()
  const land = String(formData.get("land") ?? "").trim() || null
  const voornaam = String(formData.get("voornaam") ?? "").trim()
  const achternaam = String(formData.get("achternaam") ?? "").trim()
  const stad = String(formData.get("stad") ?? "").trim() || null

  if (!naam || !voornaam || !achternaam) {
    return { ok: false, fout: "Vul de familienaam en je eigen naam in." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, fout: "Je bent niet ingelogd." }

  const { error } = await supabase.rpc("start_familie", {
    p_naam: naam,
    p_land: land ?? "",
    p_voornaam: voornaam,
    p_achternaam: achternaam,
    p_stad: stad ?? "",
  })
  if (error) return { ok: false, fout: error.message }

  return { ok: true }
}
