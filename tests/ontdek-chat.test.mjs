// FULLKIN — CONNECT tweeweg-chat tussen ontdekte familieleden.
// Twee echte gebruikers uit VERSCHILLENDE families, verbonden via een discovery-brug:
// A stuurt, B leest + antwoordt, A leest het antwoord. Plus ongelezen-vlag, melding, en
// een negatieve check (een buitenstaander kan niet meelezen of sturen).
//
// Gebruik:  node --env-file=.env.local tests/ontdek-chat.test.mjs
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
const NET = { A: `TEST — chat A ${SUF}`, C: `TEST — chat C ${SUF}`, U: `TEST — chat U ${SUF}` }
const users = []

async function netwerk(n) { const { data, error } = await svc.from("family_networks").insert({ name: n, home_country: "GH" }).select("id").single(); if (error) throw new Error(error.message); return data.id }
async function persoon(net, f, l, extra = {}) { const { data, error } = await svc.from("persons").insert({ network_id: net, first_name: f, last_name: l, ...extra }).select("id").single(); if (error) throw new Error(error.message); return data.id }
async function ouder(net, p, c) { const { error } = await svc.from("relationships").insert({ network_id: net, kind: "parent", origin: "biological", from_person: p, to_person: c }); if (error) throw new Error(error.message) }
async function maakUser(tag) {
  const email = `chat-${tag}-${SUF}@fullkin.invalid`, password = `Test-${SUF}-Aa1!`
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error(error.message)
  const cli = newAnon(); const { error: se } = await cli.auth.signInWithPassword({ email, password })
  if (se) throw new Error(se.message)
  users.push(data.user.id); return { uid: data.user.id, cli }
}
async function opruimen() {
  // notifications + gesprekken hangen aan personen; verwijder_testnetwerk ruimt personen/links op,
  // ontdek_* en notifications cascaden/staan op de netwerken.
  const nets = (await svc.from("family_networks").select("id").in("name", Object.values(NET))).data ?? []
  const ids = nets.map((r) => r.id)
  if (ids.length) {
    const pers = (await svc.from("persons").select("id").in("network_id", ids)).data ?? []
    const pid = pers.map((r) => r.id)
    if (pid.length) {
      await svc.from("ontdek_gesprekken").delete().or(`persoon_a.in.(${pid.join(",")}),persoon_b.in.(${pid.join(",")})`)
    }
    await svc.from("notifications").delete().in("network_id", ids)
  }
  for (const n of Object.values(NET)) await svc.rpc("verwijder_testnetwerk", { p_net_naam: n })
  for (const uid of users) await svc.auth.admin.deleteUser(uid).catch(() => {})
}

async function main() {
  await opruimen()
  const A = await maakUser("a")
  const B = await maakUser("b")

  // Familie A: Anna (A), oom Yaw. Familie C: Michelle (B), vader Yaw (brug).
  const na = await netwerk(NET.A)
  const meA = await persoon(na, "Anna", "Kwesi", { claimed_by: A.uid })
  const yawA = await persoon(na, "Yaw", "Kwesi")
  const nc = await netwerk(NET.C)
  const michelle = await persoon(nc, "Michelle", "Kwesi", { claimed_by: B.uid })
  const yawC = await persoon(nc, "Yaw", "Kwesi")
  await ouder(nc, yawC, michelle)
  // Brug Yaw(A) ↔ Yaw(C) → A en Michelle ontdekken elkaars familie.
  const [pa, pb] = [yawA, yawC].sort()
  await svc.from("person_links").insert({ person_a: pa, person_b: pb, confirmed_by: meA })

  try {
    console.log("\n— A stuurt, B antwoordt, A leest —")
    const s1 = await A.cli.rpc("stuur_ontdek_bericht", { p_ander: michelle, p_tekst: "Hoi Michelle, wat leuk dat we familie zijn!" })
    check("A stuurt een eerste bericht naar Michelle", !s1.error)

    const { data: bijB } = await B.cli.rpc("ontdek_berichten_met", { p_ander: meA })
    check("B ontvangt het bericht van A", (bijB ?? []).length === 1 && bijB[0].is_van_mij === false && /wat leuk/.test(bijB[0].tekst))

    const s2 = await B.cli.rpc("stuur_ontdek_bericht", { p_ander: meA, p_tekst: "Hoi Anna! Ja, geweldig — vertel eens over jouw kant?" })
    check("B antwoordt A", !s2.error)

    const { data: bijA } = await A.cli.rpc("ontdek_berichten_met", { p_ander: michelle })
    check("A ziet beide berichten in de juiste volgorde", (bijA ?? []).length === 2 && bijA[0].is_van_mij === true && bijA[1].is_van_mij === false)

    // Realtime-voorwaarde: deelnemer mag de berichten direct lezen (SELECT-policy), zodat
    // postgres_changes events doorkomen.
    const { data: direct } = await A.cli.from("ontdek_berichten").select("id")
    check("A mag zijn berichten direct lezen (RLS SELECT-policy voor realtime)", (direct ?? []).length === 2)

    console.log("\n— inbox + ongelezen + melding —")
    const { data: inboxA } = await A.cli.rpc("mijn_ontdek_gesprekken")
    const conv = (inboxA ?? []).find((g) => g.ander_id === michelle)
    check("A's inbox toont het gesprek met Michelle", !!conv && /vertel eens/.test(conv.laatste_tekst))
    check("het gesprek staat als ongelezen (laatste is van B)", conv?.ongelezen === true)

    await A.cli.rpc("markeer_ontdek_gelezen", { p_ander: michelle })
    const { data: inboxA2 } = await A.cli.rpc("mijn_ontdek_gesprekken")
    check("na markeren is het gesprek gelezen", (inboxA2 ?? []).find((g) => g.ander_id === michelle)?.ongelezen === false)

    const { count: notifCount } = await svc.from("notifications").select("*", { count: "exact", head: true }).eq("recipient_person_id", michelle).eq("kind", "ontdek_bericht")
    check("Michelle kreeg een melding van het bericht", (notifCount ?? 0) >= 1)

    console.log("\n— buitenstaander kan niet meelezen/sturen —")
    const U = await maakUser("u")
    const nu = await netwerk(NET.U)
    await persoon(nu, "Vreemde", "Onbekend", { claimed_by: U.uid })
    const { data: gluur } = await U.cli.rpc("ontdek_berichten_met", { p_ander: meA })
    check("buitenstaander leest het gesprek NIET", (gluur ?? []).length === 0)
    const { data: gluurDirect } = await U.cli.from("ontdek_berichten").select("id")
    check("buitenstaander leest berichten ook niet direct (RLS)", (gluurDirect ?? []).length === 0)
    const s3 = await U.cli.rpc("stuur_ontdek_bericht", { p_ander: meA, p_tekst: "hallo?" })
    check("buitenstaander kan geen bericht sturen", !!s3.error)
  } finally {
    console.log("\nOpruimen…")
    await opruimen()
  }

  console.log(`\nResultaat ontdek-chat: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
