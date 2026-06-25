import { useEffect, useRef, useState } from 'react'
import { formatCop } from '@/lib/formatCop'

type Props = {
  value: number
  className?: string
  durationMs?: number
  format?: 'cop' | 'integer'
}

export function PosAnimatedNumber({ value, className, durationMs = 900, format = 'cop' }: Props) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    const from = prev.current
    const to = value
    prev.current = to
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }

    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, durationMs])

  const text = format === 'cop' ? formatCop(display) : String(display)
  return <span className={className}>{text}</span>
}
