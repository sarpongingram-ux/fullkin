import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

// De bucket is privé, dus foto's worden getoond via kortlevende signed URLs.
// Externe http-url's (bv. seed-/testdata) worden ongewijzigd doorgegeven.
export async function tekenFotoUrls(
  supabase: SupabaseClient<Database>,
  paden: string[],
): Promise<Map<string, string>> {
  const resultaat = new Map<string, string>()
  const teTekenen: string[] = []

  for (const p of paden) {
    if (!p) continue
    if (p.startsWith("http")) resultaat.set(p, p)
    else teTekenen.push(p)
  }

  if (teTekenen.length > 0) {
    const { data } = await supabase.storage
      .from("family-album")
      .createSignedUrls(teTekenen, 60 * 60) // 1 uur geldig
    for (const rij of data ?? []) {
      if (rij.path && rij.signedUrl) resultaat.set(rij.path, rij.signedUrl)
    }
  }

  return resultaat
}
