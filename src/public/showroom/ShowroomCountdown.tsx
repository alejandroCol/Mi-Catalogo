import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

function parts(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return { days, hours, minutes, seconds, done: total <= 0 }
}

export function ShowroomCountdown({
  targetMs,
  onComplete,
  variant = 'drop',
}: {
  targetMs: number
  onComplete?: () => void
  /** `banner`: compacto sobre el teaser del catálogo. */
  variant?: 'drop' | 'banner'
}) {
  const [now, setNow] = useState(() => Date.now())
  const completedRef = useRef(false)

  useEffect(() => {
    completedRef.current = false
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [targetMs])

  const p = parts(targetMs - now)

  useEffect(() => {
    if (!p.done || completedRef.current) return
    completedRef.current = true
    onComplete?.()
  }, [p.done, onComplete])

  const cells = [
    ...(p.days > 0 ? [{ key: 'd', label: 'días', value: p.days, pad: false }] : []),
    { key: 'h', label: 'hrs', value: p.hours, pad: true },
    { key: 'm', label: 'min', value: p.minutes, pad: true },
    { key: 's', label: 'seg', value: p.seconds, pad: true },
  ]

  const spoken = cells.map((c) => `${c.value} ${c.label}`).join(', ')

  return (
    <div
      className={clsx('mc-showroom-countdown', variant === 'banner' && 'mc-showroom-countdown--banner')}
      aria-live="polite"
      aria-label={spoken}
    >
      {cells.map((cell, i) => (
        <div key={cell.key} className="mc-showroom-countdown__unit">
          {i > 0 ? (
            <span className="mc-showroom-countdown__sep" aria-hidden>
              :
            </span>
          ) : null}
          <div className="mc-showroom-countdown__pair">
            <span className="mc-showroom-countdown__num">
              {cell.pad ? String(cell.value).padStart(2, '0') : cell.value}
            </span>
            {variant === 'banner' ? (
              <span className="mc-showroom-countdown__label">{cell.label}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
