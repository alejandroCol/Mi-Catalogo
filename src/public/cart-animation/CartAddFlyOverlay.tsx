import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  CART_FLY_DURATION_MS,
  easeOutCubic,
  quadraticBezier,
} from '@/public/cart-animation/flyBezier'
import { useCartAddAnimation } from '@/public/cart-animation/CartAddAnimationContext'
import type { CartFlyParticle } from '@/public/cart-animation/types'

const PARTICLE_SIZE = 42

function FlyParticle({
  particle,
  onComplete,
}: {
  particle: CartFlyParticle
  onComplete: (id: string) => void
}) {
  const elRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const { startX, startY, endX, endY } = particle
    const controlX = (startX + endX) / 2
    const arcLift = Math.min(120, Math.abs(endY - startY) * 0.35 + 48)
    const controlY = Math.min(startY, endY) - arcLift

    const half = PARTICLE_SIZE / 2
    let raf = 0
    const t0 = performance.now()

    const tick = (now: number) => {
      const raw = Math.min(1, (now - t0) / CART_FLY_DURATION_MS)
      const t = easeOutCubic(raw)

      const x = quadraticBezier(t, startX, controlX, endX) - half
      const y = quadraticBezier(t, startY, controlY, endY) - half
      const scale = 1 - t * 0.82
      const opacity = raw < 0.12 ? raw / 0.12 : 1 - (raw - 0.12) / 0.88

      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
      el.style.opacity = String(Math.max(0, opacity))

      if (raw < 1) {
        raf = requestAnimationFrame(tick)
      } else if (!doneRef.current) {
        doneRef.current = true
        onComplete(particle.id)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [particle, onComplete])

  return (
    <div
      ref={elRef}
      className="mc-pc-cart-fly-particle"
      style={{ width: PARTICLE_SIZE, height: PARTICLE_SIZE }}
      aria-hidden
    >
      {particle.imageUrl ? (
        <img src={particle.imageUrl} alt="" className="mc-pc-cart-fly-particle-img" draggable={false} />
      ) : (
        <span className="mc-pc-cart-fly-particle-fallback" />
      )}
    </div>
  )
}

export function CartAddFlyOverlay() {
  const { activeFlies, onFlyComplete } = useCartAddAnimation()

  if (activeFlies.length === 0) return null

  return createPortal(
    <div className="mc-pc-cart-fly-layer" aria-hidden>
      {activeFlies.map((p) => (
        <FlyParticle key={p.id} particle={p} onComplete={onFlyComplete} />
      ))}
    </div>,
    document.body,
  )
}
