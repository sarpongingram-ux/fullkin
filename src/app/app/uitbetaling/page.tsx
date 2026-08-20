import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Onboarding } from "./Onboarding"
import { ververUitbetaalStatus } from "./acties"

export default async function UitbetalingPagina({
  searchParams,
}: {
  searchParams: Promise<{ klaar?: string; herstart?: string }>
}) {
  const { klaar } = await searchParams

  // Terug van Stripe-onboarding? Ververs de status.
  if (klaar) {
    await ververUitbetaalStatus()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  const { data: mij } = await supabase
    .from("persons")
    .select("first_name")
    .eq("id", meId)
    .single()

  const { data: acc } = await supabase
    .from("payout_accounts")
    .select("provider, status, country")
    .eq("person_id", meId)
    .maybeSingle()

  const isReady = acc?.status === "ready"

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          UITBETALING
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">
          Ontvang geld, {mij?.first_name} 💸
        </h1>
        <p className="text-inkt-zacht mt-2">
          Koppel één keer je uitbetaling. Dan komt geld dat je familie voor jou
          ophaalt direct bij jou terecht — niet bij Fullkin.
        </p>
      </header>

      {isReady ? (
        <section className="fk-card text-center" style={{ background: "rgba(21,128,61,0.08)" }}>
          <p className="text-5xl mb-2">✅</p>
          <p className="font-black text-groen text-lg">Je uitbetaling is gekoppeld</p>
          <p className="text-inkt-zacht mt-1">
            Collectes en dromen worden nu direct aan jou uitbetaald
            {acc?.country ? ` (${acc.country})` : ""}.
          </p>
        </section>
      ) : (
        <section className="fk-card">
          {acc?.status === "onboarding" && (
            <p className="text-goud font-semibold mb-3">
              Je koppeling is begonnen maar nog niet af. Maak 'm af om geld te
              kunnen ontvangen.
            </p>
          )}
          <Onboarding nieuw={!acc} />
        </section>
      )}

      <div className="fk-card">
        <p className="font-black text-inkt">Waar gaat mijn geld heen? 🤔</p>
        <p className="text-inkt-zacht mt-1">
          Van elke bijdrage gaat 95% direct naar de ontvanger en 5% naar Fullkin
          (Family Keeper, rollen, de Familie Pot en het platform). Fullkin houdt
          jouw geld nooit vast.
        </p>
      </div>
    </main>
  )
}
