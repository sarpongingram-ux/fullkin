import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChatRoom, type Directory } from "../ChatRoom"
import { DeelnemenKnop } from "./DeelnemenKnop"
import { tekenFotoUrls } from "@/lib/album/urls"
import type { ChatBericht } from "../acties"

export default async function ChatRuimtePagina({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
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

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, name, type, country")
    .eq("id", roomId)
    .single()
  if (!room) {
    return (
      <main className="max-w-md mx-auto px-5 py-8">
        <Link href="/app/chat" className="text-inkt-zacht font-bold">
          ← Terug
        </Link>
        <p className="text-inkt-zacht mt-4">Deze chat bestaat niet.</p>
      </main>
    )
  }

  // Mag ik hier berichten zien? Zo niet (een tak waar ik niet in zit): tonen we
  // een uitnodiging om deel te nemen in plaats van de berichten.
  const { data: toegang } = await supabase.rpc("kan_bij_room", { p_room: roomId })
  if (!toegang) {
    return (
      <main className="max-w-md mx-auto px-5 py-8">
        <Link href="/app/chat" className="text-inkt-zacht font-bold">
          ← Terug naar chats
        </Link>
        <div className="fk-card text-center mt-6 py-10">
          <p className="text-4xl mb-3">🌍</p>
          <p className="font-black text-inkt text-lg">{room.name}</p>
          <p className="text-inkt-zacht mt-1 mb-4">
            Je bent nog geen lid van deze tak. Doe mee om berichten te zien en te
            sturen.
          </p>
          <DeelnemenKnop roomId={roomId} />
        </div>
      </main>
    )
  }

  const [{ data: recent }, { data: personen }, { data: relaties }, { count }] =
    await Promise.all([
      supabase
        .from("chat_messages")
        .select("id, sender_id, message_text, message_type, reference_id, created_at")
        .eq("room_id", roomId)
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

  const collecteKandidaten = (relaties ?? [])
    .filter((r) =>
      ["ouder", "kind", "partner", "broer of zus"].includes(r.label as string),
    )
    .map((r) => ({
      id: r.person_id as string,
      naam: `${r.first_name} ${r.last_name}`,
      label: r.label as string,
    }))

  // Een moment kan over iedereen in de familie gaan (of over jou).
  const momentKandidaten = [
    { id: meId, naam: "Jij", label: "jij" },
    ...(relaties ?? []).map((r) => ({
      id: r.person_id as string,
      naam: `${r.first_name} ${r.last_name}`,
      label: r.label as string,
    })),
  ]

  const berichten = ((recent ?? []) as ChatBericht[]).slice().reverse()

  // Signeer de foto's in de zichtbare berichten (privé-bucket).
  const fotoPaden = berichten
    .filter((m) => m.message_type === "foto" && m.message_text)
    .map((m) => m.message_text as string)
  const getekend = fotoPaden.length
    ? await tekenFotoUrls(supabase, fotoPaden)
    : new Map<string, string>()
  const fotoUrls: Record<string, string> = {}
  for (const m of berichten) {
    if (m.message_type === "foto" && m.message_text) {
      const u = getekend.get(m.message_text)
      if (u) fotoUrls[m.id] = u
    }
  }

  // Bij een direct gesprek: naam + relatie van de ánder als kop.
  let groepsnaam = room.name ?? "Chat"
  let subtitel: string | undefined = undefined
  if (room.type === "direct") {
    const { data: ander } = await supabase
      .from("chat_members")
      .select("person_id")
      .eq("room_id", roomId)
      .neq("person_id", meId)
      .limit(1)
      .maybeSingle()
    const anderId = ander?.person_id
    if (anderId) {
      const info = directory[anderId]
      groepsnaam = info?.voornaam ?? "Familielid"
      subtitel = `jouw ${info?.relatie ?? "familielid"}`
    }
  }

  return (
    <ChatRoom
      roomId={room.id}
      meId={meId}
      groepsnaam={groepsnaam}
      aantalLeden={count ?? (personen ?? []).length}
      directory={directory}
      initieel={berichten}
      collecteKandidaten={collecteKandidaten}
      momentKandidaten={momentKandidaten}
      subtitel={subtitel}
      fotoUrls={fotoUrls}
    />
  )
}
