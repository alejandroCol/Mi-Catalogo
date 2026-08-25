import { useEffect, useRef, useState } from 'react'

/** Progress 0→1 while the section travels through the viewport (sticky scroll scenes). */
export function useNorrisSectionProgress(offset = 0) {
  const ref = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    let frame = 0
    const measure = () => {
      const rect = node.getBoundingClientRect()
      const scrollable = node.offsetHeight - window.innerHeight
      if (scrollable <= 0) {
        setProgress(rect.top <= 0 ? 1 : 0)
        return
      }
      const scrolled = Math.min(Math.max(-rect.top + offset, 0), scrollable)
      setProgress(scrolled / scrollable)
    }

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [offset])

  return { ref, progress }
}

/** Global scroll 0→1 for the first viewport (hero exit). */
export function useNorrisHeroProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      const vh = window.innerHeight
      const y = window.scrollY
      setProgress(Math.min(Math.max(y / (vh * 0.55), 0), 1))
    }

    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return progress
}
