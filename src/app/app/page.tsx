import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FamilieKaart } from "./FamilieKaart"

export default async function AppHome() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  // Wie ben ik als persoon op de kaart?
  const { data: meId } = await supabase.rpc("me")
  if (!meId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-inkt-zacht max-w-sm">
          Je account is nog niet gekoppeld aan een familielid. Vraag degene die
          jou heeft uitgenodigd om je toe te voegen aan de familiekaart.
        </p>
      </main>
    )
  }

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

  return (
    <FamilieKaart
      voornaam={mij?.first_name ?? "familielid"}
      familieNaam={netwerk?.name ?? "je familie"}
      stats={stats ?? { total: 0, known: 0, silent: 0, out_of_touch: 0 }}
      leden={kaart ?? []}
      collectes={lopende}
    />
  )
}
