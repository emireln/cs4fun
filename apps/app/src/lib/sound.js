/**
 * Immersive match audio — original Web Audio synthesis (not Valve assets).
 * Low default volume; user can mute in Account.
 */

const STORAGE_KEY = 'cs4fun_sound_enabled'
const MASTER_GAIN = 0.18 // intentionally quiet

let ctx = null
let master = null
let enabled = true
let lastPlay = 0

try {
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === '0') enabled = false
  if (v === '1') enabled = true
} catch {
  /* ignore */
}

function ensureCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = MASTER_GAIN
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function isSoundEnabled() {
  return enabled
}

export function setSoundEnabled(on) {
  enabled = Boolean(on)
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (enabled) ensureCtx()
  return enabled
}

export function unlockAudio() {
  ensureCtx()
}

function tone(freq, dur, type = 'sine', gain = 0.4, when = 0) {
  const c = ensureCtx()
  if (!c || !enabled) return
  const t0 = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g)
  g.connect(master)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

function noiseBurst(dur = 0.08, gain = 0.25, when = 0, filterFreq = 1800) {
  const c = ensureCtx()
  if (!c || !enabled) return
  const t0 = c.currentTime + when
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterFreq
  filter.Q.value = 0.8
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start(t0)
}

/** Short radio squelch — CT-ish (higher) or T-ish (lower) */
export function playRadio(side = 'ct') {
  const base = side === 't' ? 320 : 520
  noiseBurst(0.05, 0.12, 0, base)
  tone(base * 1.4, 0.06, 'square', 0.08, 0.02)
  tone(base * 0.9, 0.08, 'sawtooth', 0.05, 0.04)
}

export function playShot() {
  noiseBurst(0.06, 0.22, 0, 2200)
  tone(180, 0.04, 'triangle', 0.1, 0)
}

export function playAwp() {
  noiseBurst(0.12, 0.28, 0, 900)
  tone(90, 0.15, 'sawtooth', 0.18, 0)
  tone(60, 0.2, 'sine', 0.12, 0.02)
}

export function playBombBeep(urgency = 0) {
  const f = 880 + urgency * 120
  tone(f, 0.05, 'square', 0.12 + urgency * 0.02, 0)
}

export function playBombPlant() {
  playRadio('t')
  for (let i = 0; i < 4; i++) playBombBeep(i * 0.15)
  tone(140, 0.2, 'triangle', 0.1, 0.25)
}

export function playBombDefuse() {
  playRadio('ct')
  tone(660, 0.08, 'sine', 0.1, 0)
  tone(880, 0.12, 'sine', 0.12, 0.1)
  tone(1200, 0.18, 'sine', 0.1, 0.22)
}

let bombInterval = null
export function startBombTimer(seconds = 8) {
  stopBombTimer()
  if (!enabled) return
  let left = seconds
  const tick = () => {
    const urgency = 1 - left / seconds
    playBombBeep(urgency)
    left -= urgency > 0.7 ? 0.35 : 0.7
    if (left <= 0) {
      stopBombTimer()
      // soft boom
      noiseBurst(0.35, 0.3, 0, 200)
      tone(55, 0.4, 'sine', 0.2, 0)
    }
  }
  tick()
  bombInterval = setInterval(tick, 700)
}

export function stopBombTimer() {
  if (bombInterval) {
    clearInterval(bombInterval)
    bombInterval = null
  }
}

export function playRoundWin() {
  stopBombTimer()
  tone(523, 0.12, 'sine', 0.12, 0)
  tone(659, 0.12, 'sine', 0.12, 0.1)
  tone(784, 0.2, 'sine', 0.14, 0.2)
}

export function playRoundLoss() {
  stopBombTimer()
  tone(392, 0.15, 'triangle', 0.1, 0)
  tone(311, 0.25, 'triangle', 0.12, 0.12)
}

export function playAce() {
  playAwp()
  tone(880, 0.1, 'sine', 0.14, 0.15)
  tone(1175, 0.15, 'sine', 0.16, 0.28)
  tone(1568, 0.25, 'sine', 0.14, 0.42)
}

