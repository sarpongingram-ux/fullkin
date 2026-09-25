// FULLKIN — TRUE two-user core loop (P1.15): BUILD → INVITE → CLAIM → GROW.
//
// Twee ECHTE ingelogde gebruikers tegen de echte database (geen mocks). Gebruikt
// genamespacete TEST-data (geen echte families) en ruimt alles op. Bewijst dat als
// gebruiker A een familie bouwt en iemand uitnodigt, gebruiker B zijn klaarstaande plek
// claimt en de familie samen verder groeit — en dat A die groei ziet met een correct
// relatiepad.
//
// Gebruik:  node --env-file=.env.local tests/core-loop-two-users.test.mjs
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !svcKey || !anonKey) { console.error("Ontbrekende env"); process.exit(2) }
const svc = createClient(url, svcKey, { auth: { persistSession: false } })
const newAnon = () => createClient(url, anonKey, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (n, c) => { if (c) { pass++; console.log(`  ✓ ${n}`) } else { fail++; console.log(`  ✗ ${n}`) } }

const SUF = Date.now()
const NET = `TEST — core-loop ${SUF}`
const users = []

async function maakUser(tag) {
  const email = `loop-${tag}-${SUF}@fullkin.invalid`, password = `Test-${SUF}-Aa1!`
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error("createUser: " + error.message)
  const cli = newAnon()
  const { error: se } = await cli.auth.signInWithPassword({ email, password })
  if (se) throw new Error("signIn: " + se.message)
  users.push(data.user.id); return { uid: data.user.id, cli }
}
async function opruimen() {
  await svc.rpc("verwijder_testnetwerk", { p_net_naam: NET })
  for (const uid of users) await svc.auth.admin.deleteUser(uid).catch(() => {})
}
const persoonCount = async (net) => (await svc.from("persons").select("*", { count: "exact", head: true }).eq("network_id", net)).count ?? 0

async function main() {
  await opruimen()
  const A = await maakUser("a")

  // A "heeft" al een account met een eigen persoon in een familie.
  const { data: net } = await svc.from("family_networks").insert({ name: NET, home_country: "GH" }).select("id").single()
  const netA = net.id
  const { data: meRow } = await svc.from("persons").insert({ network_id: netA, first_name: "Anna", last_name: "Loop", claimed_by: A.uid }).select("id").single()
  const meA = meRow.id

  try {
    console.log("\n— BUILD (gebruiker A) —")
    const add = (args) => A.cli.rpc("add_family_member", args)
    const { data: moeder, error: e1 } = await add({ p_voornaam: "Moeder", p_achternaam: "Loop", p_relatie: "ouder" })
    const { data: vader, error: e2 } = await add({ p_voornaam: "Vader", p_achternaam: "Loop", p_relatie: "ouder" })
    const { data: broer, error: e3 } = await add({ p_voornaam: "Broer", p_achternaam: "Loop", p_relatie: "broer_zus" })
    check("A bouwt moeder, vader, broer/zus", !e1 && !e2 && !e3 && !!moeder && !!vader && !!broer)
    check("familiegraaf is gegroeid (>=4 personen)", (await persoonCount(netA)) >= 4)

    console.log("\n— INVITE (gebruiker A nodigt de broer/zus uit) —")
    const { data: inv, error: ie } = await A.cli.from("invites").insert({
      network_id: netA, person_id: broer, invited_by: meA, channel: "link", destination: "",
    }).select("token").single()
    check("A maakt een uitnodiging aan", !ie && !!inv?.token)
    const token = inv.token

    console.log("\n— CLAIM (gebruiker B) —")
    const B = await maakUser("b")
    const { data: prev } = await B.cli.rpc("invite_preview", { invite_token: token }).single()
    check("B ziet zijn klaarstaande plek in de familie", prev?.person_first_name === "Broer" && prev?.status === "open" && prev?.expired === false)
    const { data: geclaimd, error: ce } = await B.cli.rpc("claim_invite", { invite_token: token })
    check("B claimt zijn profiel", !ce && geclaimd === broer)
    const { data: broerRow } = await svc.from("persons").select("claimed_by").eq("id", broer).single()
    check("het profiel is nu van B", broerRow?.claimed_by === B.uid)

    console.log("\n— GROW (gebruiker B breidt de familie uit) —")
    const voor = await persoonCount(netA)
    const { data: bkind, error: ge } = await B.cli.rpc("add_family_member", { p_voornaam: "Kindje", p_achternaam: "Loop", p_relatie: "kind", p_is_kind: true })
    check("B voegt een eigen familielid toe", !ge && !!bkind)
    check("de gedeelde familiegraaf is verder gegroeid", (await persoonCount(netA)) === voor + 1)

    console.log("\n— A ZIET DE GROEI —")
    const { data: route, error: re } = await A.cli.rpc("relation_route", { me: meA, other: bkind })
    check("A ziet een relatiepad naar het nieuwe familielid", !re && typeof route === "string" && route.length > 0)
    console.log(`    (A → nieuw lid: "${route}")`)
  } finally {
    console.log("\nOpruimen…")
    await opruimen()
  }

  console.log(`\nResultaat core-loop: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
