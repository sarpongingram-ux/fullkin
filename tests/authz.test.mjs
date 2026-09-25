// FULLKIN — negatieve/positieve AUTH-tests voor de discovery- en claim-RPC's (P1.8/1.9/1.10).
//
// Anders dan de andere tests draait dit met ECHTE ingelogde gebruikers (niet service_role),
// want alleen zo kun je de autorisatiegrens bewijzen:
//   * gebruiker B mag NIET met de vantage (me) van gebruiker A diens matches/ontdekkingen/
//     relatiepaden uitlezen (IDOR / cross-family privacy);
//   * B mag geen willekeurige personen koppelen (forged link);
//   * claim_invite dekt ongeldig/verlopen/hergebruikt token en gelijktijdige claims af.
//
// Gebruik:  node --env-file=.env.local tests/authz.test.mjs
// Vereist:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY
// ⚠️  Maakt tijdelijke auth-users (@fullkin.invalid) en TEST-netwerken; ruimt alles op.

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
const check = (naam, cond) => {
  if (cond) { pass++; console.log(`  ✓ ${naam}`) }
  else { fail++; console.log(`  ✗ ${naam}`) }
}

const SUF = Date.now()
const NET = { A: `TEST — authz A ${SUF}`, B: `TEST — authz B ${SUF}`, C: `TEST — authz C ${SUF}`, D: `TEST — authz D ${SUF}` }
const users = []

async function netwerk(naam) {
  const { data, error } = await svc.from("family_networks").insert({ name: naam, home_country: "GH" }).select("id").single()
  if (error) throw new Error("netwerk: " + error.message)
  return data.id
}
async function persoon(net, first, last, extra = {}) {
  const { data, error } = await svc.from("persons").insert({ network_id: net, first_name: first, last_name: last, ...extra }).select("id").single()
  if (error) throw new Error("persoon: " + error.message)
  return data.id
}
async function ouder(net, p, c) {
  const { error } = await svc.from("relationships").insert({ network_id: net, kind: "parent", origin: "biological", from_person: p, to_person: c })
  if (error) throw new Error("ouder: " + error.message)
}
async function maakUser(tag) {
  const email = `authz-${tag}-${SUF}@fullkin.invalid`
  const password = `Test-${SUF}-Aa1!`
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw new Error("createUser: " + error.message)
  const cli = newAnon()
  const { error: se } = await cli.auth.signInWithPassword({ email, password })
  if (se) throw new Error("signIn: " + se.message)
  users.push(data.user.id)
  return { uid: data.user.id, cli }
}

async function opruimen() {
  // begroetingen (niet gedekt door verwijder_testnetwerk) handmatig weg.
  const { data: tp } = await svc.from("persons").select("id").in("network_id",
    (await svc.from("family_networks").select("id").in("name", Object.values(NET))).data?.map((r) => r.id) ?? [])
  const ids = (tp ?? []).map((r) => r.id)
  if (ids.length) {
    await svc.from("begroetingen").delete().or(`van_persoon.in.(${ids.join(",")}),naar_persoon.in.(${ids.join(",")})`)
  }
  for (const n of Object.values(NET)) await svc.rpc("verwijder_testnetwerk", { p_net_naam: n })
  for (const uid of users) await svc.auth.admin.deleteUser(uid).catch(() => {})
}

