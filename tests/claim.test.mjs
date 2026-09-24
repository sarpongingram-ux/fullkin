// FULLKIN — geautomatiseerde test van de claim-flow (Fase 7).
// Maakt een echte test-authgebruiker, laat die een bestaand placeholder-profiel
// claimen via een invite, en controleert: profiel geclaimd, invite geaccepteerd,
// uitnodiger genotificeerd, en géén tweede profiel in dezelfde familie.
//
// Gebruik:  node --env-file=.env.local tests/claim.test.mjs
// Vereist:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY
// ⚠️  Gebruikt netwerk 'TEST — claim' + een tijdelijke authgebruiker; ruimt beide op.

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !service || !anon) {
  console.error("Ontbrekende env: URL / SERVICE_ROLE_KEY / ANON_KEY")
  process.exit(2)
}
const svc = createClient(url, service, { auth: { persistSession: false } })
const NET = "TEST — claim"
const EMAIL = `claimtest+${Date.now()}@fullkin.test`
const WACHTWOORD = "Test-" + Math.random().toString(36).slice(2) + "A1!"

let pass = 0, fail = 0, userId = null
function check(naam, cond) {
  if (cond) { pass++; console.log(`  ✓ ${naam}`) }
  else { fail++; console.log(`  ✗ ${naam}`) }
}

async function persoon(net, first, last) {
  const { data, error } = await svc.from("persons")
    .insert({ network_id: net, first_name: first, last_name: last }).select("id").single()
  if (error) throw new Error("persoon: " + error.message)
  return data.id
}
async function invite(net, personId, inviterId, token) {
  const { error } = await svc.from("invites").insert({
    network_id: net, person_id: personId, invited_by: inviterId,
    channel: "link", destination: "test", token, status: "open",
  })
  if (error) throw new Error("invite: " + error.message)
}
async function opruimen() {
  await svc.rpc("verwijder_testnetwerk", { p_net_naam: NET })
  if (userId) { try { await svc.auth.admin.deleteUser(userId) } catch {} }
}

async function main() {
  await opruimen()
  console.log("Opzetten: netwerk, placeholders, invites, authgebruiker…")
  const { data: net } = await svc.from("family_networks")
    .insert({ name: NET, home_country: "GH" }).select("id").single()
  const inviter = await persoon(net.id, "James", "Inviter")
  const kwame = await persoon(net.id, "Kwame", "Placeholder")   // te claimen
  const ama = await persoon(net.id, "Ama", "Second")            // voor dup-test
  const token1 = "tok1-" + Date.now()
  const token2 = "tok2-" + Date.now()
  await invite(net.id, kwame, inviter, token1)
  await invite(net.id, ama, inviter, token2)

  const { data: created, error: userErr } =
    await svc.auth.admin.createUser({ email: EMAIL, password: WACHTWOORD, email_confirm: true })
  if (userErr) throw new Error("createUser: " + userErr.message)
  userId = created.user.id

  // Inloggen als de test-gebruiker → geauthenticeerde client.
  const authed = createClient(url, anon, { auth: { persistSession: false } })
  const { error: signErr } = await authed.auth.signInWithPassword({ email: EMAIL, password: WACHTWOORD })
  if (signErr) throw new Error("signIn: " + signErr.message)

  try {
    // A) Claim het placeholder-profiel
    const { data: claimed, error: claimErr } = await authed.rpc("claim_invite", { invite_token: token1 })
    check("claim_invite slaagt", !claimErr && claimed === kwame)

    const { data: kwamePersoon } = await svc.from("persons").select("claimed_by").eq("id", kwame).single()
    check("placeholder is nu geclaimd door de gebruiker", kwamePersoon?.claimed_by === userId)

    const { data: inv1 } = await svc.from("invites").select("status").eq("token", token1).single()
    check("invite staat op 'geaccepteerd'", inv1?.status === "geaccepteerd")

    const { data: notif } = await svc.from("notifications").select("kind")
      .eq("recipient_person_id", inviter).eq("kind", "uitnodiging_geaccepteerd")
    check("uitnodiger is genotificeerd", (notif ?? []).length === 1)

    // B) Duplicaat-preventie: zelfde gebruiker claimt een tweede profiel in dezelfde familie
    const { error: dupErr } = await authed.rpc("claim_invite", { invite_token: token2 })
    check("tweede claim in dezelfde familie wordt geweigerd", !!dupErr)

    const { data: amaPersoon } = await svc.from("persons").select("claimed_by").eq("id", ama).single()
    check("tweede profiel blijft ongeclaimd (geen duplicaat)", amaPersoon?.claimed_by === null)
  } finally {
    console.log("Opruimen…")
    await opruimen()
  }

  console.log(`\nResultaat: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error("Testfout:", e.message)
  opruimen().finally(() => process.exit(2))
})
