import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChatOverzicht, type RoomKaart } from "./ChatOverzicht"

export default async function ChatOverzichtPagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  const { data: mij } = await supabase
    .from("persons")
    .select("network_id, country")
    .eq("id", meId)
    .single()
  if (!mij) redirect("/app")

  // Zorg dat er voor elk woonland een takchat bestaat.
  await supabase.rpc("ensure_tak_chats")

  const [{ data: rooms }, { data: leden }] = await Promise.all([
    supabase
      .from("chat_rooms")
      .select("id, type, name, country, created_at")
      .eq("network_id", mij.network_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("chat_members")
      .select("room_id, last_read_at")
      .eq("person_id", meId),
  ])

  const lidVan = new Map(
    (leden ?? []).map((m) => [m.room_id, m.last_read_at as string | null]),
  )
  const roomIds = (rooms ?? []).map((r) => r.id)

  // Voor directe gesprekken: de naam van de ánder ophalen (room.name is leeg).
  const directIds = (rooms ?? []).filter((r) => r.type === "direct").map((r) => r.id)
  const directNaam = new Map<string, string>()
  if (directIds.length) {
    const { data: andereLeden } = await supabase
      .from("chat_members")
      .select("room_id, person_id")
      .in("room_id", directIds)
      .neq("person_id", meId)
    const anderIds = [...new Set((andereLeden ?? []).map((m) => m.person_id))]
    const { data: personen } = anderIds.length
      ? await supabase
          .from("persons")
          .select("id, first_name, last_name")
          .in("id", anderIds)
      : { data: [] }
    const naamVan = new Map(
      (personen ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`]),
    )
    for (const m of andereLeden ?? []) {
      directNaam.set(m.room_id, naamVan.get(m.person_id) ?? "Familielid")
    }
  }

  // Laatste bericht per ruimte (RLS geeft alleen ruimtes die je mag zien).
  const { data: berichten } = roomIds.length
    ? await supabase
        .from("chat_messages")
        .select("room_id, message_text, message_type, created_at")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false })
        .limit(300)
    : { data: [] }
  const laatste = new Map<
    string,
    { tekst: string | null; type: string; tijd: string }
  >()
  for (const b of berichten ?? []) {
    if (!laatste.has(b.room_id)) {
      laatste.set(b.room_id, {
        tekst: b.message_text,
        type: b.message_type,
        tijd: b.created_at,
      })
    }
  }

  const kaarten: RoomKaart[] = (rooms ?? []).map((r) => {
    const last = laatste.get(r.id) ?? null
    const gelezen = lidVan.get(r.id) ?? null
    const toegang =
      r.type === "familie" ||
      lidVan.has(r.id) ||
      (r.type === "tak" && !!r.country && r.country === mij.country)
    const ongelezen =
      !!last && !!gelezen && new Date(last.tijd) > new Date(gelezen)
    return {
      id: r.id,
      type: r.type,
      naam:
        r.type === "direct"
          ? directNaam.get(r.id) ?? "Familielid"
          : r.name ?? "Chat",
      laatsteTekst: last
        ? last.type === "collecte_link"
          ? "❤️ Collecte gedeeld"
          : last.type === "foto"
            ? "📷 Foto"
            : last.tekst
        : null,
      laatsteTijd: last?.tijd ?? null,
      toegang,
      ongelezen,
    }
  })

  return <ChatOverzicht kaarten={kaarten} />
}
