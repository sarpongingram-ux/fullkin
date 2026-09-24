// FULLKIN — geautomatiseerde test van matching + cross-family discovery.
// Bouwt twee families die dezelfde persoon (een "brug") delen, en controleert:
//   mogelijke_matches → koppeling → ontdekte_familie → ontdekt_profiel (privacy).
//
// Gebruik:  node --env-file=.env.local tests/discovery.test.mjs
// ⚠️  Gebruikt genamespacete netwerken 'TEST — disc …' en ruimt ze op.

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Ontbrekende env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(2)
}
const db = createClient(url, key, { auth: { persistSession: false } })
const NET_A = "TEST — disc A"
const NET_B = "TEST — disc B"

let pass = 0, fail = 0
function check(naam, cond) {
  if (cond) { pass++; console.log(`  ✓ ${naam}`) }
  else { fail++; console.log(`  ✗ ${naam}`) }
}

async function netwerk(naam) {
  const { data, error } = await db.from("family_networks").insert({ name: naam, home_country: "GH" }).select("id").single()
  if (error) throw new Error("netwerk: " + error.message)
  return data.id
}
async function persoon(net, first, last) {
  const { data, error } = await db.from("persons").insert({ network_id: net, first_name: first, last_name: last }).select("id").single()
  if (error) throw new Error("persoon: " + error.message)
  return data.id
}
async function ouder(net, p, c) {
  const { error } = await db.from("relationships").insert({ network_id: net, kind: "parent", origin: "biological", from_person: p, to_person: c })
  if (error) throw new Error("ouder: " + error.message)
}

async function opruimen() {
  await db.rpc("verwijder_testnetwerk", { p_net_naam: NET_A })
  await db.rpc("verwijder_testnetwerk", { p_net_naam: NET_B })
}

async function main() {
  await opruimen() // schone start
  console.log("Bouwen: twee families die 'Yaw Mensah' delen…")

  // Familie A: Ingram, vader Kofi, oom Yaw (Kofi & Yaw delen ouder Opa)
  const A = await netwerk(NET_A)
  const opa = await persoon(A, "Opa", "Mensah")
  const kofi = await persoon(A, "Kofi", "Mensah")
  const ingram = await persoon(A, "Ingram", "Mensah")
  const yawA = await persoon(A, "Yaw", "Mensah")
  await ouder(A, opa, kofi); await ouder(A, opa, yawA); await ouder(A, kofi, ingram)

  // Familie B: Michelle, vader Yaw (dezelfde mens als oom Yaw in A)
  const B = await netwerk(NET_B)
  const yawB = await persoon(B, "Yaw", "Mensah")
  const michelle = await persoon(B, "Michelle", "Mensah")
  await ouder(B, yawB, michelle)

  try {
    // 1) Matching herkent Yaw(A) ↔ Yaw(B)
    const { data: matches } = await db.rpc("mogelijke_matches", { me: ingram })
    const m = (matches ?? []).find((r) => r.mijn_id === yawA && r.ander_id === yawB)
    check("mogelijke_matches herkent de gedeelde persoon Yaw", !!m)

    // 2) Koppelen (bevestigde match) — direct als service role
    const [pa, pb] = [yawA, yawB].sort()
    const { error: linkErr } = await db.from("person_links").insert({ person_a: pa, person_b: pb, confirmed_by: ingram })
    check("koppeling opslaan lukt", !linkErr)

    // 3) ontdekte_familie toont Michelle met correct pad
    const { data: ontdekt } = await db.rpc("ontdekte_familie", { me: ingram })
    const o = (ontdekt ?? []).find((r) => r.ontdekt_id === michelle)
    check("ontdekte_familie bevat Michelle", !!o)
    check("mijn kant = oom of tante", o?.mijn_kant === "oom of tante")
    check("hun kant = kind", o?.hun_kant === "kind")

    // 4) ontdekt_profiel geeft naam/pad maar GEEN privé-velden
    const { data: prof } = await db.rpc("ontdekt_profiel", { me: ingram, p_id: michelle }).single()
    check("ontdekt_profiel geeft Michelle terug", prof?.voornaam === "Michelle")
    check("ontdekt_profiel lekt geen geboortedatum", prof && !("born_on" in prof) && !("geboortedatum" in prof))

    // 5) Na koppeling geen dubbele match meer
    const { data: matches2 } = await db.rpc("mogelijke_matches", { me: ingram })
    const nog = (matches2 ?? []).find((r) => r.mijn_id === yawA && r.ander_id === yawB)
    check("match verdwijnt na bevestiging", !nog)
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
