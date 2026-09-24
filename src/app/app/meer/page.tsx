import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

const OPRICHTER =
  process.env.FULLKIN_FOUNDER_EMAIL ?? "sarpongingram@gmail.com"

// "Meer": alles wat de kern (familie ontdekken & verbinden) ondersteunt maar niet
// de voordeur is — album, de familie-economie en beheer. Zo blijft de hoofd-
// navigatie gericht op Discover → Connect → Belong.
const GROEPEN: { titel: string; items: { href: string; emoji: string; naam: string; onder: string }[] }[] = [
  {
    titel: "Samen delen & vieren",
    items: [
      { href: "/app/album", emoji: "📷", naam: "Album", onder: "Foto's en herinneringen" },
      { href: "/app/mijlpalen", emoji: "🎈", naam: "Mijlpalen", onder: "De levenslijn van de familie" },
      { href: "/app/familie/stamboom", emoji: "🌳", naam: "Stamboom", onder: "De hele familie in beeld" },
      { href: "/app/stem", emoji: "🕊️", naam: "De Stem", onder: "Samen kiezen wie je steunt" },
      { href: "/app/rad", emoji: "🎡", naam: "Het Rad", onder: "Het maandelijkse familiemoment" },
    ],
  },
  {
    titel: "Familie-economie",
    items: [
      { href: "/app/wallet", emoji: "💰", naam: "Wallet & Familiepot", onder: "Bijdragen en saldo" },
      { href: "/app/dashboard", emoji: "👑", naam: "Family Keeper", onder: "Cijfers, rollen en verdienste" },
      { href: "/app/uitbetaling", emoji: "🏦", naam: "Uitbetaling", onder: "Koppel je rekening" },
    ],
  },
  {
    titel: "Overig",
    items: [
      { href: "/app/meldingen", emoji: "🔔", naam: "Meldingen", onder: "Wat er speelt" },
    ],
  },
]

export default async function MeerPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOprichter =
    (user?.email ?? "").toLowerCase() === OPRICHTER.toLowerCase()

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-8">
      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          MEER
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">Alles van je familie</h1>
      </header>

      {GROEPEN.map((g) => (
        <section key={g.titel} className="space-y-3">
          <h2 className="text-lg font-black text-inkt">{g.titel}</h2>
          <div className="space-y-2">
            {g.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className="fk-card flex items-center gap-4 hover:bg-zand transition"
              >
                <span className="text-2xl shrink-0">{it.emoji}</span>
                <div className="min-w-0">
                  <p className="font-bold text-inkt">{it.naam}</p>
                  <p className="text-sm text-inkt-zacht">{it.onder}</p>
                </div>
                <span className="ml-auto text-inkt-zacht">›</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {isOprichter && (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-inkt">Oprichter</h2>
          <Link
            href="/app/meer/cijfers"
            className="fk-card flex items-center gap-4 hover:bg-zand transition"
          >
            <span className="text-2xl shrink-0">📊</span>
            <div className="min-w-0">
              <p className="font-bold text-inkt">Groei-cijfers</p>
              <p className="text-sm text-inkt-zacht">De North Star-funnel (privé)</p>
            </div>
            <span className="ml-auto text-inkt-zacht">›</span>
          </Link>
        </section>
      )}
    </main>
  )
}
