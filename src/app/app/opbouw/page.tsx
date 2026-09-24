import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Opbouw } from "./Opbouw"

// Snelle onboarding direct na het starten van een familie: voeg je ouders,
// kinderen en broers/zussen toe en zie de familie groeien. Fullkin berekent
// de rest van de relaties zelf.
export default async function OpbouwPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  return <Opbouw />
}
