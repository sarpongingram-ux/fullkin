// Matching-kalibratie: zet de huidige score af tegen de beslissingshistorie
// (bevestigde person_links vs. afgewezen person_match_decisions) en adviseert.
//
// Gebruik:  node --env-file=.env.local scripts/kalibreer-matching.mjs
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Ontbrekende env"); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

const { data: r, error } = await db.rpc("matching_kalibratie")
if (error) { console.error("Fout:", error.message); process.exit(1) }

const bev = r.bevestigd, afw = r.afgewezen
console.log("\n=== Matching-kalibratie ===")
console.log(`Huidige drempel: ${r.drempel}`)
console.log(`Bevestigd (person_links):        n=${bev.n}  score min/gem/max = ${bev.min ?? "-"}/${bev.avg ?? "-"}/${bev.max ?? "-"}  · ${bev.boven_drempel} boven drempel`)
console.log(`Afgewezen (match_decisions):     n=${afw.n}  score min/gem/max = ${afw.min ?? "-"}/${afw.avg ?? "-"}/${afw.max ?? "-"}  · ${afw.onder_drempel} onder drempel`)
console.log(`Nauwkeurigheid op drempel ${r.drempel}: ${r.nauwkeurigheid_pct ?? "-"}%`)

console.log("\n--- Advies ---")
if (!r.genoeg_data) {
  console.log("Nog te weinig gelabelde data om betrouwbaar te kalibreren (minimaal ~10 bevestigd én ~10 afgewezen).")
  console.log("De gewichten blijven ongewijzigd. Draai dit script opnieuw naarmate families")
  console.log("matches bevestigen/afwijzen; dan wordt een drempel-/gewichtsvoorstel betrouwbaar.")
} else {
  if (r.voorgestelde_drempel != null) {
    console.log(`Schone scheiding gevonden → voorgestelde drempel: ${r.voorgestelde_drempel}`)
    console.log("Werk de drempel (45) bij op alle plekken (match_score-gebruikers) via een migratie,")
    console.log("en heroverweeg de relatieve gewichten als bevestigd/afgewezen elkaar overlappen.")
  } else {
    console.log("Bevestigd en afgewezen overlappen in score → de huidige gewichten scheiden niet")
    console.log("schoon. Bekijk welke signalen (naam/geboortedatum/verwanten) het onderscheid missen")
    console.log("en pas de gewichten aan; draai daarna dit script opnieuw.")
  }
}
console.log("")
process.exit(0)
