// FULLKIN — automatische verjaardag-collectes (network-scoped, veilig).
// Controleert maak_verjaardag_collectes(dagen, network): maakt een cadeaupot voor levende
// leden met een verjaardag binnen 14 dagen, onderscheidt ronde verjaardagen, slaat
// overledenen/verre verjaardagen over, en is idempotent.
//
// Gebruik:  node --env-file=.env.local tests/verjaardag-collectes.test.mjs
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Ontbrekende env"); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (n, c) => { if (c) { pass++; console.log(`  ✓ ${n}`) } else { fail++; console.log(`  ✗ ${n}`) } }

const SUF = Date.now()
const NET = `TEST — verjaardag ${SUF}`

// Datum X dagen vanaf vandaag, met opgegeven geboortejaar (voor leeftijd/rondheid).
function geboorte(jaar, dagenVanNu) {
  const d = new Date(); d.setUTCDate(d.getUTCDate() + dagenVanNu)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${jaar}-${mm}-${dd}`
}

async function persoon(net, f, l, extra = {}) { const { data, error } = await db.from("persons").insert({ network_id: net, first_name: f, last_name: l, ...extra }).select("id").single(); if (error) throw new Error(error.message); return data.id }
async function opruimen() {
  const net = (await db.from("family_networks").select("id").eq("name", NET).maybeSingle()).data
  if (net) {
    await db.from("collections").delete().eq("network_id", net.id)
    await db.from("life_events").delete().eq("network_id", net.id)
  }
  await db.rpc("verwijder_testnetwerk", { p_net_naam: NET })
}
async function collecteVoor(pid) {
  const { data } = await db.from("collections").select("id, status, life_events(kind)").eq("beneficiary_id", pid)
  return (data ?? [])[0]
}

async function main() {
  await opruimen()
  const net = (await db.from("family_networks").insert({ name: NET, home_country: "GH" }).select("id").single()).data.id

  // Levend, ronde verjaardag over ~5 dagen (wordt 30).
  const rond = await persoon(net, "Rondje", "Jarig", { born_on: geboorte(new Date().getUTCFullYear() - 30, 5) })
  // Levend, gewone verjaardag over ~9 dagen (wordt 32).
  const gewoon = await persoon(net, "Gewoon", "Jarig", { born_on: geboorte(new Date().getUTCFullYear() - 32, 9) })
  // Levend, verjaardag ver weg (~200 dagen).
  const ver = await persoon(net, "Later", "Jarig", { born_on: geboorte(new Date().getUTCFullYear() - 40, 200) })
  // Overleden, verjaardag over ~5 dagen → overslaan.
  const dood = await persoon(net, "Wijlen", "Jarig", { born_on: geboorte(new Date().getUTCFullYear() - 70, 5), died_on: "2020-01-01" })
  // Geen geboortedatum → overslaan.
  const onbekend = await persoon(net, "Onbekend", "Jarig")

  try {
    const { data: aantal } = await db.rpc("maak_verjaardag_collectes", { p_dagen: 14, p_network: net })
    check("maakt 2 collectes (twee levende naderende verjaardagen)", aantal === 2)

    const cr = await collecteVoor(rond)
    check("collecte voor de ronde jarige bestaat", !!cr && cr.status === "open")
    check("ronde verjaardag → kind 'ronde_verjaardag'", cr?.life_events?.kind === "ronde_verjaardag")

    const cg = await collecteVoor(gewoon)
    check("collecte voor de gewone jarige bestaat", !!cg)
    check("gewone verjaardag → kind 'verjaardag'", cg?.life_events?.kind === "verjaardag")

    check("geen collecte voor verjaardag ver weg", !(await collecteVoor(ver)))
    check("geen collecte voor overleden lid", !(await collecteVoor(dood)))
    check("geen collecte voor lid zonder geboortedatum", !(await collecteVoor(onbekend)))

    // Idempotent: nog een keer draaien maakt niets nieuws.
    const { data: aantal2 } = await db.rpc("maak_verjaardag_collectes", { p_dagen: 14, p_network: net })
    check("tweede run is idempotent (0 nieuwe)", aantal2 === 0)
    const totaal = (await db.from("collections").select("*", { count: "exact", head: true }).eq("network_id", net)).count ?? 0
    check("nog steeds precies 2 collectes", totaal === 2)
  } finally {
    await opruimen()
  }

  console.log(`\nResultaat verjaardag-collectes: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
