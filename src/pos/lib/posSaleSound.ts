const STORAGE_KEY = 'mc-pos-sale-sound'

export function isPosSaleSoundEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v !== 'off'
  } catch {
    return true
  }
}

export function setPosSaleSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

/** Sonido corto de caja registradora (Web Audio API, sin archivo externo). */
export function playPosSaleSound() {
  if (!isPosSaleSoundEnabled()) return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime

    const playTone = (freq: number, start: number, dur: number, gain = 0.08) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(gain, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + dur)
    }

    playTone(880, now, 0.12, 0.1)
    playTone(1174.66, now + 0.1, 0.18, 0.09)
    playTone(1567.98, now + 0.22, 0.25, 0.07)

    window.setTimeout(() => void ctx.close(), 600)
  } catch {
    /* autoplay blocked */
  }
}
