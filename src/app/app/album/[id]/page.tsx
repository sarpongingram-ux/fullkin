import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { tekenFotoUrls } from "@/lib/album/urls"
import { Reacties, Opmerken } from "./Interactie"
import type { Enums } from "@/lib/types/database"

function datum(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default async function HerinneringPagina({
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

  const { data: item } = await supabase
    .from("album_items")
    .select("id, file_url, title, memory_text, date_of_memory, location, uploaded_by")
    .eq("id", id)
    .single()

  if (!item) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-inkt-zacht">Deze herinnering bestaat niet.</p>
      </main>
    )
  }

  const [{ data: tags }, { data: counts }, { data: mijn }, { data: opmerkingen }] =
    await Promise.all([
      supabase.from("album_tags").select("person_id").eq("album_item_id", id),
      supabase.rpc("album_reaction_counts", { p_item: id }),
      supabase
        .from("album_reactions")
        .select("reaction")
        .eq("album_item_id", id)
        .eq("person_id", meId ?? "")
        .maybeSingle(),
      supabase
        .from("album_comments")
        .select("id, person_id, comment_text, created_at")
        .eq("album_item_id", id)
        .order("created_at", { ascending: true }),
    ])

  // Namen ophalen van getagde personen + van wie opmerkingen plaatsten.
  const persoonIds = [
    ...new Set([
      ...(tags ?? []).map((t) => t.person_id),
      ...(opmerkingen ?? []).map((c) => c.person_id),
    ]),
  ]
  const { data: personen } = persoonIds.length
    ? await supabase
        .from("persons")
        .select("id, first_name, last_name")
        .in("id", persoonIds)
    : { data: [] }
  const naamVan = new Map(
    (personen ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`]),
  )

  const urls = await tekenFotoUrls(supabase, [item.file_url])
  const fotoUrl = urls.get(item.file_url) ?? ""

  const tellingen: Record<string, number> = {}
  for (const c of counts ?? []) tellingen[c.reaction] = c.aantal

  return (
    <main className="min-h-screen max-w-lg mx-auto px-5 py-10">
      <Link href="/app/album" className="text-sm text-inkt-zacht hover:text-inkt">
        ← Terug naar het album
      </Link>

      {/* De foto, groot */}
      <div className="mt-4 rounded-2xl overflow-hidden bg-klei">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotoUrl}
          alt={item.title ?? "Herinnering"}
          className="w-full object-contain max-h-[70vh]"
        />
      </div>

      {item.title && (
        <h1 className="text-xl font-bold text-inkt mt-4">{item.title}</h1>
      )}

      {/* Wie staat erop */}
      {(tags ?? []).length > 0 && (
        <p className="text-sm text-inkt mt-2">
          <span className="text-inkt-zacht">Op de foto: </span>
          {(tags ?? []).map((t, i) => (
            <span key={t.person_id}>
              {i > 0 && ", "}
              <Link
                href={`/app/persoon/${t.person_id}`}
                className="text-terracotta font-medium hover:underline"
              >
                {naamVan.get(t.person_id) ?? "Familielid"}
              </Link>
            </span>
          ))}
        </p>
      )}

      {item.memory_text && (
        <p className="text-inkt mt-3 leading-relaxed whitespace-pre-line">
          {item.memory_text}
        </p>
      )}

      {(item.date_of_memory || item.location) && (
        <p className="text-sm text-inkt-zacht mt-2">
          {[datum(item.date_of_memory), item.location].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Reacties */}
      <div className="mt-5">
        <Reacties
          itemId={id}
          tellingen={tellingen}
          mijnReactie={(mijn?.reaction as Enums<"reaction_kind">) ?? null}
        />
      </div>

      {/* Opmerkingen */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-inkt-zacht uppercase tracking-wide mb-2">
          Opmerkingen
        </h2>
        <ul className="space-y-3">
          {(opmerkingen ?? []).map((c) => (
            <li key={c.id} className="text-sm">
              <span className="font-medium text-inkt">
                {naamVan.get(c.person_id) ?? "Familielid"}
              </span>{" "}
              <span className="text-inkt">{c.comment_text}</span>
            </li>
          ))}
          {(opmerkingen ?? []).length === 0 && (
            <li className="text-sm text-inkt-zacht">Nog geen opmerkingen.</li>
          )}
        </ul>
        <Opmerken itemId={id} />
      </section>

      <p className="mt-8 text-center text-xs text-inkt-zacht">
        Iedereen ziet de reacties, niemand ziet wie wat koos.
      </p>
    </main>
  )
}
