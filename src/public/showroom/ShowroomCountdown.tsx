import { useEffect, useRef, useState } from 'react'

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
}: {
  targetMs: number
  onComplete?: () => void
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
    ...(p.days > 0 ? [['Días', p.days] as const] : []),
    ['Hrs', p.hours] as const,
    ['Min', p.minutes] as const,
    ['Seg', p.seconds] as const,
  ]

  return (
    <div className="mc-showroom-countdown" aria-live="polite">
      {cells.map(([label, value]) => (
        <div key={label} className="mc-showroom-countdown__cell">
          <span className="mc-showroom-countdown__num">
            {String(value).padStart(2, '0')}
          </span>
          <span className="mc-showroom-countdown__label">{label}</span>
        </div>
      ))}
    </div>
  )
}
