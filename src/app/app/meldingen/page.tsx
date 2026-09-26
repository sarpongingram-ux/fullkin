import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Enums } from "@/lib/types/database"
import { MarkeerGelezen } from "./MarkeerGelezen"

function tijdGeleden(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "zojuist"
  if (min < 60) return `${min} min geleden`
  const uur = Math.floor(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  const dag = Math.floor(uur / 24)
  if (dag === 1) return "gisteren"
  return `${dag} dagen geleden`
}

const emojiVan: Record<Enums<"notification_kind">, string> = {
  album_reactie: "❤️",
  album_opmerking: "💬",
  album_tag: "📷",
  stem_nominatie: "🌟",
  stem_winst: "🕊️",
  mijlpaal: "🎈",
  uitnodiging_geaccepteerd: "🎉",
  ontdek_bericht: "💬",
}

function tekstVan(kind: Enums<"notification_kind">, actor: string): string {
  switch (kind) {
    case "album_reactie":
      return `${actor} reageerde op je herinnering`
    case "album_opmerking":
      return `${actor} plaatste een opmerking bij je herinnering`
    case "album_tag":
      return `${actor} zette je op een foto`
    case "stem_nominatie":
      return `${actor} nomineerde je bij De Stem`
    case "stem_winst":
      return "De familie koos jou bij De Stem"
    case "mijlpaal":
      return `${actor} zette een mijlpaal voor jou op de levenslijn`
    case "uitnodiging_geaccepteerd":
      return `${actor} heeft je uitnodiging geaccepteerd en is erbij! 🎉`
    case "ontdek_bericht":
      return `${actor} stuurde je een bericht`
  }
}

function linkVan(subjectType: string | null, subjectId: string | null): string {
  if (subjectType === "album_item" && subjectId) return `/app/album/${subjectId}`
  if (subjectType === "stem_round") return "/app/stem"
  if (subjectType === "mijlpaal") return "/app/mijlpalen"
  if (subjectType === "persoon" && subjectId) return `/app/persoon/${subjectId}`
  if (subjectType === "ontdek" && subjectId) return `/app/ontdek/${subjectId}`
  return "/app"
}

export default async function MeldingenPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/app")

  const { data: meldingen } = await supabase
    .from("notifications")
    .select("id, kind, actor_person_id, subject_type, subject_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  const actorIds = [
    ...new Set((meldingen ?? []).map((m) => m.actor_person_id).filter(Boolean)),
  ] as string[]
  const { data: actoren } = actorIds.length
    ? await supabase
        .from("persons")
        .select("id, first_name, last_name")
        .in("id", actorIds)
    : { data: [] }
  const naamVan = new Map(
    (actoren ?? []).map((a) => [a.id, `${a.first_name} ${a.last_name}`]),
  )

  const lijst = meldingen ?? []
  const ongelezen = lijst.filter((m) => !m.read_at).length

  return (
    <main className="max-w-md mx-auto px-5 py-8 space-y-6">
      <MarkeerGelezen ongelezen={ongelezen} />

      <Link href="/app" className="text-inkt-zacht font-bold hover:text-inkt">
        ← Terug naar je familie
      </Link>

      <header>
        <p className="text-terracotta font-extrabold tracking-[0.2em] text-xs">
          MELDINGEN
        </p>
        <h1 className="text-3xl font-black text-inkt mt-1">Wat er speelt 🔔</h1>
      </header>

      {lijst.length === 0 ? (
        <div className="fk-card text-center py-12">
          <p className="text-5xl mb-3">🔔</p>
          <p className="font-black text-inkt text-lg">Nog geen meldingen</p>
          <p className="text-inkt-zacht mt-1">
            Zodra de familie iets deelt of op jou reageert, zie je het hier.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lijst.map((m) => {
            const actor = m.actor_person_id
              ? naamVan.get(m.actor_person_id) ?? "Een familielid"
              : "De familie"
            return (
              <li key={m.id}>
                <Link
                  href={linkVan(m.subject_type, m.subject_id)}
                  className={`flex items-start gap-4 fk-card transition ${
                    m.read_at ? "" : "ring-2 ring-terracotta"
                  }`}
                >
                  <span className="text-2xl shrink-0">{emojiVan[m.kind]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-inkt leading-snug font-semibold">
                      {tekstVan(m.kind, actor)}
                    </p>
                    <p className="text-sm text-inkt-zacht mt-0.5">
                      {tijdGeleden(m.created_at)}
                    </p>
                  </div>
                  {!m.read_at && (
                    <span className="mt-1 w-2.5 h-2.5 rounded-full bg-terracotta shrink-0" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
