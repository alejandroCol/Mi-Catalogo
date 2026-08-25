import { useEffect, useRef, useState } from 'react'

type Options = {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

export function useLandingReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.12,
  rootMargin = '0px 0px -6% 0px',
  once = true,
}: Options = {}) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return { ref, visible }
}
