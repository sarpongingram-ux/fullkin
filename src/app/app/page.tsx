import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FamilieKaart } from "./FamilieKaart"

export default async function AppHome() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  // Wie ben ik als persoon op de kaart? Nog geen familie? Dan naar de voordeur:
  // een nieuwe familie starten (uitgenodigden komen binnen via /welkom).
  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  const [{ data: stats }, { data: kaart }, { data: mij }] = await Promise.all([
    supabase.rpc("family_stats", { me: meId }).single(),
    supabase.rpc("family_map", { me: meId }),
    supabase
      .from("persons")
      .select("first_name, network_id")
      .eq("id", meId)
      .single(),
  ])

  const { data: netwerk } = mij
    ? await supabase
        .from("family_networks")
        .select("name")
        .eq("id", mij.network_id)
        .single()
    : { data: null }

  // Ben ik Co-Founder? Dan toon ik de dashboard-link.
  const { data: isCoFounder } = mij
    ? await supabase.rpc("has_role", { net: mij.network_id, r: "co_founder" })
    : { data: false }

  // Ongelezen meldingen voor de badge in de header.
  const { count: ongelezen } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)

  // Eerstvolgende verjaardag als warme nudge op de kaart.
  const { data: verjaardagen } = await supabase.rpc("komende_verjaardagen")
  const komendeVerjaardag = (verjaardagen ?? [])[0] ?? null

  // Lopende collectes, met de naam van de begunstigde (apart opgehaald).
  const { data: collectes } = await supabase
    .from("collections")
    .select("id, title, beneficiary_id")
    .eq("status", "open")
    .order("created_at", { ascending: false })

  const beneficiaryIds = (collectes ?? []).map((c) => c.beneficiary_id)
  const { data: begunstigden } = beneficiaryIds.length
    ? await supabase
        .from("persons")
        .select("id, first_name")
        .in("id", beneficiaryIds)
    : { data: [] }
  const naamVan = new Map(
    (begunstigden ?? []).map((p) => [p.id, p.first_name]),
  )

  const lopende = (collectes ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    voornaam: naamVan.get(c.beneficiary_id) ?? "",
  }))

  // Business Dromen in de familie (in stemming of goedgekeurd).
  const { data: businessRaw } = await supabase
    .from("business_dreams")
    .select("id, name, person_id, status")
    .in("status", ["stemming", "goedgekeurd"])
    .order("created_at", { ascending: false })
  const bIds = [...new Set((businessRaw ?? []).map((b) => b.person_id))]
  const { data: bOndernemers } = bIds.length
    ? await supabase.from("persons").select("id, first_name").in("id", bIds)
    : { data: [] }
  const bNaam = new Map((bOndernemers ?? []).map((p) => [p.id, p.first_name]))
  const businessDromen = (businessRaw ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    voornaam: bNaam.get(b.person_id) ?? "",
    status: b.status,
  }))

  // Actieve dromen in de familie, met voortgang.
  const { data: dromen } = await supabase.rpc("family_dreams")
  const alleDromen = (dromen ?? []).map((d) => ({
    dream_id: d.dream_id,
    person_id: d.person_id,
    first_name: d.first_name,
    last_name: d.last_name,
    title: d.title,
    target_cents: d.target_cents,
    raised_cents: Number(d.raised_cents),
    collection_id: d.collection_id,
  }))
  const mijnDroom = alleDromen.find((d) => d.person_id === meId) ?? null

  return (
    <FamilieKaart
      voornaam={mij?.first_name ?? "familielid"}
      familieNaam={netwerk?.name ?? "je familie"}
      stats={stats ?? { total: 0, known: 0, silent: 0, out_of_touch: 0 }}
      leden={kaart ?? []}
      collectes={lopende}
      dromen={alleDromen}
      mijnPersonId={meId}
      mijnDroom={mijnDroom}
      isCoFounder={!!isCoFounder}
      businessDromen={businessDromen}
      ongelezenMeldingen={ongelezen ?? 0}
      komendeVerjaardag={komendeVerjaardag}
    />
  )
}
