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
    .select("first_name, network_id")
    .eq("id", meId)
    .single()

  const [{ data: leden }, { data: netwerk }, { data: isKeeper }] =
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
    ])

  return (
    <FamilieLeden
      meId={meId}
      voornaam={mij?.first_name ?? "familielid"}
      familieNaam={netwerk?.name ?? "je familie"}
      leden={leden ?? []}
      isFamilyKeeper={!!isKeeper}
    />
  )
}
