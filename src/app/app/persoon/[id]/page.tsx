import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { tekenFotoUrls } from "@/lib/album/urls"
import { KindBeheer } from "./KindBeheer"
import { OverlijdenKnop } from "./OverlijdenKnop"
import { NaamAanpassen } from "./NaamAanpassen"
import { OuderKoppelen } from "./OuderKoppelen"
import { ProfielFoto } from "./ProfielFoto"

function leeftijd(bornOn: string | null): number | null {
  if (!bornOn) return null
  const d = new Date(bornOn)
  const nu = new Date()
  let jr = nu.getFullYear() - d.getFullYear()
  const m = nu.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && nu.getDate() < d.getDate())) jr--
  return jr
}

function euro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function jaar(iso: string | null) {
  if (!iso) return null
  return new Date(iso).getFullYear()
}

function initialen(voor: string, achter: string) {
  return (voor[0] ?? "") + (achter[0] ?? "")
}

export default async function PersoonPagina({
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

  const { data: p } = await supabase
    .from("persons")
    .select(
      "id, first_name, last_name, city, country, photo_url, claimed_by, managed_by, born_on, died_on, network_id",
    )
    .eq("id", id)
    .single()

  if (!p) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-inkt-zacht">Dit familielid is niet gevonden.</p>
      </main>
    )
  }

  const ikZelf = id === meId

  // Mag de kijker dit profiel als kind beheren? De Family Keeper, of degene die
  // het al beheert. Alleen voor niet-geclaimde profielen (geen eigen account).
  const { data: isKeeper } = await supabase.rpc("has_role", {
    net: p.network_id,
    r: "co_founder",
  })
  const kanBeheren =
    !ikZelf && !p.claimed_by && (!!isKeeper || p.managed_by === meId)
  const isKind = p.managed_by != null && (leeftijd(p.born_on) ?? 0) < 16
  // Overlijden vastleggen mag de Family Keeper of beheerder, voor elk familielid
  // behalve jezelf.
  const kanMarkeren = !ikZelf && (!!isKeeper || p.managed_by === meId)
  // Relaties beheren (bijv. een bestaande ouder koppelen) mag de Family Keeper,
  // de beheerder, of je op je eigen profiel.
  const kanRelatieBeheren = !!isKeeper || p.managed_by === meId || ikZelf

  // Kandidaat-ouders: familieleden die nog geen ouder van deze persoon zijn.
  let ouderKandidaten: { id: string; naam: string }[] = []
  if (kanRelatieBeheren) {
    const [{ data: netleden }, { data: ouderRels }] = await Promise.all([
      supabase
        .from("persons")
        .select("id, first_name, last_name")
        .eq("network_id", p.network_id)
        .neq("id", p.id),
      supabase
        .from("relationships")
        .select("from_person")
        .eq("kind", "parent")
        .eq("to_person", p.id),
    ])
    const ouderSet = new Set((ouderRels ?? []).map((r) => r.from_person))
    ouderKandidaten = (netleden ?? [])
      .filter((m) => !ouderSet.has(m.id))
      .map((m) => ({ id: m.id, naam: `${m.first_name} ${m.last_name}` }))
  }

  // Relatie t.o.v. mij + leesbare route.
  const [{ data: label }, { data: route }, { data: dromen }] = await Promise.all([
    ikZelf ? { data: "jij" } : supabase.rpc("relation_label", { me: meId, other: id }),
    ikZelf ? { data: null } : supabase.rpc("relation_route", { me: meId, other: id }),
    supabase.rpc("family_dreams"),
  ])

  const droom = (dromen ?? []).find((d) => d.person_id === id)

  // Herinneringen met deze persoon (album, chronologisch, oudste eerst).
  const { data: tags } = await supabase
    .from("album_tags")
    .select("album_item_id")
    .eq("person_id", id)
  const itemIds = (tags ?? []).map((t) => t.album_item_id)
  const { data: items } = itemIds.length
    ? await supabase
        .from("album_items")
        .select("id, file_url, title, date_of_memory, created_at")
        .in("id", itemIds)
    : { data: [] }
  const gesorteerd = (items ?? []).sort((a, b) => {
    const da = a.date_of_memory ?? a.created_at
    const db = b.date_of_memory ?? b.created_at
    return da < db ? -1 : da > db ? 1 : 0
  })
  const urls = await tekenFotoUrls(
    supabase,
    gesorteerd.map((i) => i.file_url),
  )

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar je familie
      </Link>

      {/* Kop met foto + relatie */}
      <header className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-2xl font-black shrink-0 overflow-hidden"
          style={{ background: "var(--terracotta)" }}
        >
          {p.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            initialen(p.first_name, p.last_name)
          )}
        </div>
        <div>
          <h1 className="text-2xl font-black text-inkt">
            {p.first_name} {p.last_name}
          </h1>
          <p className="text-inkt-zacht font-semibold">
            {ikZelf ? "Jij" : label}
            {p.city ? ` · ${p.city}` : ""}
          </p>
        </div>
      </header>

      {/* Profielfoto zetten/wijzigen. */}
      {kanRelatieBeheren && (
        <ProfielFoto
          personId={p.id}
          networkId={p.network_id}
          voornaam={p.first_name}
          heeftFoto={!!p.photo_url}
        />
      )}

      {/* De leesbare route, hoe jullie verbonden zijn */}
      {!ikZelf && route && (
        <p className="fk-card text-inkt">{route}</p>
      )}

      {/* Naam invullen/aanpassen, bijv. voor een nog "Onbekende" gedeelde ouder. */}
      {kanBeheren && (
        <NaamAanpassen
          personId={p.id}
          voornaam={p.first_name}
          achternaam={p.last_name}
          onbekend={p.first_name === "Onbekende"}
        />
      )}

      {/* Kind-beheer: markeer als kind onder 16 (of haal weg). */}
      {kanBeheren && (
        <KindBeheer
          personId={p.id}
          voornaam={p.first_name}
          bornOn={p.born_on}
          isKind={isKind}
        />
      )}

      {/* Bestaande ouder koppelen (bijv. opvoedvader). */}
      {kanRelatieBeheren && ouderKandidaten.length > 0 && (
        <OuderKoppelen
          kindId={p.id}
          voornaam={p.first_name}
          kandidaten={ouderKandidaten}
        />
      )}

      {/* Overlijden vastleggen. */}
      {kanMarkeren && (
        <OverlijdenKnop
          personId={p.id}
          voornaam={p.first_name}
          diedOn={p.died_on}
        />
      )}

      {/* Hun droom */}
      {droom && (
        <section className="fk-card">
          <p className="text-xs font-black text-goud uppercase tracking-wide mb-1">
            ✨ Droom
          </p>
          <p className="font-black text-inkt text-lg">{droom.title}</p>
          <div className="fk-progress mt-3">
            <span
              style={{
                width: `${Math.min(100, Math.round((Number(droom.raised_cents) / droom.target_cents) * 100))}%`,
              }}
            />
          </div>
          <p className="text-sm text-inkt-zacht mt-2 font-semibold">
            {euro(Number(droom.raised_cents))} van {euro(droom.target_cents)}
            {droom.collection_id && (
              <>
                {" · "}
                <Link href={`/app/collecte/${droom.collection_id}`} className="text-terracotta">
                  draag bij →
                </Link>
              </>
            )}
          </p>
        </section>
      )}

      {/* Herinneringen met deze persoon */}
      <section>
        <h2 className="text-lg font-black text-inkt mb-3">
          {ikZelf ? "Herinneringen met jou" : `Herinneringen met ${p.first_name}`}
        </h2>
        {gesorteerd.length === 0 ? (
          <p className="text-inkt-zacht">
            Nog geen herinneringen. Tag {ikZelf ? "jezelf" : p.first_name} op een foto in het
            album.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {gesorteerd.map((item) => (
              <Link
                key={item.id}
                href={`/app/album/${item.id}`}
                className="aspect-square rounded-lg overflow-hidden bg-klei block relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urls.get(item.file_url) ?? ""}
                  alt={item.title ?? "Herinnering"}
                  className="w-full h-full object-cover"
                />
                {jaar(item.date_of_memory) && (
                  <span className="absolute bottom-0 left-0 right-0 bg-inkt/60 text-white text-[10px] text-center py-0.5">
                    {jaar(item.date_of_memory)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 text-center text-xs text-inkt-zacht italic">
        De familiekaart en het album versterken elkaar.
      </p>
    </main>
  )
}
