import { createClient } from "@/lib/supabase/server"
import { BottomNav } from "./BottomNav"
import { FamilieWisselaar, type Familie } from "./FamilieWisselaar"

// Alle app-schermen delen de onderste navigatiebalk en — als je bij een familie
// hoort — de familie-wisselaar bovenin. De extra onderruimte zorgt dat inhoud
// nooit achter de balk verdwijnt.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: families } = await supabase.rpc("mijn_families")
  const lijst = (families ?? []) as Familie[]

  return (
    <div className="pb-24">
      {lijst.length > 0 && (
        <div className="sticky top-0 z-30 flex items-center px-4 py-2 bg-zand/85 backdrop-blur border-b border-rand">
          <FamilieWisselaar families={lijst} />
        </div>
      )}
      {children}
      <BottomNav />
    </div>
  )
}
