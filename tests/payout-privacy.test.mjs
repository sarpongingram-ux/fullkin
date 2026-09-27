// FULLKIN — payout-privacy: rekening-/mobile-money-gegevens (payout_details) zijn
// EIGENAAR-only, ook voor familieleden. De routing/status (payout_accounts) mag de familie
// wél zien, maar nooit de rekeningnummers.
//
// Gebruik:  node --env-file=.env.local tests/payout-privacy.test.mjs
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
const NET = `TEST — payout ${SUF}`
const users = []

async function maakUser(tag) {
  const email = `payout-${tag}-${SUF}@fullkin.invalid`, password = `Test-${SUF}-Aa1!`
  const { data } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  const cli = newAnon(); await cli.auth.signInWithPassword({ email, password })
  users.push(data.user.id); return { uid: data.user.id, cli }
}
async function opruimen() {
  const net = (await svc.from("family_networks").select("id").eq("name", NET).maybeSingle()).data
  if (net) {
    const pers = (await svc.from("persons").select("id").eq("network_id", net.id)).data ?? []
    const pid = pers.map((r) => r.id)
    if (pid.length) {
      await svc.from("payout_details").delete().in("person_id", pid)
      await svc.from("payout_accounts").delete().in("person_id", pid)
    }
  }
  await svc.rpc("verwijder_testnetwerk", { p_net_naam: NET })
  for (const uid of users) await svc.auth.admin.deleteUser(uid).catch(() => {})
}

async function main() {
  await opruimen()
  const A = await maakUser("a")
  const B = await maakUser("b")
  const net = (await svc.from("family_networks").insert({ name: NET, home_country: "GH" }).select("id").single()).data.id
  const personA = (await svc.from("persons").insert({ network_id: net, first_name: "Ama", last_name: "Keeper", claimed_by: A.uid }).select("id").single()).data.id
  await svc.from("persons").insert({ network_id: net, first_name: "Kofi", last_name: "Lid", claimed_by: B.uid })

  try {
    // A koppelt Flutterwave-gegevens (zoals de server action doet).
    const { error: dErr } = await A.cli.from("payout_details").insert({
      person_id: personA, provider: "flutterwave", method: "mobile_money", currency: "GHS",
      account_name: "Ama Keeper", momo_network: "MTN", phone: "0240000000",
    })
    check("A kan eigen uitbetaalgegevens opslaan", !dErr)
    const { error: aErr } = await A.cli.from("payout_accounts").insert({
      person_id: personA, network_id: net, provider: "flutterwave",
      external_id: `flutterwave:${personA}`, country: "GH", currency: "GHS", status: "ready",
    })
    check("A kan eigen uitbetaalaccount opslaan", !aErr)

    // A leest eigen gevoelige gegevens.
    const { data: eigen } = await A.cli.from("payout_details").select("phone").eq("person_id", personA)
    check("A leest eigen gegevens (telefoon aanwezig)", (eigen ?? []).length === 1 && eigen[0].phone === "0240000000")

    // B (familielid, zelfde netwerk) mag de gevoelige gegevens NIET zien.
    const { data: bZietDetails } = await B.cli.from("payout_details").select("phone")
    check("familielid B ziet GEEN uitbetaalgegevens (owner-only)", (bZietDetails ?? []).length === 0)

    // B mag de routing/status (payout_accounts) wél zien — maar die bevat geen rekeningnummers.
    const { data: bZietAccount } = await B.cli.from("payout_accounts").select("provider, status, country, currency").eq("network_id", net)
    check("familielid B ziet de routing/status wél", (bZietAccount ?? []).some((r) => r.provider === "flutterwave" && r.status === "ready"))
    check("routing bevat geen rekeningnummer-kolommen", (bZietAccount ?? []).every((r) => !("phone" in r) && !("account_number" in r)))
  } finally {
    await opruimen()
  }

  console.log(`\nResultaat payout-privacy: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
