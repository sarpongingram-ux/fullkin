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
    <main className="min-h-screen max-w-md mx-auto px-5 py-10">
      <Link href="/app" className="text-sm text-inkt-zacht hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header className="mt-4 mb-6">
        <p className="text-terracotta font-semibold tracking-[0.25em] text-xs">
          UITBETALING
        </p>
        <h1 className="text-2xl font-bold text-inkt mt-1">
          Ontvang geld, {mij?.first_name}
        </h1>
        <p className="text-inkt-zacht mt-2">
          Koppel één keer je uitbetaling. Dan komt geld dat je familie voor jou
          ophaalt direct bij jou terecht — niet bij Fullkin.
        </p>
      </header>

      {isReady ? (
        <section className="bg-groen/10 border border-groen/40 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-2">✓</p>
          <p className="font-semibold text-groen">Je uitbetaling is gekoppeld</p>
          <p className="text-sm text-inkt-zacht mt-1">
            Collectes en dromen worden nu direct aan jou uitbetaald
            {acc?.country ? ` (${acc.country})` : ""}.
          </p>
        </section>
      ) : (
        <section className="bg-oppervlak rounded-2xl border border-rand p-6">
          {acc?.status === "onboarding" && (
            <p className="text-sm text-goud mb-3">
              Je koppeling is begonnen maar nog niet af. Maak 'm af om geld te
              kunnen ontvangen.
            </p>
          )}
          <Onboarding nieuw={!acc} />
        </section>
      )}

      <div className="mt-6 rounded-xl bg-klei/40 border border-rand p-4">
        <p className="text-sm text-inkt">
          <strong>Waar gaat mijn geld heen?</strong>
        </p>
        <p className="text-sm text-inkt-zacht mt-1">
          Van elke bijdrage gaat 95% direct naar de ontvanger en 5% naar Fullkin
          (co-founder, rollen, de Familie Pot en het platform). Fullkin houdt
          jouw geld nooit vast.
        </p>
      </div>
    </main>
  )
}
