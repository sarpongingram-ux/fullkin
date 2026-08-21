import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { NieuwGesprek } from "./NieuwGesprek"

export default async function NieuwGesprekPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  const { data: relaties } = await supabase.rpc("family_map", { me: meId })
  const familie = (relaties ?? []).map((r) => ({
    id: r.person_id as string,
    naam: `${r.first_name} ${r.last_name}`,
    relatie: (r.label as string) ?? "familielid",
  }))

  return (
    <main className="max-w-md mx-auto px-5 py-8">
      <Link href="/app/chat" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar chats
      </Link>
      <header className="mt-3 mb-5">
        <h1 className="text-2xl font-black text-inkt">Nieuw gesprek 👋</h1>
        <p className="text-inkt-zacht mt-1 text-sm">
          Zoek een familielid op naam of relatie en begin te praten.
        </p>
      </header>
      <NieuwGesprek familie={familie} />
    </main>
  )
}
