import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"
import Link from "next/link"

const OPRICHTER =
  process.env.FULLKIN_FOUNDER_EMAIL ?? "sarpongingram@gmail.com"

// Privé groei-dashboard voor de oprichter: de North Star-funnel voor de pilot.
// Server-side berekend via de service-client; alleen zichtbaar voor de oprichter.
export default async function CijfersPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  if ((user.email ?? "").toLowerCase() !== OPRICHTER.toLowerCase()) {
    return (
      <main className="max-w-md mx-auto px-5 py-8">
        <Link href="/app/meer" className="text-inkt-zacht font-bold">
          ← Terug
        </Link>
        <p className="text-inkt-zacht mt-6">
          Deze pagina is alleen voor de oprichter.
        </p>
      </main>
    )
  }

  const svc = createServiceClient()
  const H = { count: "exact" as const, head: true }
  const [
    families,
    personen,
    geclaimd,
    invites,
    geaccepteerd,
    koppelingen,
    begroetingen,
  ] = (
    await Promise.all([
      svc.from("family_networks").select("*", H),
      svc.from("persons").select("*", H),
      svc.from("persons").select("*", H).not("claimed_by", "is", null),
      svc.from("invites").select("*", H),
      svc.from("invites").select("*", H).eq("status", "geaccepteerd"),
      svc.from("person_links").select("*", H),
      svc.from("begroetingen").select("*", H),
    ])
  ).map((r) => r.count ?? 0)

  const acceptatie = invites > 0 ? Math.round((geaccepteerd / invites) * 100) : 0
  const gemPerFamilie = families > 0 ? (personen / families).toFixed(1) : "0"
  // North Star: verbonden familieleden per geactiveerde gebruiker.
  const noordster = geclaimd > 0 ? (personen / geclaimd).toFixed(1) : "0"

  const groepen: { titel: string; stats: { label: string; waarde: string }[] }[] = [
    {
      titel: "North Star",
      stats: [
        { label: "Verbonden familieleden per gebruiker", waarde: noordster },
      ],
    },
    {
      titel: "Netwerk",
      stats: [
        { label: "Families", waarde: String(families) },
        { label: "Familieleden (nodes)", waarde: String(personen) },
        { label: "Geactiveerde gebruikers", waarde: String(geclaimd) },
        { label: "Gem. leden per familie", waarde: gemPerFamilie },
      ],
    },
    {
      titel: "Groei-loop",
      stats: [
        { label: "Uitnodigingen verstuurd", waarde: String(invites) },
        { label: "Geaccepteerd", waarde: String(geaccepteerd) },
        { label: "Acceptatiegraad", waarde: `${acceptatie}%` },
      ],
    },
    {
      titel: "Ontdekking & verbinding",
      stats: [
        { label: "Bevestigde koppelingen", waarde: String(koppelingen) },
        { label: "Groeten verstuurd", waarde: String(begroetingen) },
      ],
    },
  ]

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      <Link href="/app/meer" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug
      </Link>
      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          PILOT · ALLEEN VOOR JOU
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">Groei-cijfers 📊</h1>
      </header>

      {groepen.map((g) => (
        <section key={g.titel} className="space-y-3">
          <h2 className="text-lg font-black text-inkt">{g.titel}</h2>
          <div className="grid grid-cols-2 gap-3">
            {g.stats.map((s) => (
              <div key={s.label} className="fk-card-white">
                <p className="fk-stat-num text-inkt">{s.waarde}</p>
                <p className="text-sm text-inkt-zacht mt-1 font-semibold leading-snug">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="text-center text-xs text-inkt-zacht leading-relaxed px-4">
        Cijfers over alle families samen. Volg vooral: acceptatiegraad,
        koppelingen en groeten — dat zijn de signalen dat de loop werkt.
      </p>
    </main>
  )
}
