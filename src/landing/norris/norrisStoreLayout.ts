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

function snapPx(v: number, mobile: boolean) {
  return mobile ? Math.round(v) : Math.round(v * 10) / 10
}

function snapScale(v: number) {
  return Math.round(v * 1000) / 1000
}

export type StoreCardLayout = {
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

  const carouselMix = smoothstep(clamp((t - 0.72) / 0.28, 0, 1))

  // En mobile el rect del stage “salta” con scroll sticky → ancla estable al viewport
  const stageCX =
    mobile || !stageRect || carouselMix > 0.35
      ? vw / 2
      : stageRect.left + stageRect.width / 2
  const stageCY =
    mobile || !stageRect || carouselMix > 0.35
      ? vh * (mobile ? 0.54 : 0.58)
      : stageRect.top + stageRect.height / 2

  const spread = mobile ? 72 : 96
  const carouselX = stageCX + distance * spread
  const carouselY = stageCY
  const carouselScale = Math.max(0.84, 1 - absDistance * 0.07)
  const carouselRotate = distance * (mobile ? 0.65 : 0.85)
  const carouselWidth = Math.min(vw * 0.78, 520)
  const carouselOpacity = Math.max(0.38, 1 - absDistance * 0.28)

  const width = snapPx(lerp(peek.width, carouselWidth, t), mobile)
  const rotate = snapPx(lerp(peek.rotate, carouselRotate, carouselMix), mobile)
  const scale = snapScale(lerp(1, carouselScale, carouselMix))
  const opacity = Math.round(lerp(1, carouselOpacity, carouselMix) * 1000) / 1000
  const zIndex = Math.round(lerp(peek.z, 24 - absDistance * 3, carouselMix))

  const x = snapPx(lerp(peek.x, carouselX, carouselMix), mobile)
  const y = snapPx(lerp(peek.y, carouselY, carouselMix), mobile)

  const transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`

  return {
    width,
    transform,
    opacity,
    zIndex: zIndex + 18,
  }
}
