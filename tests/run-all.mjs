// FULLKIN — kerntest-runner (P1.5). Draait alle suites sequentieel, telt de ECHT
// uitgevoerde checks uit hun output, en print een eindregel. Exit != 0 als er iets
// mislukt of een suite niet kon draaien (bv. ontbrekende env) — nooit een silent skip.
//
//   CI:     node tests/run-all.mjs               (env-vars staan in de job)
//   lokaal: node --env-file=.env.local tests/run-all.mjs
import { spawnSync } from "node:child_process"

const need = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
const missing = need.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`\n✗ Vereiste testconfiguratie ontbreekt: ${missing.join(", ")}.`)
  console.error("  Kerndatabasetests kunnen niet draaien. Zie TESTING_SETUP.md.")
  process.exit(1) // FAIL — geen silent skip.
}

const suites = [
  ["Relatie-engine", "tests/relatie-engine.test.mjs"],
  ["Discovery", "tests/discovery.test.mjs"],
  ["Claim", "tests/claim.test.mjs"],
  ["Autorisatie (IDOR/privacy/claim-race)", "tests/authz.test.mjs"],
  ["Graph-integriteit + transactionele build", "tests/graph.test.mjs"],
  ["Persistente match-afwijzing", "tests/rejection.test.mjs"],
]

let totPass = 0, totFail = 0, hardFail = false
for (const [label, file] of suites) {
  console.log(`\n════ ${label} — ${file} ════`)
  const r = spawnSync(process.execPath, [file], { encoding: "utf8", env: process.env })
  process.stdout.write(r.stdout ?? "")
  if (r.stderr) process.stderr.write(r.stderr)
  const m = (r.stdout ?? "").match(/Resultaat[^:]*:\s*(\d+)\s+geslaagd,\s*(\d+)\s+mislukt/)
  if (!m) {
    console.error(`  ✗ ${label}: kon geen resultaatregel vinden (exit ${r.status}).`)
    hardFail = true
    continue
  }
  const p = Number(m[1]), f = Number(m[2])
  totPass += p; totFail += f
  if (f > 0 || r.status !== 0) hardFail = true
}

const total = totPass + totFail
const status = !hardFail && totFail === 0 ? "PASS" : "FAIL"
console.log(`\n────────────────────────────────────────`)
console.log(`FULLKIN CORE TESTS: ${status} — ${totPass}/${total} checks executed (${totFail} failed)`)
process.exit(status === "PASS" ? 0 : 1)
