// FULLKIN — geautomatiseerde test van de relatie-engine.
// Draait tegen een DB (bij voorkeur staging/branch): seedt de Carter-testfamilie
// via laad_testfamilie(), controleert relation_label / relatie_pad, en ruimt op.
//
// Gebruik:  node --env-file=.env.local tests/relatie-engine.test.mjs
// Vereist:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// ⚠️  Gebruikt een genamespacet netwerk 'TEST — engine' en verwijdert dat aan het
//     eind. Draai tegen staging, niet tegen productie met echte families.

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Ontbrekende env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(2)
}
const db = createClient(url, key, { auth: { persistSession: false } })
const NET = "TEST — engine"

let pass = 0
let fail = 0
function check(naam, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    pass++
    console.log(`  ✓ ${naam}`)
  } else {
    fail++
    console.log(`  ✗ ${naam}\n      verwacht: ${JSON.stringify(expected)}\n      gekregen: ${JSON.stringify(actual)}`)
  }
}

async function label(me, other) {
  const { data, error } = await db.rpc("relation_label", { me, other })
  if (error) throw new Error("relation_label: " + error.message)
  return data
}
async function padNamen(me, other) {
  const { data, error } = await db.rpc("relatie_pad", { me, other })
  if (error) throw new Error("relatie_pad: " + error.message)
  return (data ?? []).sort((a, b) => a.pos - b.pos).map((r) => r.naam)
}

async function main() {
  console.log("Seeden: Carter-testfamilie…")
  const { error: seedErr } = await db.rpc("laad_testfamilie", { p_net_naam: NET })
  if (seedErr) throw new Error("laad_testfamilie: " + seedErr.message)

  // Person-ids ophalen.
  const { data: net } = await db
    .from("family_networks").select("id").eq("name", NET).single()
  const { data: personen } = await db
    .from("persons").select("id, first_name").eq("network_id", net.id)
  const id = Object.fromEntries(personen.map((p) => [p.first_name, p.id]))
  const J = id["James"]

  try {
    console.log("Relatie-labels vanuit James:")
    check("Daniel = ouder", await label(J, id["Daniel"]), "ouder")
    check("Rebecca = broer of zus (vol)", await label(J, id["Rebecca"]), "broer of zus")
    check("Tom = halfbroer of halfzus", await label(J, id["Tom"]), "halfbroer of halfzus")
    check("Michelle = neef of nicht", await label(J, id["Michelle"]), "neef of nicht")
    check("Emma = neef of nicht", await label(J, id["Emma"]), "neef of nicht")
    check("George = grootouder", await label(J, id["George"]), "grootouder")
    check("Michael = oom of tante", await label(J, id["Michael"]), "oom of tante")
    check("Sarah = oom of tante", await label(J, id["Sarah"]), "oom of tante")
    check("Nadia = partner", await label(J, id["Nadia"]), "partner")
    check("Leah = kind", await label(J, id["Leah"]), "kind")
    // Ex-partner: Daniel en Linda waren eerder partners (former_partner, Z5).
    check("Daniel → Linda = ex-partner", await label(id["Daniel"], id["Linda"]), "ex-partner")
    // Leah's perspectief: George is overgrootouder (3 generaties).
    check("Leah → George = overgrootouder", await label(id["Leah"], id["George"]), "overgrootouder")

    console.log("Node-voor-node pad:")
    check(
      "James → Michelle (cousin-pad)",
      await padNamen(J, id["Michelle"]),
      ["James Carter", "Daniel Carter", "Helen Carter", "Michael Carter", "Michelle Carter"],
    )
  } finally {
    console.log("Opruimen…")
    await db.rpc("verwijder_testnetwerk", { p_net_naam: NET })
  }

  console.log(`\nResultaat: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error("Testfout:", e.message)
  db.rpc("verwijder_testnetwerk", { p_net_naam: NET }).finally(() => process.exit(2))
})
