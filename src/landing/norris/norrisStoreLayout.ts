import { getNorrisPeekMetrics } from '@/landing/norris/norrisPeekLayout'
import type { NorrisStoreSlot } from '@/landing/norris/useNorrisStoreScroll'

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
  storeSlot: NorrisStoreSlot,
): StoreCardLayout {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const mobile = vw < 768
  const t = clamp(morph, 0, 1)

  const peek = getNorrisPeekMetrics(vw, vh, index)
  const distance = index - slideIndex
  const absDistance = Math.abs(distance)

  // Una curva para subir + agrandar; otra solo para el spread horizontal
  const mix = smoothstep(clamp((t - 0.02) / 0.52, 0, 1))
  const spreadMix = smoothstep(clamp((t - 0.68) / 0.28, 0, 1))

  const spread = mobile ? 72 : 96
  const slotY = storeSlot.cy
  const carouselX = storeSlot.cx + distance * spread * spreadMix
  const carouselY = slotY
  const carouselScale = Math.max(0.84, 1 - absDistance * 0.07)
  const carouselRotate = distance * (mobile ? 0.65 : 0.85)
  const carouselWidth = Math.min(vw * 0.78, 520)
  const carouselOpacity = Math.max(0.4, 1 - absDistance * 0.28)

  const width = snapPx(lerp(peek.width, carouselWidth, mix), mobile)
  const rotate = snapPx(lerp(peek.rotate, carouselRotate, spreadMix), mobile)
  const scale = snapScale(lerp(1, carouselScale, spreadMix))
  const opacity = Math.round(lerp(1, carouselOpacity, spreadMix) * 1000) / 1000
  const zIndex = Math.round(lerp(peek.z, 24 - absDistance * 3, spreadMix)) + 18

  const x = snapPx(lerp(peek.x, carouselX, mix), mobile)
  const y = snapPx(lerp(peek.y, carouselY, mix), mobile)

  const transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rotate}deg) scale(${scale})`

  return {
    width,
    transform,
    opacity,
    zIndex,
  }
}
