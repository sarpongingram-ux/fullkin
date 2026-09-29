import { createClient } from "@/lib/supabase/server"
import { BottomNav } from "./BottomNav"
import { FamilieWisselaar, type Familie } from "./FamilieWisselaar"
import { PauzeBanner } from "./PauzeBanner"

// Alle app-schermen delen de onderste navigatiebalk en — als je bij een familie
// hoort — de familie-wisselaar bovenin. De extra onderruimte zorgt dat inhoud
// nooit achter de balk verdwijnt.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const [{ data: families }, { data: gesprekken }] = await Promise.all([
    supabase.rpc("mijn_families"),
    supabase.rpc("mijn_ontdek_gesprekken"),
  ])
  const lijst = (families ?? []) as Familie[]
  const actief = lijst.find((f) => f.is_active) ?? lijst[0]
  // Ongelezen ontdek-bericht? Dan een stip op de Ontdek-tab.
  const ontdekOngelezen = (gesprekken ?? []).some((g) => g.ongelezen)

  return (
    <div className="pb-24">
      {lijst.length > 0 && (
        <div className="sticky top-0 z-30 flex items-center px-4 py-2 bg-zand/85 backdrop-blur border-b border-rand">
          <FamilieWisselaar families={lijst} />
        </div>
      )}
      {actief?.bevroren && (
        <PauzeBanner networkId={actief.network_id} familieNaam={actief.name} />
      )}
      {children}
      <BottomNav ontdekOngelezen={ontdekOngelezen} />
    </div>
  )
}