async function main() {
  await opruimen()
  const A = await maakUser("a")
  const B = await maakUser("b")

  // Familie A (van A): Opa → Kofi → Ingram(=A); Opa → Yaw. Brug Yaw ↔ familie C.
  const na = await netwerk(NET.A)
  const opa = await persoon(na, "Opa", "Kwabena")
  const kofi = await persoon(na, "Kofi", "Kwabena")
  const meA = await persoon(na, "Ingram", "Kwabena", { claimed_by: A.uid })
  const yawA = await persoon(na, "Yaw", "Kwabena")
  await ouder(na, opa, kofi); await ouder(na, opa, yawA); await ouder(na, kofi, meA)

  // Familie C: Yaw (brug) → Michelle; plus Kofi (openstaande kandidaat voor A).
  const nc = await netwerk(NET.C)
  const yawC = await persoon(nc, "Yaw", "Kwabena")
  const michelle = await persoon(nc, "Michelle", "Kwabena")
  await ouder(nc, yawC, michelle)
  const kofiC = await persoon(nc, "Kofi", "Kwabena") // kandidaat ↔ A's Kofi

  // Bevestigde brug Yaw(A) ↔ Yaw(C) → A ontdekt Michelle.
  const [pa1, pb1] = [yawA, yawC].sort()
  await svc.from("person_links").insert({ person_a: pa1, person_b: pb1, confirmed_by: meA })

  // Begroeting gericht aan A (voor mijn_begroetingen-test).
  await svc.from("begroetingen").insert({ van_persoon: michelle, naar_persoon: meA })

  // Familie B (van B): losse persoon, ander netwerk.
  const nb = await netwerk(NET.B)
  await persoon(nb, "Zola", "Banda", { claimed_by: B.uid })

  // Familie D: te claimen profiel + uitnodiger + open invite.
  const nd = await netwerk(NET.D)
  const targetD = await persoon(nd, "Kwame", "Doe")
  const inviterD = await persoon(nd, "Ama", "Doe")
  const mkInvite = async (extra = {}) => {
    const { data, error } = await svc.from("invites").insert({
      network_id: nd, person_id: targetD, invited_by: inviterD,
      channel: "link", destination: "test", status: "open", ...extra,
    }).select("token").single()
    if (error) throw new Error("invite: " + error.message)
    return data.token
  }

  try {
    console.log("\n— NEGATIEF: B mag NIET met A's vantage kijken (IDOR/privacy) —")
    {
      const { data } = await B.cli.rpc("mogelijke_matches", { me: meA })
      check("B krijgt GEEN matches van A", (data ?? []).length === 0)
    }
    {
      const { data } = await B.cli.rpc("ontdekte_familie", { me: meA })
      check("B ontdekt GEEN familie van A (geen Michelle)", (data ?? []).length === 0)
    }
    {
      const { data } = await B.cli.rpc("ontdekt_profiel", { me: meA, p_id: michelle }).maybeSingle()
      check("B krijgt GEEN ontdekt_profiel van A", data == null)
    }
    {
      const { data } = await B.cli.rpc("relatie_pad", { me: meA, other: yawA })
      check("B krijgt GEEN relatie_pad vanuit A", (data ?? []).length === 0)
    }
    {
      const { error } = await B.cli.rpc("relation_route", { me: meA, other: yawA })
      check("B krijgt fout bij relation_route vanuit A", !!error)
    }
    {
      const { data } = await B.cli.rpc("mijn_begroetingen", { me: meA })
      check("B leest GEEN begroetingen van A", (data ?? []).length === 0)
    }
    {
      const { error } = await B.cli.rpc("bevestig_persoon_match", { p_a: yawA, p_b: kofiC })
      check("B kan GEEN vreemde personen koppelen (forged link geweigerd)", !!error)
      const { count } = await svc.from("person_links").select("*", { count: "exact", head: true })
        .or(`and(person_a.eq.${[yawA, kofiC].sort()[0]},person_b.eq.${[yawA, kofiC].sort()[1]})`)
      check("er is GEEN forged link ontstaan", (count ?? 0) === 0)
    }

    console.log("\n— POSITIEF: A werkt gewoon (niet-brekend) —")
    {
      const { data } = await A.cli.rpc("ontdekte_familie", { me: meA })
      check("A ontdekt Michelle", (data ?? []).some((r) => r.ontdekt_id === michelle))
    }
    {
      const { data } = await A.cli.rpc("mogelijke_matches", { me: meA })
      check("A ziet kandidaat Kofi↔Kofi", (data ?? []).some((r) => r.mijn_id === kofi && r.ander_id === kofiC))
    }
    {
      const { data, error } = await A.cli.rpc("relation_route", { me: meA, other: yawA })
      check("A krijgt relation_route (geen fout)", !error && typeof data === "string" && data.length > 0)
    }
    {
      // A mag een ECHTE kandidaat bevestigen.
      const { error } = await A.cli.rpc("bevestig_persoon_match", { p_a: kofi, p_b: kofiC })
      check("A kan een echte kandidaat bevestigen", !error)
      const [x, y] = [kofi, kofiC].sort()
      const { count } = await svc.from("person_links").select("*", { count: "exact", head: true })
        .eq("person_a", x).eq("person_b", y)
      check("de bevestigde link bestaat", (count ?? 0) === 1)
    }
    {
      // A mag GEEN niet-kandidaat koppelen (verschillende namen).
      const { error } = await A.cli.rpc("bevestig_persoon_match", { p_a: meA, p_b: michelle })
      check("A kan GEEN niet-kandidaat koppelen", !!error)
    }

    console.log("\n— CLAIM (P1.10) —")
    {
      const { error } = await A.cli.rpc("claim_invite", { invite_token: "bestaat-niet-" + SUF })
      check("ongeldig token wordt geweigerd", !!error)
    }
    {
      const expired = await mkInvite({ expires_at: new Date(Date.now() - 3600e3).toISOString() })
      const { error } = await A.cli.rpc("claim_invite", { invite_token: expired })
      check("verlopen token wordt geweigerd", !!error)
    }
    {
      // Twee VERSE (nog niet geclaimde) gebruikers racen om hetzelfde token → precies één wint.
      // (claimed_by is globaal uniek, dus A/B — die al een persoon hebben — kunnen niet claimen.)
      const C1 = await maakUser("c1")
      const C2 = await maakUser("c2")
      const tok = await mkInvite()
      const [ra, rb] = await Promise.all([
        C1.cli.rpc("claim_invite", { invite_token: tok }),
        C2.cli.rpc("claim_invite", { invite_token: tok }),
      ])
      const successes = [ra, rb].filter((r) => !r.error).length
      check("gelijktijdige claim: precies één succes", successes === 1)
      const { data: t } = await svc.from("persons").select("claimed_by").eq("id", targetD).single()
      check("doelprofiel is geclaimd door de winnaar", t?.claimed_by === C1.uid || t?.claimed_by === C2.uid)
      // Hergebruik: nogmaals claimen faalt met nette foutmelding (niet een constraint-crash).
      const { error: reuse } = await C2.cli.rpc("claim_invite", { invite_token: tok })
      check("hergebruikt token wordt geweigerd", !!reuse)
    }
  } finally {
    console.log("\nOpruimen…")
    await opruimen()
  }

  console.log(`\nResultaat authz: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error("Testfout:", e.message)
  await opruimen().catch(() => {})
  process.exit(2)
})
