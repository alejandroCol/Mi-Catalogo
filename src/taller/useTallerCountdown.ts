import { useEffect, useState } from 'react'

export type TallerCountdownParts = {
  days: number
  hours: number
  minutes: number
  seconds: number
  remainingMs: number
  isLive: boolean
}

export function useTallerCountdown(targetMs: number | null | undefined): TallerCountdownParts {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (typeof targetMs !== 'number' || Number.isNaN(targetMs)) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [targetMs])

  if (typeof targetMs !== 'number' || Number.isNaN(targetMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, remainingMs: 0, isLive: false }
  }

  const remainingMs = Math.max(0, targetMs - now)
  const isLive = now >= targetMs
  const totalSeconds = Math.floor(remainingMs / 1000)

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    remainingMs,
    isLive,
  }
}
