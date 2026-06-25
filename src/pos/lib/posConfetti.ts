const COLORS = ['#c5a367', '#3f3d45', '#10b981', '#f59e0b', '#e8dcc8']

/** Mini confeti DOM (ligero, sin dependencias). */
export function burstPosConfetti(origin?: { x: number; y: number }) {
  const cx = origin?.x ?? window.innerWidth / 2
  const cy = origin?.y ?? window.innerHeight * 0.35
  const layer = document.createElement('div')
  layer.className = 'mc-pos-confetti-layer'
  layer.setAttribute('aria-hidden', 'true')
  document.body.appendChild(layer)

  for (let i = 0; i < 36; i++) {
    const p = document.createElement('span')
    p.className = 'mc-pos-confetti-piece'
    const angle = (Math.PI * 2 * i) / 36 + Math.random() * 0.4
    const dist = 60 + Math.random() * 120
    p.style.left = `${cx}px`
    p.style.top = `${cy}px`
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`)
    p.style.setProperty('--dy', `${Math.sin(angle) * dist - 40}px`)
    p.style.setProperty('--rot', `${Math.random() * 540 - 180}deg`)
    p.style.background = COLORS[i % COLORS.length]!
    p.style.animationDelay = `${Math.random() * 0.12}s`
    layer.appendChild(p)
  }

  window.setTimeout(() => layer.remove(), 1400)
}
