import { test, expect } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

// Live audit tegen https://fullkin.vercel.app. Credentials via env (nooit committen):
//   FULLKIN_DEMO_EMAIL, FULLKIN_DEMO_PASSWORD
const EMAIL = process.env.FULLKIN_DEMO_EMAIL
const PASSWORD = process.env.FULLKIN_DEMO_PASSWORD
const OUT = "audit/live-2026-09-24"

test("Fullkin live end-to-end audit", async ({ page }, testInfo) => {
  test.skip(!EMAIL || !PASSWORD, "Zet FULLKIN_DEMO_EMAIL / FULLKIN_DEMO_PASSWORD")
  const vp = testInfo.project.name // 'mobile' | 'desktop'
  const dir = path.join(OUT, vp)
  fs.mkdirSync(dir, { recursive: true })
  const shot = (name: string) => page.screenshot({ path: path.join(dir, name), fullPage: true })

  // Console- en netwerkfouten verzamelen.
  const consoleErrors: { type: string; text: string }[] = []
  const networkErrors: { url: string; status: number; method: string }[] = []
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      consoleErrors.push({ type: m.type(), text: m.text().slice(0, 300) })
  })
  page.on("response", (r) => {
    if (r.status() >= 400)
      networkErrors.push({ url: r.url().split("?")[0], status: r.status(), method: r.request().method() })
  })
  const timings: Record<string, number> = {}
  const meet = async (label: string, fn: () => Promise<unknown>) => {
    const t0 = Date.now()
    await fn()
    timings[label] = Date.now() - t0
  }

  // 3. LOGIN — eerste indruk vóór login
  await meet("eerste_navigatie", async () => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
  })
  await shot("00-landing.png")
  await page.goto("/inloggen", { waitUntil: "domcontentloaded" })
  await shot("01-login.png")

  await meet("login_tot_home", async () => {
    await page.locator('input[type="email"]').fill(EMAIL!)
    await page.locator('input[type="password"]').fill(PASSWORD!)
    await page.getByRole("button", { name: "Inloggen", exact: true }).click()
    await page.waitForURL("**/app", { timeout: 30_000 })
    await page.waitForLoadState("networkidle").catch(() => {})
  })
  await shot("02-home.png")

  // 4. THUIS
  await expect.soft(page.getByText(/krijgt vorm/i), "magic moment op home").toBeVisible()
  const groterBanner = page.getByText(/groter geworden/i)
  await expect.soft(groterBanner, "'je familie is groter geworden'-banner").toBeVisible()

  // 5. ONTDEK — Michelle
  await meet("open_ontdek", async () => {
    await page.getByRole("link", { name: /Ontdek/i }).first().click()
    await page.waitForURL("**/app/ontdek", { timeout: 20_000 })
    await page.waitForLoadState("networkidle").catch(() => {})
  })
  await shot("03-discover.png")
  await expect.soft(page.getByText("Michelle Boateng"), "Michelle zichtbaar op Ontdek").toBeVisible()

  await meet("open_michelle", async () => {
    // Klik de 'Bekijk'-link in Michelle's eigen rij (robuust bij meerdere ontdekten).
    const michelleRij = page.locator("li", { hasText: "Michelle Boateng" })
    const bekijk = michelleRij.getByRole("link", { name: /Bekijk/i })
    if (await bekijk.count()) await bekijk.first().click()
    else await page.getByRole("link", { name: /Bekijk/i }).first().click()
    await page.waitForURL("**/app/ontdek/**", { timeout: 20_000 })
    await page.waitForLoadState("networkidle").catch(() => {})
  })
  await shot("04-michelle-profile.png")
  await expect.soft(page.getByText(/Hoe zijn jullie familie/i), "relatie-uitleg op Michelle-profiel").toBeVisible()
  await expect.soft(page.getByRole("heading", { name: /Michelle/i }), "Michelle-naam op profiel").toBeVisible()
  await expect.soft(page.getByText(/Jij →/), "node-voor-node relatiepad").toBeVisible()
  await shot("05-michelle-path.png")

  // 6 + 7. Kojo-match bevestigen → David ontdekken (alleen mobiel; muteert demo-data)
  if (vp === "mobile") {
    await page.getByRole("link", { name: /Ontdek/i }).first().click()
    await page.waitForURL("**/app/ontdek", { timeout: 20_000 })
    await page.waitForLoadState("networkidle").catch(() => {})
    await expect.soft(page.getByText("Kojo Mensah").first(), "Kojo als mogelijke match").toBeVisible()
    await shot("06-kojo-before.png")

    await meet("bevestig_match", async () => {
      await page.getByRole("button", { name: /Ja, dezelfde persoon/i }).first().click()
      await page.waitForLoadState("networkidle").catch(() => {})
      await page.waitForTimeout(1500)
    })
    await shot("07-kojo-after.png")

    // David moet nu ontdekt zijn. NIET stil aannemen.
    const david = page.getByText(/David/).first()
    await expect.soft(david, "David verschijnt na bevestiging van Kojo").toBeVisible()
    await shot("08-david-discovered.png")
  }

  // 8. FAMILIE
  await meet("open_familie", async () => {
    await page.getByRole("link", { name: /Familie/i }).first().click()
    await page.waitForURL("**/app/familie", { timeout: 20_000 })
    await page.waitForLoadState("networkidle").catch(() => {})
  })
  await shot("09-familie.png")
  // Open een familielid en controleer de relatie-uitleg.
  const persoonLink = page.getByRole("link", { name: /Kwesi|Efua|Yaw|Akua|Opa/i }).first()
  if (await persoonLink.count()) {
    await persoonLink.click()
    await page.waitForURL("**/app/persoon/**", { timeout: 20_000 }).catch(() => {})
    await page.waitForLoadState("networkidle").catch(() => {})
    await shot("10-persoon-relatie.png")
    await expect.soft(page.getByText(/Hoe zijn jullie familie/i), "relatie-uitleg op persoonsprofiel").toBeVisible()
  }

  // 9. Mobile overflow-check
  if (vp === "mobile") {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect.soft(overflow, "geen horizontale overflow (px)").toBeLessThanOrEqual(2)
  }

  // 10. Bewijs wegschrijven
  fs.writeFileSync(path.join(dir, "console-errors.json"), JSON.stringify(consoleErrors, null, 2))
  fs.writeFileSync(path.join(dir, "network-errors.json"), JSON.stringify(networkErrors, null, 2))
  fs.writeFileSync(path.join(dir, "timings.json"), JSON.stringify(timings, null, 2))
})
