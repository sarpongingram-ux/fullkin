import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StartFamilie } from "./StartFamilie"

export default async function StartPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  // Heb je al een familie? Dan hoef je er geen te starten.
  const { data: meId } = await supabase.rpc("me")
  if (meId) redirect("/app")

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-terracotta font-semibold tracking-[0.3em] text-xs">
            FULLKIN
          </p>
          <h1 className="text-2xl font-bold text-inkt mt-2">Start je familie</h1>
          <p className="text-sm text-inkt-zacht mt-2 leading-relaxed">
            Je maakt de familie aan en bent meteen de eerste — de Family Keeper.
            Daarna nodig je de rest uit.
          </p>
        </div>
        <StartFamilie />
      </div>
    </main>
  )
}
