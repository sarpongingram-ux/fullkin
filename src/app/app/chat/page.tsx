import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChatRoom, type Directory } from "./ChatRoom"
import type { ChatBericht } from "./acties"

export default async function ChatPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id")
    .eq("id", meId)
    .single()
  if (!mij) redirect("/app")

  // De familiechat van dit netwerk.
  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, name")
    .eq("network_id", mij.network_id)
    .eq("type", "familie")
    .single()

  if (!room) {
    return (
      <main className="max-w-md mx-auto px-5 py-8">
        <p className="text-inkt-zacht">De familiechat is nog niet klaar.</p>
      </main>
    )
  }

  // Laatste berichten (nieuwste 50), plus wie-is-wie voor foto's en relaties.
  const [{ data: recent }, { data: personen }, { data: relaties }, { count }] =
    await Promise.all([
      supabase
        .from("chat_messages")
        .select("id, sender_id, message_text, message_type, reference_id, created_at")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("persons")
        .select("id, first_name, photo_url")
        .eq("network_id", mij.network_id),
      supabase.rpc("family_map", { me: meId }),
      supabase
        .from("persons")
        .select("id", { count: "exact", head: true })
        .eq("network_id", mij.network_id),
    ])

  const relatieVan = new Map(
    (relaties ?? []).map((r) => [r.person_id, r.label as string]),
  )
  const directory: Directory = {}
  for (const p of personen ?? []) {
    directory[p.id] = {
      voornaam: p.first_name,
      photoUrl: p.photo_url,
      relatie: p.id === meId ? "jij" : relatieVan.get(p.id) ?? "familielid",
    }
  }

  const berichten = ((recent ?? []) as ChatBericht[]).slice().reverse()

  // Voor wie mag je een collecte starten: je directe familie.
  const collecteKandidaten = (relaties ?? [])
    .filter((r) =>
      ["ouder", "kind", "partner", "broer of zus"].includes(r.label as string),
    )
    .map((r) => ({
      id: r.person_id as string,
      naam: `${r.first_name} ${r.last_name}`,
      label: r.label as string,
    }))

  return (
    <ChatRoom
      roomId={room.id}
      meId={meId}
      groepsnaam={room.name ?? "Familiechat"}
      aantalLeden={count ?? (personen ?? []).length}
      directory={directory}
      initieel={berichten}
      collecteKandidaten={collecteKandidaten}
    />
  )
}
