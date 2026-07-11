/**
 * Headless smoke checks for engagement + mode foundations.
 * Run: node scripts/smoke-engagement.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

let failed = 0
function ok(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`)
  else {
    failed += 1
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('Smoke: i18n keys')
const en = readFileSync(join(root, 'apps/app/src/i18n/en.js'), 'utf8')
const pt = readFileSync(join(root, 'apps/app/src/i18n/pt-BR.js'), 'utf8')
for (const key of [
  'modes.survivor',
  'challenges:',
  'cosmetics:',
  'survivor:',
  'guestNudgeTitle',
  'cursedCap',
  'caseOfWeekTag',
]) {
  const needle = key.includes('.') || key.endsWith(':') ? key.split('.').pop() : key
  ok(`en has ${key}`, en.includes(needle === key ? key : key.includes(':') ? key : needle))
  ok(`pt has ${key}`, pt.includes(needle === key ? key : key.includes(':') ? key : needle))
}
ok('en has no auction mode', !en.includes("auction: { title:"))
ok('pt has no auction mode', !pt.includes("auction: { title:"))

console.log('Smoke: StatusBar currency removed')
const statusBar = readFileSync(join(root, 'apps/app/src/components/StatusBar.jsx'), 'utf8')
ok('no setCurrency in StatusBar', !statusBar.includes('setCurrency'))
ok('no currency button label usage in StatusBar', !statusBar.includes("t('nav.currency')"))

console.log('Smoke: Party onNeedAuth')
const party = readFileSync(join(root, 'apps/app/src/components/modes/PartyGame.jsx'), 'utf8')
ok('Party accepts onNeedAuth', party.includes('onNeedAuth'))
ok('Party forwards onNeedAuth', party.includes('onNeedAuth={onNeedAuth}'))
ok('Party recordFriendMatch', party.includes('recordFriendMatch'))

console.log('Smoke: App routes')
const app = readFileSync(join(root, 'apps/app/src/App.jsx'), 'utf8')
for (const mode of ['gauntlet', 'survivor', 'major', 'duel', 'party', 'daily', 'box', 'career']) {
  ok(`App screen ${mode}`, app.includes(`screen === '${mode}'`))
}
ok('App has no auction screen', !app.includes("screen === 'auction'"))
ok('App has no AuctionGame import', !app.includes('AuctionGame'))

console.log('Smoke: schema allow-lists')
const schema = readFileSync(join(root, 'supabase/schema.sql'), 'utf8')
ok('rooms rematch status', schema.includes("'rematch'"))
ok('survivor still allowed', schema.includes("'survivor'"))

console.log('Smoke: critical files exist')
for (const rel of [
  'apps/app/src/lib/challenges.js',
  'apps/app/src/lib/cosmetics.js',
  'apps/app/src/lib/cursedCap.js',
  'apps/app/src/lib/friendWeek.js',
  'apps/app/src/lib/matchHighlight.js',
  'apps/app/src/lib/lastMatchLog.js',
  'apps/app/src/components/WeeklyChallenges.jsx',
  'apps/app/src/components/modes/SurvivorGame.jsx',
  'apps/app/src/components/modes/GauntletGame.jsx',
  'supabase/migrations/20260711210000_auction_survivor_rematch.sql',
]) {
  ok(rel, existsSync(join(root, rel)))
}
ok('AuctionGame removed', !existsSync(join(root, 'apps/app/src/components/modes/AuctionGame.jsx')))

console.log('Smoke: Profile currency toggle present')
const profile = readFileSync(join(root, 'apps/app/src/components/ProfilePage.jsx'), 'utf8')
ok('Profile has setCurrency/toggleCurrency', profile.includes('toggleCurrency') || profile.includes('setCurrency'))

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll smoke checks passed')