export function playClutch() {
  playRadio('ct')
  tone(440, 0.1, 'sine', 0.1, 0.1)
  tone(554, 0.12, 'sine', 0.12, 0.22)
  tone(659, 0.2, 'sine', 0.14, 0.35)
}

export function playEco() {
  playShot()
  playShot()
  tone(200, 0.08, 'square', 0.06, 0.1)
}

export function playMapWin() {
  playRoundWin()
  tone(1046, 0.3, 'sine', 0.12, 0.45)
}

export function playMapLoss() {
  playRoundLoss()
}

/** Stadium-style crowd roar (filtered noise layers). */
export function playCrowdCheer(duration = 3.6) {
  const c = ensureCtx()
  if (!c || !enabled) return
  const t0 = c.currentTime

  const layers = [
    { freq: 420, q: 0.55, gain: 0.22, pan: -0.35 },
    { freq: 780, q: 0.7, gain: 0.16, pan: 0.2 },
    { freq: 1200, q: 0.9, gain: 0.1, pan: 0.45 },
  ]

  for (const layer of layers) {
    const len = Math.floor(c.sampleRate * (duration + 0.4))
    const buf = c.createBuffer(1, len, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      const env = Math.min(1, i / (c.sampleRate * 0.35)) * Math.min(1, (len - i) / (c.sampleRate * 0.9))
      const wobble = 0.75 + 0.25 * Math.sin(i / 900) + 0.12 * Math.sin(i / 220)
      data[i] = (Math.random() * 2 - 1) * env * wobble
    }
    const src = c.createBufferSource()
    src.buffer = buf
    const filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = layer.freq
    filter.Q.value = layer.q
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(layer.gain, t0 + 0.25)
    g.gain.setValueAtTime(layer.gain * 0.85, t0 + duration * 0.55)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

    let node = filter
    src.connect(filter)
    if (c.createStereoPanner) {
      const panner = c.createStereoPanner()
      panner.pan.value = layer.pan
      filter.connect(panner)
      node = panner
    }
    node.connect(g)
    g.connect(master)
    src.start(t0)
    src.stop(t0 + duration + 0.05)
  }

  // Sparse “whoops” — short tonal chirps in the roar
  for (let i = 0; i < 7; i++) {
    const when = 0.2 + i * 0.38 + Math.random() * 0.12
    tone(520 + Math.random() * 480, 0.08 + Math.random() * 0.06, 'triangle', 0.04, when)
  }
}

/** Brass-ish victory bugle / fanfare (original synthesis). */
export function playVictoryBugle() {
  const c = ensureCtx()
  if (!c || !enabled) return

  const phrase = [
    { f: 392, d: 0.14, g: 0.14 }, // G4
    { f: 523.25, d: 0.14, g: 0.15 }, // C5
    { f: 659.25, d: 0.14, g: 0.16 }, // E5
    { f: 783.99, d: 0.28, g: 0.18 }, // G5
    { f: 659.25, d: 0.12, g: 0.12 }, // E5
    { f: 783.99, d: 0.14, g: 0.15 }, // G5
    { f: 1046.5, d: 0.55, g: 0.2 }, // C6
  ]

  let t = 0.08
  for (const n of phrase) {
    // Detuned pair ≈ brass
    tone(n.f, n.d, 'sawtooth', n.g * 0.55, t)
    tone(n.f * 1.002, n.d, 'square', n.g * 0.28, t)
    tone(n.f * 0.5, n.d * 0.9, 'triangle', n.g * 0.2, t)
    t += n.d * 0.92
  }

  // Final flourish
  tone(1318.5, 0.35, 'sine', 0.12, t + 0.05)
  tone(1568, 0.45, 'sine', 0.1, t + 0.12)
}

/** Flawless Major celebration — crowd + bugle with confetti. */
export function playPerfectWin() {
  if (!enabled) return
  unlockAudio()
  playVictoryBugle()
  playCrowdCheer(4.2)
  // Soft gold shimmer after the fanfare peak
  tone(1046, 0.4, 'sine', 0.08, 1.1)
  tone(1318, 0.5, 'sine', 0.07, 1.35)
}

