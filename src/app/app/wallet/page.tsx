import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MijnDroom } from "../MijnDroom"

function euro(cents: number, decimals = 2) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(cents / 100)
}

export default async function WalletPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  const [{ data: pot }, { data: dromen }, { data: collectesRaw }] =
    await Promise.all([
      supabase.rpc("my_pot_summary").single(),
      supabase.rpc("family_dreams"),
      supabase
        .from("collections")
        .select("id, title, beneficiary_id")
        .eq("status", "open")
        .order("created_at", { ascending: false }),
    ])

  const mijnDroom = (dromen ?? []).find((d) => d.person_id === meId) ?? null
  const opgehaald = mijnDroom ? Number(mijnDroom.raised_cents) : 0
  const potSaldo = pot?.saldo_cents ?? 0

  // Namen bij de collectes van anderen.
  const anderCollectes = (collectesRaw ?? []).filter(
    (c) => c.beneficiary_id !== meId,
  )
  const ids = anderCollectes.map((c) => c.beneficiary_id)
  const { data: personen } = ids.length
    ? await supabase.from("persons").select("id, first_name").in("id", ids)
    : { data: [] }
  const naamVan = new Map((personen ?? []).map((p) => [p.id, p.first_name]))

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-8">
      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          WALLET
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">Jouw geld 💰</h1>
      </header>

      {/* Groot centraal bedrag — Cash App-stijl */}
      <section className="fk-card-dark text-center fk-pop">
        <p className="text-sm font-bold opacity-70">Voor jou opgehaald</p>
        <p className="fk-amount mt-2">{euro(opgehaald)}</p>
        <p className="text-sm opacity-70 mt-2">
          {mijnDroom
            ? `Voor "${mijnDroom.title}"`
            : "Stel je droom in en de familie helpt mee"}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link
            href="/app/uitbetaling"
            className="fk-btn fk-btn-full"
            style={{ background: "#ffffff", color: "var(--terracotta)" }}
          >
            Uitbetalen
          </Link>
          <a href="#droom" className="fk-btn fk-btn-gold fk-btn-full">
            Sparen voor droom
          </a>
        </div>
      </section>

      {/* Droomvoortgang — Duolingo-stijl */}
      <section id="droom">
        <MijnDroom
          huidigeTitel={mijnDroom?.title ?? null}
          huidigStreefCents={mijnDroom?.target_cents ?? null}
          opgehaaldCents={opgehaald}
        />
      </section>

      {/* De familiepot */}
      <Link href="/app/pot" className="fk-card block">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-inkt">De familiepot 🌍</p>
            <p className="text-inkt-zacht text-sm">
              Samen opgebouwd — voor wie het nodig heeft
            </p>
          </div>
          <p className="fk-stat-num text-goud">{euro(potSaldo, 0)}</p>
        </div>
      </Link>

      {/* Dromen van de familie om aan bij te dragen */}
      {anderCollectes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-inkt">Help de familie</h2>
          {anderCollectes.map((c) => (
            <Link
              key={c.id}
              href={`/app/collecte/${c.id}`}
              className="fk-card flex items-center gap-4"
            >
              <span className="text-3xl">❤️</span>
              <div className="min-w-0">
                <p className="font-bold text-inkt truncate">{c.title}</p>
                <p className="text-inkt-zacht">
                  Voor {naamVan.get(c.beneficiary_id) ?? "familie"} — draag bij
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}
