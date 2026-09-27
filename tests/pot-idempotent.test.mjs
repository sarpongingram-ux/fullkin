// FULLKIN — idempotentie van de pot-boekingen (waar de webhook-fix op steunt).
// record_pot_donation / record_pot_maandbijdrage mogen bij dezelfde stripe_ref maar
// ÉÉN grootboekregel opleveren, ook als zowel de pagina-return als de webhook boekt.
//
// Gebruik:  node --env-file=.env.local tests/pot-idempotent.test.mjs
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Ontbrekende env"); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (n, c) => { if (c) { pass++; console.log(`  ✓ ${n}`) } else { fail++; console.log(`  ✗ ${n}`) } }

const SUF = Date.now()
const NET = `TEST — pot ${SUF}`

async function opruimen() {
  const net = (await db.from("family_networks").select("id").eq("name", NET).maybeSingle()).data
  if (net) {
    await db.from("pot_ledger").delete().eq("network_id", net.id)
    await db.from("pot_subscriptions").delete().eq("network_id", net.id)
  }
  await db.rpc("verwijder_testnetwerk", { p_net_naam: NET })
}
const tel = async (net, ref) => (await db.from("pot_ledger").select("*", { count: "exact", head: true }).eq("network_id", net).eq("stripe_ref", ref)).count ?? 0

async function main() {
  await opruimen()
  const net = (await db.from("family_networks").insert({ name: NET, home_country: "GH" }).select("id").single()).data.id
  const per = (await db.from("persons").insert({ network_id: net, first_name: "Gever", last_name: "Test" }).select("id").single()).data.id

  try {
    const refD = `pi_${SUF}`
    await db.rpc("record_pot_donation", { p_network: net, p_person: per, p_amount: 500, p_ref: refD })
    await db.rpc("record_pot_donation", { p_network: net, p_person: per, p_amount: 500, p_ref: refD }) // dubbel (pagina + webhook)
    check("donatie: dubbele boeking met zelfde ref = 1 regel", (await tel(net, refD)) === 1)

    const refM = `inv_${SUF}`
    await db.rpc("record_pot_maandbijdrage", { p_network: net, p_person: per, p_amount: 300, p_ref: refM })
    await db.rpc("record_pot_maandbijdrage", { p_network: net, p_person: per, p_amount: 300, p_ref: refM })
    check("maandbijdrage: dubbele boeking met zelfde ref = 1 regel", (await tel(net, refM)) === 1)

    const refM2 = `inv_${SUF}_b`
    await db.rpc("record_pot_maandbijdrage", { p_network: net, p_person: per, p_amount: 300, p_ref: refM2 })
    check("nieuwe maand (andere ref) = aparte regel", (await tel(net, refM2)) === 1)

    const totaal = (await db.from("pot_ledger").select("*", { count: "exact", head: true }).eq("network_id", net)).count ?? 0
    check("in totaal 3 grootboekregels (geen dubbelingen)", totaal === 3)
  } finally {
    await opruimen()
  }

  console.log(`\nResultaat pot-idempotent: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
