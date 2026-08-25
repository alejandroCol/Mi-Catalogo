import { type RefObject, useEffect, useState } from 'react'

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

export type NorrisStoreScrollState = {
  morph: number
  carousel: number
  slideIndex: number
  activeIndex: number
  stageRect: DOMRect | null
}

export function useNorrisStoreScroll(
  sectionRef: RefObject<HTMLElement | null>,
  storeCount: number,
) {
  const [state, setState] = useState<NorrisStoreScrollState>({
    morph: 0,
    carousel: 0,
    slideIndex: 0,
    activeIndex: 0,
    stageRect: null,
  })

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    let frame = 0
    const maxIndex = Math.max(storeCount - 1, 0)
    let lastMorph = -1
    let lastSlide = -1
    let lastActive = -1

    const measure = () => {
      const mobile = isMobileViewport()
      const vh = window.innerHeight
      const scrollY = window.scrollY
      const sectionTop = node.offsetTop
      const scrollable = Math.max(node.offsetHeight - vh, 1)

      const morphEnd = Math.max(sectionTop - vh * 0.12, vh * 0.52)
      const globalMorph = easeInOutCubic(clamp(scrollY / morphEnd, 0, 1))

      const rectTop = node.getBoundingClientRect().top
      const sectionScrolled = clamp(-rectTop, 0, scrollable)
      const sectionProgress = sectionScrolled / scrollable

      const morphFromSection = smoothstep(clamp(sectionProgress / 0.36, 0, 1))
      const morphRaw = Math.max(globalMorph, morphFromSection)
      const morph = mobile ? Math.round(morphRaw * 500) / 500 : morphRaw

      let carousel = 0
      let slideIndex = 0
      if (maxIndex > 0) {
        const carouselReady = smoothstep(clamp((morph - 0.86) / 0.14, 0, 1))
        const carouselT = clamp((sectionProgress - 0.36) / 0.64, 0, 1)
        carousel = carouselT * carouselReady
        slideIndex = carouselT * maxIndex * carouselReady
        if (mobile) {
          slideIndex = Math.round(slideIndex * 80) / 80
        }
      }

      const activeIndex = Math.min(maxIndex, Math.round(slideIndex))

      // stageRect en mobile causa micro-saltos al medir cada frame con sticky
      const stageRect =
        mobile ? null : (node.querySelector('.mc-norris-store-stage')?.getBoundingClientRect() ?? null)

      if (
        Math.abs(morph - lastMorph) < 0.001 &&
        Math.abs(slideIndex - lastSlide) < 0.008 &&
        activeIndex === lastActive
      ) {
        return
      }

      lastMorph = morph
      lastSlide = slideIndex
      lastActive = activeIndex

      setState({ morph, carousel, slideIndex, activeIndex, stageRect })
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
  }, [sectionRef, storeCount])

  return state
}
