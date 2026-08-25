import { useEffect, useState } from 'react'
import clsx from 'clsx'

type Props = {
  phrases: readonly string[]
  intervalMs?: number
  className?: string
}

export function LandingRotatingText({ phrases, intervalMs = 3200, className }: Props) {
  const [index, setIndex] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (phrases.length <= 1) return

    const timer = window.setInterval(() => {
      setAnimating(true)
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length)
        setAnimating(false)
      }, 280)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [phrases.length, intervalMs])

  return (
    <span className={clsx('mc-landing-rotate', className)} aria-live="polite">
      <span
        key={phrases[index]}
        className={clsx('mc-landing-rotate__text', animating && 'mc-landing-rotate__text--out')}
      >
        {phrases[index]}
      </span>
    </span>
  )
}
