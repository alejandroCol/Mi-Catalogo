import { useEffect, useState } from 'react'

/** Coincide con el breakpoint `md` de Tailwind (768px). */
export const MC_MOBILE_MEDIA_QUERY = '(max-width: 767px)'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export function useIsMobileViewport(): boolean {
  return useMediaQuery(MC_MOBILE_MEDIA_QUERY)
}
