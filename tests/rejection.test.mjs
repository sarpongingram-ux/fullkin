// FULLKIN — persistente match-afwijzing (P1.11).
// Bouwt twee families met een gedeelde naam-kandidaat (ongekoppeld), wijst de match af
// en controleert dat mogelijke_matches het paar NIET opnieuw voorstelt (ook na herhaald
// opvragen) en dat de beslissing is vastgelegd.
//
// Gebruik:  node --env-file=.env.local tests/rejection.test.mjs
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Ontbrekende env"); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (n, c) => { if (c) { pass++; console.log(`  ✓ ${n}`) } else { fail++; console.log(`  ✗ ${n}`) } }

const SUF = Date.now()
const NET = { A: `TEST — reject A ${SUF}`, B: `TEST — reject B ${SUF}` }

async function netwerk(n) { const { data, error } = await db.from("family_networks").insert({ name: n, home_country: "GH" }).select("id").single(); if (error) throw new Error(error.message); return data.id }
async function persoon(net, f, l) { const { data, error } = await db.from("persons").insert({ network_id: net, first_name: f, last_name: l }).select("id").single(); if (error) throw new Error(error.message); return data.id }
async function opruimen() { for (const n of Object.values(NET)) await db.rpc("verwijder_testnetwerk", { p_net_naam: n }) }

async function main() {
  await opruimen()
  const A = await netwerk(NET.A)
  const meA = await persoon(A, "Ama", "Osei")
  const yawA = await persoon(A, "Yaw", "Osei")
  const B = await netwerk(NET.B)
  const yawB = await persoon(B, "Yaw", "Osei")

  try {
    const heeft = async () => {
      const { data } = await db.rpc("mogelijke_matches", { me: meA })
      return (data ?? []).some((r) => r.mijn_id === yawA && r.ander_id === yawB)
    }
    check("kandidaat verschijnt vóór afwijzing", await heeft())

    const { error } = await db.rpc("wijs_match_af", { p_a: yawA, p_b: yawB })
    check("afwijzen lukt", !error)

    check("kandidaat verdwijnt na afwijzing", !(await heeft()))
    check("afwijzing blijft persistent (2e keer opvragen)", !(await heeft()))

    const [a, b] = [yawA, yawB].sort()
    const { data: d } = await db.from("person_match_decisions").select("decision").eq("person_a", a).eq("person_b", b).single()
    check("beslissing is vastgelegd als 'rejected'", d?.decision === "rejected")
  } finally {
    await opruimen()
  }

  console.log(`\nResultaat rejection: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
