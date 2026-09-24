import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

function initialen(voor: string, achter: string) {
  return (voor[0] ?? "") + (achter[0] ?? "")
}

// Mini-profiel van een ONTDEKT familielid uit een ander netwerk. Bewust beperkt:
// naam, foto en het verwantschapspad — geen geboortedatum/woonplaats/contact.
export default async function OntdektProfielPagina({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  const { data: profiel } = await supabase
    .rpc("ontdekt_profiel", { me: meId, p_id: id })
    .single()

  if (!profiel) {
    return (
      <main className="max-w-md mx-auto px-5 py-8">
        <Link href="/app/ontdek" className="text-inkt-zacht font-bold">
          ← Terug
        </Link>
        <p className="text-inkt-zacht mt-6">
          Dit familielid is (nog) niet zichtbaar voor jou.
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      <Link href="/app/ontdek" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar Ontdek
      </Link>

      <header className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-2xl font-black shrink-0 overflow-hidden"
          style={{ background: "var(--terracotta)" }}
        >
          {profiel.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profiel.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            initialen(profiel.voornaam, profiel.achternaam)
          )}
        </div>
        <div>
          <h1 className="text-2xl font-black text-inkt">
            {profiel.voornaam} {profiel.achternaam}
          </h1>
          <p className="text-inkt-zacht font-semibold">
            uit de familie {profiel.ander_familie}
          </p>
        </div>
      </header>

      <section className="fk-card border-2 border-terracotta/30 bg-terracotta/5">
        <p className="text-xs font-extrabold tracking-[0.18em] text-terracotta">
          HOE ZIJN JULLIE FAMILIE?
        </p>
        <p className="text-xl font-black text-inkt mt-1.5 leading-snug">
          {profiel.voornaam}
          {profiel.hun_kant === "kind"
            ? ` is het kind van je ${profiel.mijn_kant} ${profiel.brug_naam}`
            : ` — via je ${profiel.mijn_kant} ${profiel.brug_naam}`}
        </p>
        <p className="text-inkt-zacht mt-1.5 leading-relaxed">
          Jij → je {profiel.mijn_kant} {profiel.brug_naam} → {profiel.brug_naam}
          {"'s "}
          {profiel.hun_kant} {profiel.voornaam}
        </p>
      </section>

      <div className="fk-card text-center">
        <p className="text-sm text-inkt-zacht leading-relaxed">
          Uit privacy zie je alleen de naam en hoe jullie familie zijn.
          Geboortedatum en contactgegevens blijven privé tot {profiel.voornaam}{" "}
          zich aansluit en contact toestaat.
        </p>
      </div>
    </main>
  )
}
