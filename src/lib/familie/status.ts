import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

// Staat dit netwerk op pauze (bevroren wegens verlopen abonnement)? Alleen
// lid-gestichte families kunnen bevriezen; originele families nooit.
export async function netwerkOpPauze(
  supabase: SupabaseClient<Database>,
  networkId: string,
): Promise<boolean> {
  const { data } = await supabase.rpc("netwerk_bevroren", { p_net: networkId })
  return !!data
}

// Vaste tekst voor geblokkeerde acties in een bevroren familie.
export const PAUZE_FOUT =
  "Deze familie staat op pauze. Heractiveer 'm (€0,99/mnd) om weer te kunnen bewerken."
