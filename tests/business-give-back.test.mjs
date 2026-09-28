// FULLKIN — business-droom "teruggeven aan de familie" in echt geld.
// settle_business_give_back legt de teruggave vast ÉN crediteert de familiepot (idempotent),
// en business_give_back_totaal toont de voortgang. Transparant zichtbaar voor de familie.
//
// Gebruik:  node --env-file=.env.local tests/business-give-back.test.mjs
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !svcKey || !anonKey) { console.error("Ontbrekende env"); process.exit(2) }
const svc = createClient(url, svcKey, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (n, c) => { if (c) { pass++; console.log(`  ✓ ${n}`) } else { fail++; console.log(`  ✗ ${n}`) } }

const SUF = Date.now()
const NET = `TEST — giveback ${SUF}`
const users = []

async function maakUser(tag) {
  const email = `gb-${tag}-${SUF}@fullkin.invalid`, password = `Test-${SUF}-Aa1!`
  const { data } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  const cli = createClient(url, anonKey, { auth: { persistSession: false } })
  await cli.auth.signInWithPassword({ email, password })
  users.push(data.user.id); return { uid: data.user.id, cli }
}
async function opruimen() {
  const net = (await svc.from("family_networks").select("id").eq("name", NET).maybeSingle()).data
  if (net) {
    await svc.from("pot_ledger").delete().eq("network_id", net.id)
    await svc.from("business_give_backs").delete().eq("network_id", net.id)
    await svc.from("business_dreams").delete().eq("network_id", net.id)
  }
  await svc.rpc("verwijder_testnetwerk", { p_net_naam: NET })
  for (const uid of users) await svc.auth.admin.deleteUser(uid).catch(() => {})
}
const potTeruggave = async (net) => {
  const { data } = await svc.from("pot_ledger").select("amount_cents").eq("network_id", net).eq("kind", "teruggave")
  return { aantal: (data ?? []).length, som: (data ?? []).reduce((s, r) => s + r.amount_cents, 0) }
}

async function main() {
  await opruimen()
  const A = await maakUser("a") // de ondernemer
  const net = (await svc.from("family_networks").insert({ name: NET, home_country: "GH" }).select("id").single()).data.id
  const personA = (await svc.from("persons").insert({ network_id: net, first_name: "Kojo", last_name: "Ondernemer", claimed_by: A.uid }).select("id").single()).data.id
  const biz = (await svc.from("business_dreams").insert({
    network_id: net, person_id: personA, name: "Kippenboerderij", description: "40 kippen",
    target_cents: 100000, give_back: "10% van de winst", give_back_pledge_cents: 50000, status: "goedgekeurd",
  }).select("id").single()).data.id

  try {
    // Eerste teruggave (€200) — dubbel boeken met dezelfde ref = één regel + één pot-credit.
    const ref1 = `pi_gb_${SUF}`
    await svc.rpc("settle_business_give_back", { p_business: biz, p_person: personA, p_amount: 20000, p_ref: ref1 })
    await svc.rpc("settle_business_give_back", { p_business: biz, p_person: personA, p_amount: 20000, p_ref: ref1 })
    const { count: n1 } = await svc.from("business_give_backs").select("*", { count: "exact", head: true }).eq("business_id", biz)
    check("teruggave vastgelegd, dubbel = 1 regel", n1 === 1)
    const pt1 = await potTeruggave(net)
    check("familiepot precies 1× gecrediteerd (€200)", pt1.aantal === 1 && pt1.som === 20000)

    // Tweede teruggave (€300), andere ref.
    const ref2 = `pi_gb_${SUF}_b`
    await svc.rpc("settle_business_give_back", { p_business: biz, p_person: personA, p_amount: 30000, p_ref: ref2 })
    const pt2 = await potTeruggave(net)
    check("tweede teruggave crediteert de pot opnieuw (totaal €500)", pt2.aantal === 2 && pt2.som === 50000)

    // Voortgang via de RPC (als de ondernemer): toegezegd/gegeven/aantal.
    const { data: tot } = await A.cli.rpc("business_give_back_totaal", { bid: biz }).single()
    check("voortgang: toegezegd €500", tot?.toegezegd_cents === 50000)
    check("voortgang: gegeven €500", tot?.gegeven_cents === 50000)
    check("voortgang: aantal = 2", tot?.aantal === 2)

    // Transparantie: de familie ziet de teruggaven (RLS network-read).
    const { data: zichtbaar } = await A.cli.from("business_give_backs").select("amount_cents").eq("business_id", biz)
    check("familie ziet de teruggaven (transparant)", (zichtbaar ?? []).length === 2)
  } finally {
    await opruimen()
  }

  console.log(`\nResultaat business-give-back: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
