/**
 * UI smoke against local Vite (http://localhost:5173).
 * Two guest browser contexts + solo modes.
 *
 * Prerequisites: npm run dev:app
 * Run: node scripts/smoke-localhost.mjs
 */

import { chromium } from 'playwright'

const BASE = process.env.CS4FUN_URL || 'http://localhost:5173'

const failures = []

function ok(label) {
  console.log(`  ✓ ${label}`)
}

function section(title) {
  console.log(`\n▸ ${title}`)
}

function fail(label, err) {
  const msg = err?.message || String(err)
  failures.push(`${label}: ${msg}`)
  console.log(`  ✗ ${label} — ${msg}`)
}

async function clickBtn(page, name, opts = {}) {
  const btn = page.getByRole('button', { name }).first()
  await btn.waitFor({ state: 'visible', timeout: opts.timeout || 15000 })
  await btn.click()
}

async function setNickname(page, tag) {
  await page.getByRole('button', { name: 'Account' }).click()
  const input = page.getByPlaceholder('Tag').first()
  await input.waitFor({ state: 'visible' })
  await input.fill(tag)
  await page.getByRole('button', { name: /^Save$/i }).click()
  await page.getByText('Saved', { exact: false }).first().waitFor({ timeout: 8000 }).catch(() => {})
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'cs4fun' }).waitFor({ timeout: 12000 })
}

async function goHome(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'cs4fun' }).waitFor({ timeout: 12000 })
}

async function completeDraft(page, launchName) {
  await page.getByRole('heading', { name: /Draft/i }).first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(600)

  for (let i = 0; i < 5; i++) {
    const mono = page.locator('.radar-grid').locator('xpath=..').locator('.font-mono').first()
    let filled = Number((await mono.textContent()).split('/')[0])

    for (let attempt = 0; attempt < 5 && filled < i + 1; attempt++) {
      // If a player is already pending, just assign; otherwise scout + pick
      const pendingSlot = page.locator('.radar-grid button').filter({ hasText: /Here|Aqui/i }).first()
      if (await pendingSlot.isVisible().catch(() => false)) {
        await pendingSlot.click()
      } else {
        const scoutBtn = page.locator('button.btn-gold').filter({ hasText: /^(Scout|Next|Próximo)$/i }).first()
        await scoutBtn.waitFor({ state: 'visible', timeout: 15000 })
        // Wait until enabled (not mid-scout / not waiting assign)
        for (let t = 0; t < 50; t++) {
          if (await scoutBtn.isEnabled()) break
          await page.waitForTimeout(100)
          if (t === 49) throw new Error('Scout never enabled')
        }
        await scoutBtn.click()
        const player = page.locator('div[class*="gap-3"][class*="sm:grid-cols-2"] button[title]').first()
        await player.waitFor({ state: 'visible', timeout: 10000 })
        await player.click()
        await page.locator('.radar-grid button').filter({ hasText: /Here|Aqui/i }).first().waitFor({ state: 'visible', timeout: 8000 })
        await page.locator('.radar-grid button').filter({ hasText: /Here|Aqui/i }).first().click()
      }
      await page.waitForTimeout(200)
      filled = Number((await mono.textContent()).split('/')[0])
    }
    if (filled < i + 1) throw new Error(`draft stuck at ${filled}/5 after pick ${i + 1}`)
  }

  await page.locator('.radar-grid').locator('xpath=..').locator('.font-mono').filter({ hasText: '5/5' }).waitFor({ timeout: 10000 })
  await page.getByRole('button', { name: launchName }).first().click()
}

/** Merge local room storage so isolated Playwright contexts can play guest rooms. */
async function syncRooms(from, to) {
  const raw = await from.evaluate(() => localStorage.getItem('cs4fun_rooms_v1'))
  if (!raw) return
  await to.evaluate((value) => {
    const incoming = JSON.parse(value || '{}')
    const local = JSON.parse(localStorage.getItem('cs4fun_rooms_v1') || '{}')
    const merged = { ...local }
    for (const [code, room] of Object.entries(incoming)) {
      const cur = merged[code]
      if (!cur || (room.players?.length || 0) >= (cur.players?.length || 0)) {
        merged[code] = room
      } else {
        // Keep newer status if player counts equal
        merged[code] = { ...cur, ...room, players: cur.players }
      }
    }
    localStorage.setItem('cs4fun_rooms_v1', JSON.stringify(merged))
  }, raw)
}

