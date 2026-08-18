import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Stamboom } from "./Stamboom"

export default async function StamboomPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  const [{ data: personen }, { data: relaties }] = await Promise.all([
    supabase
      .from("persons")
      .select("id, first_name, last_name, photo_url, born_on, died_on"),
    supabase.from("relationships").select("kind, from_person, to_person"),
  ])

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <Link
        href="/app/familie"
        className="text-inkt-zacht font-bold hover:text-inkt"
      >
        ← Terug naar familie
      </Link>
      <header className="mt-3 mb-5">
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          STAMBOOM
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">Jullie stamboom 🌳</h1>
        <p className="text-inkt-zacht mt-1">
          Van generatie op generatie. Tik op iemand om meer te zien.
        </p>
      </header>

      <Stamboom
        personen={personen ?? []}
        relaties={relaties ?? []}
        meId={meId}
      />
    </main>
  )
}
