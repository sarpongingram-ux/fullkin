import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Uploader } from "./Uploader"

export default async function NieuwePagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()
  if (!mij) redirect("/app")

  const { data: leden } = await supabase
    .from("persons")
    .select("id, first_name, last_name")
    .eq("network_id", mij.network_id)
    .order("first_name")

  const familie = (leden ?? []).map((l) => ({
    id: l.id,
    naam: `${l.first_name} ${l.last_name}`,
  }))

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <Link href="/app/album" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar het album
      </Link>

      <header className="mt-3 mb-6">
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          NIEUWE HERINNERING
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">Deel een moment 📷</h1>
      </header>

      <Uploader familie={familie} />
    </main>
  )
}
