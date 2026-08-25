import { getNorrisPeekMetrics } from '@/landing/norris/norrisPeekLayout'

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

export type StoreCardLayout = {
  mode: 'fixed'
  left: number
  top: number
  width: number
  transform: string
  opacity: number
  zIndex: number
}

export function getStoreCardLayout(
  index: number,
  morph: number,
  slideIndex: number,
  stageRect: DOMRect | null,
): StoreCardLayout {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const mobile = vw < 768
  const t = clamp(morph, 0, 1)

  const peek = getNorrisPeekMetrics(vw, vh, index)

  const distance = index - slideIndex
  const absDistance = Math.abs(distance)

  const stageCX = stageRect ? stageRect.left + stageRect.width / 2 : vw / 2
  const stageCY = stageRect ? stageRect.top + stageRect.height / 2 : vh * 0.58
  const spread = mobile ? 68 : 96
  const carouselX = stageCX + distance * spread
  const carouselY = stageCY
  const carouselScale = Math.max(0.84, 1 - absDistance * 0.07)
  const carouselRotate = distance * 0.85
  const carouselWidth = Math.min(vw * 0.78, 520)
  const carouselOpacity = Math.max(0.38, 1 - absDistance * 0.28)

  const carouselMix = smoothstep(clamp((t - 0.72) / 0.28, 0, 1))

  const width = lerp(peek.width, carouselWidth, t)
  const rotate = lerp(peek.rotate, carouselRotate, carouselMix)
  const scale = lerp(1, carouselScale, carouselMix)
  const opacity = lerp(1, carouselOpacity, carouselMix)
  const zIndex = Math.round(lerp(peek.z, 24 - absDistance * 3, carouselMix))

  const left = lerp(peek.x, carouselX, carouselMix)
  const top = lerp(peek.y, carouselY, carouselMix)

  const transform = `translate3d(-50%, -50%, 0) rotate(${rotate}deg) scale(${scale})`

  return {
    mode: 'fixed',
    left,
    top,
    width,
    transform,
    opacity,
    zIndex: zIndex + 18,
  }
}