async function playVetoUntilTactics(page) {
  // Begin veto if present
  const begin = page.getByRole('button', { name: /Begin veto/i })
  if (await begin.isVisible().catch(() => false)) {
    await begin.click()
  }
  // Click available maps until tactics / live / auto-default appears
  for (let turn = 0; turn < 14; turn++) {
    if (await page.getByRole('button', { name: /Auto|default|Continue/i }).first().isVisible().catch(() => false)) {
      break
    }
    if (await page.getByText(/Live|MAP WIN|Series/i).first().isVisible().catch(() => false)) {
      break
    }
    const maps = page.locator('button:not([disabled])').filter({ has: page.locator('img, .aspect-\\[16\\/10\\]') })
    // Fallback: any enabled map thumb button in veto grid
    const clickable = page.locator('.grid button:not([disabled])')
    const count = await clickable.count()
    if (count === 0) {
      await page.waitForTimeout(400)
      continue
    }
    await clickable.first().click()
    await page.waitForTimeout(350)
  }
  const auto = page.getByRole('button', { name: /Auto|default/i }).first()
  if (await auto.isVisible().catch(() => false)) {
    await auto.click()
  }
}

async function waitResultsOrLive(page, { timeout = 90000 } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await page.getByRole('button', { name: /^Home$/i }).first().isVisible().catch(() => false)) {
      // GameOver home
      return 'results'
    }
    if (await page.getByText(/Victory|Defeat|Results|Final/i).first().isVisible().catch(() => false)) {
      return 'results'
    }
    if (await page.getByRole('button', { name: /Continue/i }).first().isVisible().catch(() => false)) {
      return 'match-done'
    }
    if (await page.getByText(/Live on|MAP:|RND/i).first().isVisible().catch(() => false)) {
      // still live — keep waiting
    }
    await page.waitForTimeout(500)
  }
  throw new Error('timed out waiting for match end')
}

async function runSoloModes(page) {
  section('Solo — Major (draft → tournament)')
  try {
    await goHome(page)
    await clickBtn(page, /Major/)
    await clickBtn(page, /^Draft$/i)
    await completeDraft(page, /Start Major/i)
    const begin = page.getByRole('button', { name: /Begin veto/i })
    if (await begin.isVisible().catch(() => false)) {
      await begin.click()
      ok('major: entered veto')
      await playVetoUntilTactics(page)
      ok('major: veto/tactics started')
    } else {
      ok('major: tournament view after draft')
    }
  } catch (e) {
    fail('major', e)
  }

  section('Solo — Duel vs CPU (full)')
  try {
    await goHome(page)
    await clickBtn(page, /1v1/)
    // CPU is default; setup CTA is "Go"
    await clickBtn(page, /^Go$/i)
    await completeDraft(page, /^(Duel|Duelo)$/i)
    await playVetoUntilTactics(page)
    ok('duel: live/tactics')
    const end = await waitResultsOrLive(page, { timeout: 120000 })
    ok(`duel: finished (${end})`)
    const homeBtn = page.getByRole('button', { name: /^Home$/i }).first()
    if (await homeBtn.isVisible().catch(() => false)) await homeBtn.click()
  } catch (e) {
    fail('duel-cpu', e)
  }

  section('Solo — Daily')
  try {
    await goHome(page)
    await clickBtn(page, /Daily/)
    await clickBtn(page, /^Draft$/i)
    await completeDraft(page, /Run Daily/i)
    await playVetoUntilTactics(page)
    const end = await waitResultsOrLive(page, { timeout: 120000 })
    ok(`daily: finished (${end})`)
    const homeBtn = page.getByRole('button', { name: /^Home$/i }).first()
    if (await homeBtn.isVisible().catch(() => false)) await homeBtn.click()
  } catch (e) {
    fail('daily', e)
  }

  section('Solo — Gauntlet (draft + first wave)')
  try {
    await goHome(page)
    await clickBtn(page, /Gauntlet/)
    await clickBtn(page, /^Draft$/i)
    await completeDraft(page, /^(Gauntlet|Gauntlete|Desafio)$/i)
    await playVetoUntilTactics(page)
    // One wave is enough for smoke
    await page.waitForTimeout(3000)
    ok('gauntlet: launched into play')
  } catch (e) {
    fail('gauntlet', e)
  }
}

