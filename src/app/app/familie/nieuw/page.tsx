import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BouwKantForm } from "./BouwKantForm"

export default async function BouwKantPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  const { data: mij } = await supabase
    .from("persons")
    .select("first_name, last_name")
    .eq("id", meId)
    .single()

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug
      </Link>

      <header className="mt-3 mb-6">
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          NIEUWE FAMILIE
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1 leading-tight">
          Bouw jouw eigen kant 🌳
        </h1>
        <p className="text-inkt-zacht mt-2">
          Elke familie is een eigen wereld. Open je vader- of moederskant, nodig
          je mensen uit en word hun keeper — met een eigen stamboom, chat en
          collecte.
        </p>
      </header>

      <BouwKantForm
        voornaam={mij?.first_name ?? ""}
        achternaam={mij?.last_name ?? ""}
      />
    </main>
  )
}
