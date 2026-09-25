// FULLKIN — graph-integriteit (P1.7) + transactionele build (P1.6).
//
// Guard-tests draaien als service_role met directe inserts (constraints/triggers vuren
// ongeacht rol). add_family_member wordt als ECHTE ingelogde gebruiker getest.
//
// Gebruik:  node --env-file=.env.local tests/graph.test.mjs
// ⚠️  Maakt tijdelijke auth-users + TEST-netwerken en ruimt ze op.

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !svcKey || !anonKey) {
  console.error("Ontbrekende env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY")
  process.exit(2)
}
const svc = createClient(url, svcKey, { auth: { persistSession: false } })
const newAnon = () => createClient(url, anonKey, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (naam, cond) => { if (cond) { pass++; console.log(`  ✓ ${naam}`) } else { fail++; console.log(`  ✗ ${naam}`) } }

const SUF = Date.now()
const NET = { G: `TEST — graph G ${SUF}`, H: `TEST — graph H ${SUF}`, U: `TEST — graph U ${SUF}` }
const users = []

async function netwerk(naam) {
  const { data, error } = await svc.from("family_networks").insert({ name: naam, home_country: "GH" }).select("id").single()
  if (error) throw new Error("netwerk: " + error.message); return data.id
}
async function persoon(net, first, last, extra = {}) {
  const { data, error } = await svc.from("persons").insert({ network_id: net, first_name: first, last_name: last, ...extra }).select("id").single()
  if (error) throw new Error("persoon: " + error.message); return data.id
}
async function rel(net, kind, from, to) {
  return svc.from("relationships").insert({ network_id: net, kind, origin: "biological", from_person: from, to_person: to })
}
async function maakUser(tag) {
  const email = `graph-${tag}-${SUF}@fullkin.invalid`, password = `Test-${SUF}-Aa1!`
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error("createUser: " + error.message)
  const cli = newAnon()
  const { error: se } = await cli.auth.signInWithPassword({ email, password })
  if (se) throw new Error("signIn: " + se.message)
  users.push(data.user.id); return { uid: data.user.id, cli }
}
async function opruimen() {
  for (const n of Object.values(NET)) await svc.rpc("verwijder_testnetwerk", { p_net_naam: n })
  for (const uid of users) await svc.auth.admin.deleteUser(uid).catch(() => {})
}

async function main() {
  await opruimen()

  // === P1.7 guards (service_role, directe inserts) ===
  console.log("\n— P1.7 graph-integriteit —")
  const G = await netwerk(NET.G)
  const g1 = await persoon(G, "G1", "Test"), g2 = await persoon(G, "G2", "Test"), g3 = await persoon(G, "G3", "Test")
  const H = await netwerk(NET.H)
  const h1 = await persoon(H, "H1", "Test")

  check("self-relatie geweigerd", !!(await rel(G, "parent", g1, g1)).error)

  check("ouder-edge lukt (g1→g2)", !(await rel(G, "parent", g1, g2)).error)
  check("dubbele edge geweigerd", !!(await rel(G, "parent", g1, g2)).error)

  // cross-network: relatie tussen G en H
  check("cross-network relatie geweigerd", !!(await rel(G, "parent", g1, h1)).error)

  // cykel: g2→g3, dan g3→g1 zou lus maken (g1→g2→g3→g1)
  check("ouder-edge lukt (g2→g3)", !(await rel(G, "parent", g2, g3)).error)
  check("cykel g3→g1 geweigerd", !!(await rel(G, "parent", g3, g1)).error)
  // directe 2-cykel: g2→g1 (g1 is al ouder van g2)
  check("2-cykel g2→g1 geweigerd", !!(await rel(G, "parent", g2, g1)).error)

  // former_partner normalisatie: from > to moet falen; genormaliseerd lukt
  const [lo, hi] = [g1, g3].sort()
  check("former_partner ongenormaliseerd geweigerd", !!(await rel(G, "former_partner", hi, lo)).error)
  check("former_partner genormaliseerd lukt", !(await rel(G, "former_partner", lo, hi)).error)

  // === P1.6 add_family_member (ingelogde gebruiker) ===
  console.log("\n— P1.6 transactionele build —")
  const U = await maakUser("u")
  const nu = await netwerk(NET.U)
  const meU = await persoon(nu, "Ik", "Gebruiker", { claimed_by: U.uid })

  const cntU = async () => (await svc.from("persons").select("*", { count: "exact", head: true }).eq("network_id", nu)).count ?? 0
  const edges = async () => (await svc.from("relationships").select("kind,from_person,to_person").eq("network_id", nu)).data ?? []

  // ouder boven mij
  {
    const { data: id, error } = await U.cli.rpc("add_family_member", { p_voornaam: "Mama", p_achternaam: "Gebruiker", p_relatie: "ouder" })
    check("ouder toevoegen lukt", !error && !!id)
    check("ouder-edge nieuw→mij bestaat", (await edges()).some((e) => e.kind === "parent" && e.from_person === id && e.to_person === meU))
  }
  // kind onder mij
  {
    const { data: id, error } = await U.cli.rpc("add_family_member", { p_voornaam: "Kindje", p_achternaam: "Gebruiker", p_relatie: "kind", p_is_kind: true })
    check("kind toevoegen lukt", !error && !!id)
    check("ouder-edge mij→kind bestaat", (await edges()).some((e) => e.kind === "parent" && e.from_person === meU && e.to_person === id))
  }
  // partner
  {
    const { data: id, error } = await U.cli.rpc("add_family_member", { p_voornaam: "Partner", p_achternaam: "Gebruiker", p_relatie: "partner" })
    const [a, b] = [meU, id].sort()
    check("partner toevoegen lukt", !error && !!id)
    check("partner-edge genormaliseerd bestaat", (await edges()).some((e) => e.kind === "partner" && e.from_person === a && e.to_person === b))
  }
  // ex-partner
  {
    const { data: id, error } = await U.cli.rpc("add_family_member", { p_voornaam: "Ex", p_achternaam: "Gebruiker", p_relatie: "ex_partner" })
    check("ex-partner toevoegen lukt", !error && !!id)
    check("former_partner-edge bestaat", (await edges()).some((e) => e.kind === "former_partner" && (e.from_person === id || e.to_person === id)))
  }
  // broer/zus met BESTAANDE ouder (mij; ik heb al 'Mama') → hergebruikt die ouder (+1 persoon)
  {
    const voor = await cntU()
    const { data: id, error } = await U.cli.rpc("add_family_member", { p_voornaam: "Broer", p_achternaam: "Gebruiker", p_relatie: "broer_zus" })
    check("broer/zus (bestaande ouder) toevoegen lukt", !error && !!id)
    check("broer/zus hergebruikt bestaande ouder (+1 persoon)", (await cntU()) === voor + 1)
    const es = await edges()
    const mijnOuders = es.filter((e) => e.kind === "parent" && e.to_person === meU).map((e) => e.from_person)
    const broerOuders = es.filter((e) => e.kind === "parent" && e.to_person === id).map((e) => e.from_person)
    check("broer/zus deelt een ouder met mij", broerOuders.some((o) => mijnOuders.includes(o)))
  }
  // broer/zus van een OUDERLOOS anker → placeholder-ouder aangemaakt (+2 personen)
  {
    const solo = await persoon(nu, "Solo", "Gebruiker")
    const voor = await cntU()
    const { data: id, error } = await U.cli.rpc("add_family_member", { p_voornaam: "SoloBroer", p_achternaam: "Gebruiker", p_relatie: "broer_zus", p_anker: solo })
    check("broer/zus (ouderloos anker) toevoegen lukt", !error && !!id)
    check("placeholder-ouder aangemaakt (+2 personen: broer + Onbekende)", (await cntU()) === voor + 2)
    const es = await edges()
    const soloOuders = es.filter((e) => e.kind === "parent" && e.to_person === solo).map((e) => e.from_person)
    const broerOuders = es.filter((e) => e.kind === "parent" && e.to_person === id).map((e) => e.from_person)
    check("beide delen de nieuwe placeholder-ouder", soloOuders.length === 1 && broerOuders.some((o) => soloOuders.includes(o)))
  }
  // no-orphan: ongeldig anker → geen persoon aangemaakt
  {
    const voor = await cntU()
    const { error } = await U.cli.rpc("add_family_member", { p_voornaam: "Spook", p_achternaam: "X", p_relatie: "kind", p_anker: h1 })
    check("ongeldig anker geweigerd", !!error)
    check("geen orphan-persoon aangemaakt bij afwijzing", (await cntU()) === voor)
  }

  console.log(`\nResultaat graph: ${pass} geslaagd, ${fail} mislukt.`)
  await opruimen()
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
