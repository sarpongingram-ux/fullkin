import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FamilieLeden } from "./FamilieLeden"

export default async function FamiliePagina() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/inloggen")

  const { data: meId } = await supabase.rpc("me")
  if (!meId) redirect("/start")

  const { data: mij } = await supabase
    .from("persons")
    .select("first_name, last_name, photo_url, network_id")
    .eq("id", meId)
    .single()

  const [{ data: leden }, { data: netwerk }, { data: isKeeper }, { data: extra }] =
    await Promise.all([
      supabase.rpc("family_map", { me: meId }),
      mij
        ? supabase
            .from("family_networks")
            .select("name")
            .eq("id", mij.network_id)
            .single()
        : Promise.resolve({ data: null }),
      mij
        ? supabase.rpc("has_role", { net: mij.network_id, r: "co_founder" })
        : Promise.resolve({ data: false }),
      supabase.from("persons").select("id, managed_by, born_on, died_on"),
    ])

  // managed_by/born_on/died_on staan niet in family_map (zit in een RLS-policy),
  // dus apart ophalen en samenvoegen.
  const extraMap = new Map(
    (extra ?? []).map((p) => [
      p.id,
      { managed_by: p.managed_by, born_on: p.born_on, died_on: p.died_on },
    ]),
  )
  const ledenVerrijkt = (leden ?? []).map((l) => ({
    ...l,
    managed_by: extraMap.get(l.person_id)?.managed_by ?? null,
    born_on: extraMap.get(l.person_id)?.born_on ?? null,
    died_on: extraMap.get(l.person_id)?.died_on ?? null,
  }))

  return (
    <FamilieLeden
      meId={meId}
      voornaam={mij?.first_name ?? "familielid"}
      familieNaam={netwerk?.name ?? "je familie"}
      leden={ledenVerrijkt}
      isFamilyKeeper={!!isKeeper}
      zelf={{
        achternaam: mij?.last_name ?? "",
        photoUrl: mij?.photo_url ?? null,
      }}
    />
  )
}
