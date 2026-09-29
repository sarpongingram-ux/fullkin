// FULLKIN — refund/dispute-afhandeling: draait een bijdrage én haar grootboek-effecten
// terug (keeper 2% + pot 1%), en herstelt bij een gewonnen dispute.
//
// Gebruik:  node --env-file=.env.local tests/refund.test.mjs
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Ontbrekende env"); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (n, c) => { if (c) { pass++; console.log(`  ✓ ${n}`) } else { fail++; console.log(`  ✗ ${n}`) } }

const SUF = Date.now()
const NET = `TEST — refund ${SUF}`

async function opruimen() {
  const net = (await db.from("family_networks").select("id").eq("name", NET).maybeSingle()).data
  if (net) {
    const cols = (await db.from("collections").select("id").eq("network_id", net.id)).data ?? []
    const colIds = cols.map((c) => c.id)
    await db.from("pot_ledger").delete().eq("network_id", net.id)
    await db.from("transaction_splits").delete().eq("network_id", net.id)
    if (colIds.length) await db.from("contributions").delete().in("collection_id", colIds)
    await db.from("collections").delete().eq("network_id", net.id)
    await db.from("keeper_upgrades").delete().eq("network_id", net.id)
  }
  await db.rpc("verwijder_testnetwerk", { p_net_naam: NET })
}

const keeperVerdiend = async (net) => {
  const { data } = await db.from("transaction_splits").select("co_founder_cents").eq("network_id", net)
  return (data ?? []).reduce((s, r) => s + r.co_founder_cents, 0)
}
const potCount = async (net, cid) =>
  (await db.from("pot_ledger").select("*", { count: "exact", head: true })
    .eq("network_id", net).eq("contribution_id", cid).eq("kind", "transactie_1pct")).count ?? 0
const splitCount = async (cid) =>
  (await db.from("transaction_splits").select("*", { count: "exact", head: true }).eq("contribution_id", cid)).count ?? 0
const status = async (cid) => (await db.from("contributions").select("status").eq("id", cid).single()).data?.status

async function main() {
  await opruimen()
  const net = (await db.from("family_networks").insert({ name: NET, home_country: "GH" }).select("id").single()).data.id
  const p = (await db.from("persons").insert({ network_id: net, first_name: "Gever", last_name: "Test" }).select("id").single()).data.id
  // Actieve keeper → 2% keeper-deel.
  await db.from("keeper_upgrades").insert({ network_id: net, person_id: p, status: "actief", amount_cents: 499 })
  const col = (await db.from("collections").insert({
    network_id: net, beneficiary_id: p, title: "Testcollecte",
    closes_at: new Date(Date.now() + 86400e3).toISOString(), started_by: p, status: "open",
  }).select("id").single()).data.id
  const con = (await db.from("contributions").insert({
    collection_id: col, contributor_id: p, amount_cents: 10000, status: "wachtend",
  }).select("id").single()).data.id
  const intent = `pi_refund_${SUF}`

  try {
    // Afrekenen: 2% keeper (200) + 1% pot (100).
    await db.rpc("settle_contribution", { p_contribution: con, p_intent: intent })
    check("bijdrage is betaald", (await status(con)) === "betaald")
    check("split geboekt (keeper verdient 200)", (await keeperVerdiend(net)) === 200)
    check("pot 1%-regel geboekt", (await potCount(net, con)) === 1)

    // Refund: alles terugdraaien.
    await db.rpc("reverse_contribution", { p_contribution: con, p_status: "terugbetaald" })
    check("na refund: status terugbetaald", (await status(con)) === "terugbetaald")
    check("na refund: split weg (keeper 0)", (await keeperVerdiend(net)) === 0)
    check("na refund: pot 1%-regel weg", (await potCount(net, con)) === 0)

    // Herstel (bv. dispute gewonnen): opnieuw afrekenen.
    await db.rpc("settle_contribution", { p_contribution: con, p_intent: intent })
    check("herstel: opnieuw betaald + split terug (keeper 200)", (await status(con)) === "betaald" && (await keeperVerdiend(net)) === 200)

    // Dispute geopend: conservatief betwist + terugdraaien.
    await db.rpc("reverse_contribution", { p_contribution: con, p_status: "betwist" })
    check("dispute: status betwist", (await status(con)) === "betwist")
    check("dispute: grootboek teruggedraaid (keeper 0, geen split)", (await keeperVerdiend(net)) === 0 && (await splitCount(con)) === 0)

    // Dispute gewonnen: herstellen.
    await db.rpc("settle_contribution", { p_contribution: con, p_intent: intent })
    check("dispute gewonnen: hersteld naar betaald (keeper 200)", (await status(con)) === "betaald" && (await keeperVerdiend(net)) === 200)
  } finally {
    await opruimen()
  }

  console.log(`\nResultaat refund: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
