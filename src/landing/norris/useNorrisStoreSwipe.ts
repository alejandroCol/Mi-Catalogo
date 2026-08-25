import { type RefObject, useEffect, useRef, useState } from 'react'
import type { NorrisStoreScrollState } from '@/landing/norris/useNorrisStoreScroll'

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

const MOBILE_MQ = '(max-width: 767px)'
const SWIPE_PX_PER_SLIDE = 92

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
  const touchRaf = useRef(0)
  const pendingTouchIndex = useRef<number | null>(null)

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

    const flushTouchIndex = () => {
      touchRaf.current = 0
      if (pendingTouchIndex.current === null) return
      setTouchIndex(pendingTouchIndex.current)
    }

    const queueTouchIndex = (value: number) => {
      pendingTouchIndex.current = Math.round(value * 80) / 80
      if (!touchRaf.current) {
        touchRaf.current = requestAnimationFrame(flushTouchIndex)
      }
    }

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
      queueTouchIndex(startIndex)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging || !mobile.matches) return

      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      if (!horizontal) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.15) {
          horizontal = true
        } else if (Math.abs(dy) > 14) {
          dragging = false
          pendingTouchIndex.current = null
          setTouchIndex(null)
          return
        }
      }

      if (horizontal) {
        e.preventDefault()
        queueTouchIndex(clamp(startIndex - dx / SWIPE_PX_PER_SLIDE, 0, maxIndex))
      }
    }

    const finish = () => {
      if (!dragging) return
      dragging = false

      if (horizontal && touchIndexRef.current !== null) {
        queueTouchIndex(Math.round(touchIndexRef.current))
      } else if (!horizontal) {
        pendingTouchIndex.current = null
        setTouchIndex(null)
      }
      horizontal = false
    }

    target.addEventListener('touchstart', onTouchStart, { passive: true })
    target.addEventListener('touchmove', onTouchMove, { passive: false })
    target.addEventListener('touchend', finish)
    target.addEventListener('touchcancel', finish)

    return () => {
      if (touchRaf.current) cancelAnimationFrame(touchRaf.current)
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
    if (Math.abs(scroll.slideIndex - prevScrollIndex.current) > 0.2) {
      setTouchIndex(null)
    }
    prevScrollIndex.current = scroll.slideIndex
  }, [scroll.slideIndex, touchIndex])

  const slideIndex = touchIndex ?? scroll.slideIndex
  const activeIndex = Math.min(maxIndex, Math.round(slideIndex))

  return { slideIndex, activeIndex, swipeActive }
}
