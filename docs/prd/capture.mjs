/* Takes the screenshots the PRD embeds, from the running application.
 *
 *   npm run dev -- --port 5180
 *   node docs/prd/capture.mjs
 *
 * Every shot signs in as a real seeded account, so what the PDF shows is what
 * that role sees. A shot that fails is reported and skipped; the build then
 * says exactly which figures are missing rather than shipping a blank. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = new URL('./img/', import.meta.url).pathname
const BASE = process.env.BASE_URL ?? 'http://localhost:5180'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input#email', email)
  await page.fill('input#password', 'Gemilang#2026')
  await page.locator('button[type=submit]').click()
  await page.waitForTimeout(1500)
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 })
const p = await ctx.newPage()
p.setDefaultTimeout(6000)
await login(p, 'hendra.wijayanto@tatagemilang.co.id')

/* the floating table-style control would sit on top of every register */
const tableStyle = (mode) =>
  p.evaluate((m) => localStorage.setItem('tata-gemilang-table-style', JSON.stringify({ state: { mode: m, x: null, y: null, collapsed: true }, version: 0 })), mode)
await tableStyle('detailed')

const ids = await p.evaluate(async () => {
  const { useErp } = await import('/src/store/useErp.ts')
  const s = useErp.getState()
  const withDeductions = s.invoices
    .filter((i) => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID')
    .map((i) => ({ id: i.id, n: i.lines.filter((l) => l.kind === 'DEDUCTION').length }))
    .sort((a, b) => b.n - a.n)[0]
  return {
    session: s.mrSessions.find((x) => x.status === 'OPEN')?.id,
    pr: s.purchaseRequests.find((x) => x.status === 'DRAFT')?.id,
    po: s.purchaseOrders.find((x) => x.code === 'PO-2026-0007')?.id,
    invoice: withDeductions?.id,
    project: s.projects.find((x) => x.status === 'ACTIVE')?.id,
  }
})
console.log('records:', ids)

async function shot(name, path, after) {
  try {
    await p.goto(BASE + path, { waitUntil: 'networkidle' })
    await p.waitForTimeout(900)
    if (after) await after()
    await p.screenshot({ path: `${OUT}${name}.png` })
    console.log('ok  ', name)
  } catch (e) { console.log('FAIL', name, String(e.message).split('\n')[0]) }
}
const tab = (re) => async () => { await p.locator('[data-slot=tab]').filter({ hasText: re }).first().click(); await p.waitForTimeout(500) }

await shot('dashboard', '/')
await shot('project-detail', `/projects/${ids.project}`)
await shot('stock-transfers', '/inventory/transfers')
await shot('mr-session', `/mr/${ids.session}`)
await shot('pr-finalcheck', `/purchase-requests/${ids.pr}`, tab(/Final check/i))
await shot('po-detail', `/purchase-orders/${ids.po}`)
await shot('invoice-detail', `/invoices/${ids.invoice}`)
await shot('finance', '/finance')
await shot('users', '/admin/users')
await shot('roles', '/admin/roles')

await tableStyle('relaxed')
await shot('po-relaxed', '/purchase-orders', async () => { await p.locator('table tbody button[aria-expanded]').first().click(); await p.waitForTimeout(400) })
await tableStyle('detailed')

try {
  await p.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await p.locator('[data-slot=tab]').filter({ hasText: 'Interface' }).first().click()
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${OUT}settings-interface.png` })
  console.log('ok   settings-interface')
  await p.getByRole('radio', { name: /Classic/ }).click()
  await p.waitForTimeout(500)
} catch (e) { console.log('FAIL settings-interface', String(e.message).split('\n')[0]) }
await shot('classic-po', '/purchase-orders')
await p.evaluate(() => localStorage.setItem('tata-gemilang-interface', JSON.stringify({ state: { style: 'modern' }, version: 0 })))

/* the division head, on a phone */
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const m = await phone.newPage()
m.setDefaultTimeout(6000)
try {
  await login(m, 'nurhayati.dewi@tatagemilang.co.id')
  await m.goto(`${BASE}/mr/my`, { waitUntil: 'networkidle' })
  await m.waitForTimeout(900)
  await m.screenshot({ path: `${OUT}phone-top.png` })
  await m.evaluate(() => document.querySelector('main').scrollBy(0, 760))
  await m.waitForTimeout(400)
  await m.screenshot({ path: `${OUT}phone-lines.png` })
  await m.locator('button[aria-label="Open the menu"]').click()
  await m.waitForTimeout(400)
  await m.screenshot({ path: `${OUT}phone-drawer.png` })
  console.log('ok   phone x3')
} catch (e) { console.log('FAIL phone', String(e.message).split('\n')[0]) }

await browser.close()