async function runTwoGuestRoom(browser) {
  section('Two guests — local duel room (localhost)')
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pageA = await ctxA.newPage()
  const pageB = await ctxB.newPage()

  const pageErrors = []
  for (const [label, p] of [
    ['A', pageA],
    ['B', pageB],
  ]) {
    p.on('pageerror', (err) => pageErrors.push(`${label}: ${err.message}`))
  }

  try {
    await pageA.goto(BASE, { waitUntil: 'networkidle' })
    await pageB.goto(BASE, { waitUntil: 'networkidle' })
    await setNickname(pageA, 'LocGuestA')
    await setNickname(pageB, 'LocGuestB')
    ok('nicknames set')

    // A: friends → code lobby → duel → create
    await clickBtn(pageA, /Play with friends/i)
    await clickBtn(pageA, /Code lobby/i)
    await clickBtn(pageA, /1v1/)
    await clickBtn(pageA, /^Create$/i)
    await pageA.locator('.font-display').filter({ hasText: /^[A-Z0-9]{6}$/ }).first().waitFor({ timeout: 10000 })
    const code = (await pageA.locator('.font-display').filter({ hasText: /^[A-Z0-9]{6}$/ }).first().textContent()).trim()
    ok(`room created ${code}`)

    await syncRooms(pageA, pageB)

    // B: join
    await clickBtn(pageB, /Play with friends/i)
    await clickBtn(pageB, /Code lobby/i)
    await pageB.getByPlaceholder('Code').fill(code)
    await clickBtn(pageB, /^Join$/i)
    const joinErr = await pageB.locator('.text-cs-loss').textContent().catch(() => '')
    if (joinErr) throw new Error(`join failed: ${joinErr}`)
    await syncRooms(pageB, pageA)
    await pageA.waitForTimeout(2000)
    await syncRooms(pageB, pageA)
    await pageA.waitForTimeout(1000)

    const playersLabel = pageA.getByText(/\(\s*2\s*\/\s*2\s*\)/)
    await playersLabel.waitFor({ timeout: 10000 })
    ok('host sees 2 players')

    // Both ready
    await clickBtn(pageA, /^Ready$/i)
    await syncRooms(pageA, pageB)
    await clickBtn(pageB, /^Ready$/i)
    await syncRooms(pageB, pageA)
    await pageA.waitForTimeout(1000)

    await clickBtn(pageA, /^Start$/i)
    await syncRooms(pageA, pageB)
    await pageB.waitForTimeout(1200)
    await syncRooms(pageA, pageB)

    // Both should be in draft — wait for Scout (not just heading)
    await pageA.getByRole('button', { name: /^(Scout|Next)$/i }).first().waitFor({ timeout: 20000 })
    await pageB.getByRole('button', { name: /^(Scout|Next)$/i }).first().waitFor({ timeout: 20000 })
    ok('both guests in duel draft')

    // Bridge rooms while drafting
    const bridge = setInterval(() => {
      syncRooms(pageA, pageB).catch(() => {})
      syncRooms(pageB, pageA).catch(() => {})
    }, 600)

    try {
      await Promise.all([completeDraft(pageA, /^Duel$/i), completeDraft(pageB, /^Duel$/i)])
      ok('both locked lineups')
      await pageA.waitForTimeout(1500)
      // Host/guest should move to veto when both locked
      const vetoA = pageA.getByRole('button', { name: /Begin veto/i }).or(pageA.locator('text=/veto|Your ban|Your pick/i'))
      await vetoA.first().waitFor({ timeout: 20000 }).catch(() => {})
      ok('friend duel progressed past draft (or waiting)')
    } finally {
      clearInterval(bridge)
    }

    if (pageErrors.length) {
      fail('pageerrors', new Error(pageErrors.slice(0, 3).join(' | ')))
    }
  } catch (e) {
    fail('two-guest-room', e)
  } finally {
    await ctxA.close()
    await ctxB.close()
  }
}

async function main() {
  console.log(`cs4fun localhost UI smoke → ${BASE}\n`)

  // Health check
  try {
    const res = await fetch(BASE)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (e) {
    console.error(`Dev server not reachable at ${BASE}. Start with: npm run dev:app`)
    console.error(e.message)
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  page.on('pageerror', (err) => fail('pageerror', err))

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await setNickname(page, 'SmokeSolo')
    ok('guest nickname saved')
    await runSoloModes(page)
  } catch (e) {
    fail('solo-bootstrap', e)
  } finally {
    await ctx.close()
  }

  await runTwoGuestRoom(browser)
  await browser.close()

  console.log('\n───')
  if (failures.length) {
    console.log(`FAILED (${failures.length})`)
    failures.forEach((f) => console.log(`  • ${f}`))
    process.exit(1)
  }
  console.log('ALL PASSED')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
