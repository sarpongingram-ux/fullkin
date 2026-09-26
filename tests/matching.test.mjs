// FULLKIN — matching-confidence (score, drempel, fuzzy, rangschikking).
// Bouwt twee families met diverse kandidaat-paren en controleert de scores/volgorde en
// dat zwakke/tegenstrijdige paren wegvallen.
//
// Gebruik:  node --env-file=.env.local tests/matching.test.mjs
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("Ontbrekende env"); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (n, c) => { if (c) { pass++; console.log(`  ✓ ${n}`) } else { fail++; console.log(`  ✗ ${n}`) } }

const SUF = Date.now()
const NET = { A: `TEST — match A ${SUF}`, B: `TEST — match B ${SUF}` }

async function netwerk(n) { const { data, error } = await db.from("family_networks").insert({ name: n, home_country: "GH" }).select("id").single(); if (error) throw new Error(error.message); return data.id }
async function persoon(net, f, l, extra = {}) { const { data, error } = await db.from("persons").insert({ network_id: net, first_name: f, last_name: l, ...extra }).select("id").single(); if (error) throw new Error(error.message); return data.id }
async function opruimen() { for (const n of Object.values(NET)) await db.rpc("verwijder_testnetwerk", { p_net_naam: n }) }

async function main() {
  await opruimen()
  const A = await netwerk(NET.A)
  const B = await netwerk(NET.B)
  const anchor = await persoon(A, "Kwesi", "Anker") // bepaalt 'me'-netwerk

  // 1) exact zonder geboortedatum
  const yawA = await persoon(A, "Yaw", "Mensah")
  const yawB = await persoon(B, "Yaw", "Mensah")
  // 2) exact + zelfde geboortedatum (sterk)
  const amaA = await persoon(A, "Ama", "Boateng", { born_on: "1990-01-01" })
  const amaB = await persoon(B, "Ama", "Boateng", { born_on: "1990-01-01" })
  // 3) zelfde naam, duidelijk andere geboortedatum → moet wegvallen
  const kofiA = await persoon(A, "Kofi", "Adjei", { born_on: "1980-01-01" })
  const kofiB = await persoon(B, "Kofi", "Adjei", { born_on: "1960-01-01" })
  // 4) fuzzy: typefout in achternaam + zelfde geboortedatum → wél kandidaat
  const efuaA = await persoon(A, "Efua", "Mensah", { born_on: "1995-05-05" })
  const efuaB = await persoon(B, "Efua", "Mensa", { born_on: "1995-05-05" })

  try {
    const { data } = await db.rpc("mogelijke_matches", { me: anchor })
    const rows = data ?? []
    const paar = (mp, op) => rows.find((r) => r.mijn_id === mp && r.ander_id === op)

    const yaw = paar(yawA, yawB)
    check("exact zonder geboortedatum verschijnt", !!yaw)
    check("exacte naam scoort ~55", yaw && yaw.score >= 45 && yaw.score <= 70)
    check("reden bevat 'Zelfde naam'", yaw && /Zelfde naam/.test(yaw.signaal))

    const ama = paar(amaA, amaB)
    check("exact + zelfde geboortedatum verschijnt", !!ama)
    check("naam + geboortedatum scoort hoog (>=80)", ama && ama.score >= 80)
    check("reden bevat 'zelfde geboortedatum'", ama && /zelfde geboortedatum/.test(ama.signaal))

    check("zelfde naam maar andere geboortedatum valt WEG", !paar(kofiA, kofiB))

    const efua = paar(efuaA, efuaB)
    check("fuzzy naam (typefout) + geboortedatum verschijnt", !!efua)
    check("fuzzy reden bevat 'Vergelijkbare naam'", efua && /Vergelijkbare naam/.test(efua.signaal))

    // rangschikking: aflopend op score
    const gesorteerd = rows.every((r, i) => i === 0 || rows[i - 1].score >= r.score)
    check("resultaten zijn gesorteerd op confidence (aflopend)", gesorteerd)
    check("sterkste match (Ama) staat vóór de zwakkere (Yaw)",
      rows.findIndex((r) => r.ander_id === amaB) < rows.findIndex((r) => r.ander_id === yawB))
  } finally {
    await opruimen()
  }

  console.log(`\nResultaat matching: ${pass} geslaagd, ${fail} mislukt.`)
  process.exit(fail === 0 ? 0 : 1)
}
main().catch(async (e) => { console.error("Testfout:", e.message); await opruimen().catch(() => {}); process.exit(2) })
