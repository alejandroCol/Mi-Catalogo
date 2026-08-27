import { type RefObject, useEffect, useState } from 'react'

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

/** Centro del área de cards — debajo del título cuando existe. */
function measureStoreSlot(node: HTMLElement, vh: number, mobile: boolean) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const stageRect = node.querySelector('.mc-norris-store-stage')?.getBoundingClientRect() ?? null
  const headRect = node.querySelector('.mc-norris-store-head')?.getBoundingClientRect() ?? null

  if (stageRect && stageRect.height > 20 && stageRect.top < vh * 0.92) {
    return {
      cx: stageRect.left + stageRect.width / 2,
      cy: stageRect.top + stageRect.height / 2,
    }
  }

  if (headRect && headRect.height > 0) {
    return {
      cx: vw / 2,
      cy: headRect.bottom + (mobile ? 130 : 150),
    }
  }

  return {
    cx: vw / 2,
    cy: vh * (mobile ? 0.58 : 0.6),
  }
}

export type NorrisStoreSlot = {
  cx: number
  cy: number
}

export type NorrisStoreScrollState = {
  morph: number
  carousel: number
  slideIndex: number
  activeIndex: number
  storeSlot: NorrisStoreSlot
  cardsVisible: boolean
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
    storeSlot: { cx: 600, cy: 460 },
    cardsVisible: true,
  })

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    let frame = 0
    const maxIndex = Math.max(storeCount - 1, 0)
    let lastMorph = -1
    let lastSlide = -1
    let lastActive = -1
    let lastSlotCy = -1
    let lastVisible = true

    const measure = () => {
      const mobile = isMobileViewport()
      const vh = window.innerHeight
      const scrollY = window.scrollY
      const sectionTop = node.offsetTop
      const scrollable = Math.max(node.offsetHeight - vh, 1)
      const sectionRect = node.getBoundingClientRect()

      // Una sola curva: peek (hero) → carrusel (tiendas pinned)
      const morphStart = vh * 0.04
      const morphEnd = Math.max(sectionTop - vh * 0.08, vh * 0.45)
      const morphRaw = smoothstep(clamp((scrollY - morphStart) / (morphEnd - morphStart), 0, 1))
      const morph = mobile ? Math.round(morphRaw * 400) / 400 : morphRaw

      const sectionScrolled = clamp(-sectionRect.top, 0, scrollable)
      const sectionProgress = sectionScrolled / scrollable
      const storeSlot = measureStoreSlot(node, vh, mobile)

      let carousel = 0
      let slideIndex = 0
      if (maxIndex > 0) {
        const carouselReady = smoothstep(clamp((morph - 0.82) / 0.18, 0, 1))
        const carouselEnd = mobile ? 0.9 : 0.92
        const carouselT = clamp((sectionProgress - 0.32) / (carouselEnd - 0.32), 0, 1)
        carousel = carouselT * carouselReady
        slideIndex = carouselT * maxIndex * carouselReady
        if (mobile) {
          slideIndex = Math.round(slideIndex * 80) / 80
        }
      }

      const activeIndex = Math.min(maxIndex, Math.round(slideIndex))
      const cardsVisible = sectionRect.bottom > 0 && sectionRect.top < vh + 80

      if (
        Math.abs(morph - lastMorph) < 0.001 &&
        Math.abs(slideIndex - lastSlide) < 0.008 &&
        activeIndex === lastActive &&
        Math.abs(storeSlot.cy - lastSlotCy) < 2 &&
        cardsVisible === lastVisible
      ) {
        return
      }

      lastMorph = morph
      lastSlide = slideIndex
      lastActive = activeIndex
      lastSlotCy = storeSlot.cy
      lastVisible = cardsVisible

      setState({
        morph,
        carousel,
        slideIndex,
        activeIndex,
        storeSlot,
        cardsVisible,
      })
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
