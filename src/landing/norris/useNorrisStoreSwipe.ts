import { type RefObject, useEffect, useRef, useState } from 'react'
import type { NorrisStoreScrollState } from '@/landing/norris/useNorrisStoreScroll'

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

const MOBILE_MQ = '(max-width: 767px)'
const SWIPE_PX_PER_SLIDE = 88

export function useNorrisStoreSwipe(
  sectionRef: RefObject<HTMLElement | null>,
  scroll: NorrisStoreScrollState,
  storeCount: number,
) {
  const maxIndex = Math.max(storeCount - 1, 0)
  const [touchIndex, setTouchIndex] = useState<number | null>(null)
  const [swipeActive, setSwipeActive] = useState(false)

  const scrollIndexRef = useRef(scroll.slideIndex)
  const touchIndexRef = useRef<number | null>(null)
  const prevScrollIndex = useRef(scroll.slideIndex)
  const morphRef = useRef(scroll.morph)

  scrollIndexRef.current = scroll.slideIndex
  touchIndexRef.current = touchIndex
  morphRef.current = scroll.morph

  const carouselActive = scroll.morph >= 0.86

  useEffect(() => {
    if (!carouselActive) setTouchIndex(null)
  }, [carouselActive])

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    const mobile = window.matchMedia(MOBILE_MQ)
    const target = node

    const syncSwipeActive = () => {
      setSwipeActive(mobile.matches && morphRef.current >= 0.86)
    }
    syncSwipeActive()
    mobile.addEventListener('change', syncSwipeActive)

    let startX = 0
    let startY = 0
    let startIndex = 0
    let dragging = false
    let horizontal = false

    const onTouchStart = (e: TouchEvent) => {
      if (!mobile.matches) return
      if (morphRef.current < 0.86) return

      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startIndex = touchIndexRef.current ?? scrollIndexRef.current
      dragging = true
      horizontal = false
      setTouchIndex(startIndex)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging || !mobile.matches) return

      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      if (!horizontal) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.1) {
          horizontal = true
        } else if (Math.abs(dy) > 12) {
          dragging = false
          setTouchIndex(null)
          return
        }
      }

      if (horizontal) {
        e.preventDefault()
        setTouchIndex(clamp(startIndex - dx / SWIPE_PX_PER_SLIDE, 0, maxIndex))
      }
    }

    const finish = () => {
      if (!dragging) return
      dragging = false

      if (horizontal && touchIndexRef.current !== null) {
        setTouchIndex(Math.round(touchIndexRef.current))
      } else if (!horizontal) {
        setTouchIndex(null)
      }
      horizontal = false
    }

    target.addEventListener('touchstart', onTouchStart, { passive: true })
    target.addEventListener('touchmove', onTouchMove, { passive: false })
    target.addEventListener('touchend', finish)
    target.addEventListener('touchcancel', finish)

    return () => {
      mobile.removeEventListener('change', syncSwipeActive)
      target.removeEventListener('touchstart', onTouchStart)
      target.removeEventListener('touchmove', onTouchMove)
      target.removeEventListener('touchend', finish)
      target.removeEventListener('touchcancel', finish)
    }
  }, [sectionRef, maxIndex])

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_MQ)
    setSwipeActive(mobile.matches && morphRef.current >= 0.86)
  }, [scroll.morph])

  useEffect(() => {
    if (touchIndex === null) {
      prevScrollIndex.current = scroll.slideIndex
      return
    }
    if (Math.abs(scroll.slideIndex - prevScrollIndex.current) > 0.06) {
      setTouchIndex(null)
    }
    prevScrollIndex.current = scroll.slideIndex
  }, [scroll.slideIndex, touchIndex])

  const slideIndex = touchIndex ?? scroll.slideIndex
  const activeIndex = Math.min(maxIndex, Math.round(slideIndex))

  return { slideIndex, activeIndex, swipeActive }
}
