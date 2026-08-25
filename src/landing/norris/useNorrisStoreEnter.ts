import { useEffect, useState } from 'react'

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

/** Animación de entrada al abrir la landing (peek del hero). Se cancela al scrollear. */
export function useNorrisStoreEnter(index: number, morph: number) {
  const [enter, setEnter] = useState(0)

  useEffect(() => {
    if (morph > 0.06) {
      setEnter(1)
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEnter(1)
      return
    }

    const delayMs = 420 + index * 90
    const durationMs = 880
    let frame = 0
    let startAt = 0

    const tick = (now: number) => {
      if (!startAt) startAt = now + delayMs
      if (now < startAt) {
        frame = requestAnimationFrame(tick)
        return
      }

      const t = Math.min((now - startAt) / durationMs, 1)
      setEnter(easeOutCubic(t))

      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [index, morph])

  if (morph > 0.06) return 1
  return enter
}