/**
 * Box Battle rare land — original synth (not Valve assets).
 * classified → soft shimmer · covert → red hit · gold (knife/gloves) → jackpot
 */
export function playBoxRareDrop(rarity = 'classified') {
  if (!enabled) return
  unlockAudio()
  const now = Date.now()
  if (now - lastPlay < 80) return
  lastPlay = now

  if (rarity === 'gold') {
    // Deep thud + rising gold cascade
    noiseBurst(0.18, 0.22, 0, 420)
    tone(90, 0.22, 'sine', 0.16, 0)
    tone(180, 0.18, 'triangle', 0.1, 0.04)
    const cascade = [523, 659, 784, 988, 1175, 1568]
    cascade.forEach((f, i) => {
      tone(f, 0.14 + i * 0.02, 'sine', 0.1 - i * 0.008, 0.12 + i * 0.07)
      tone(f * 1.01, 0.1, 'triangle', 0.04, 0.14 + i * 0.07)
    })
    noiseBurst(0.35, 0.14, 0.45, 2400)
    tone(2093, 0.55, 'sine', 0.09, 0.55)
    return
  }

  if (rarity === 'covert') {
    noiseBurst(0.12, 0.2, 0, 700)
    tone(140, 0.16, 'sawtooth', 0.12, 0)
    tone(880, 0.1, 'sine', 0.12, 0.08)
    tone(1175, 0.14, 'sine', 0.14, 0.18)
    tone(1480, 0.28, 'sine', 0.11, 0.3)
    noiseBurst(0.2, 0.1, 0.22, 1800)
    return
  }

  // classified
  noiseBurst(0.08, 0.12, 0, 1100)
  tone(740, 0.1, 'sine', 0.1, 0)
  tone(932, 0.12, 'sine', 0.11, 0.09)
  tone(1108, 0.22, 'triangle', 0.1, 0.2)
}

/** Soft tick while the reel spins (optional, throttled). */
export function playBoxReelTick() {
  if (!enabled) return
  const now = Date.now()
  if (now - lastPlay < 55) return
  lastPlay = now
  tone(220 + Math.random() * 80, 0.03, 'square', 0.035, 0)
}

export function playMatchEvent(type, text = '') {
  if (!enabled) return
  const now = Date.now()
  if (now - lastPlay < 40) return
  lastPlay = now

  const lower = String(text).toLowerCase()

  switch (type) {
    case 'ace':
      playAce()
      break
    case 'clutch':
      playClutch()
      break
    case 'eco':
      playEco()
      break
    case 'multikill':
      playShot()
      setTimeout(playShot, 60)
      setTimeout(playAwp, 140)
      break
    case 'mapwin':
      playMapWin()
      break
    case 'maploss':
      playMapLoss()
      break
    case 'halftime':
      playRadio('ct')
      break
    case 'tactical':
      playRadio(Math.random() > 0.5 ? 'ct' : 't')
      break
    case 'mvp':
      playMapWin()
      break
    case 'round':
      if (/plant|bomb down|c4/i.test(lower)) {
        playBombPlant()
        startBombTimer(7)
      } else if (/defus/i.test(lower)) {
        stopBombTimer()
        playBombDefuse()
      } else if (/awp|snipe/i.test(lower)) {
        playAwp()
      } else if (/win|take|convert/i.test(lower)) {
        playRoundWin()
      } else if (/lose|lost|fail/i.test(lower)) {
        playRoundLoss()
      } else {
        playShot()
        if (Math.random() > 0.55) setTimeout(() => playRadio(Math.random() > 0.5 ? 'ct' : 't'), 80)
      }
      break
    case 'series':
      playMapWin()
      break
    case 'system':
      if (/overtime/i.test(lower)) {
        tone(700, 0.1, 'square', 0.1, 0)
        tone(900, 0.15, 'square', 0.12, 0.12)
      }
      break
    default:
      playShot()
  }
}
