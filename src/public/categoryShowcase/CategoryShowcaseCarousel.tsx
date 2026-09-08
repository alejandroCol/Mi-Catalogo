import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { IconChevronLeft, IconChevronRight } from '@/icons/McIcons'

type Props = {
  children: ReactNode
  label: string
}

export function CategoryShowcaseCarousel({ children, label }: Props) {
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [centered, setCentered] = useState(false)

  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const sync = () => {
      const max = el.scrollWidth - el.clientWidth
      setCentered(max <= 4)
      setCanPrev(el.scrollLeft > 4)
      setCanNext(max > 4 && el.scrollLeft < max - 4)
    }

    const onWheel = (e: WheelEvent) => {
      const dominantX = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      const delta = dominantX ? e.deltaX : e.deltaY
      if (Math.abs(delta) < 1) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const atStart = el.scrollLeft <= 0 && delta < 0
      const atEnd = el.scrollLeft >= max - 1 && delta > 0
      if (atStart || atEnd) return
      e.preventDefault()
      el.scrollLeft += delta
    }

    sync()
    el.addEventListener('scroll', sync, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(el)
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      el.removeEventListener('wheel', onWheel)
      ro?.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [children])

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>(':scope > li')
    const step = card ? card.getBoundingClientRect().width + 12 : Math.round(el.clientWidth * 0.8)
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div className="mc-cat-showcase__track-wrap">
      {canPrev ? (
        <button
          type="button"
          className="mc-cat-showcase__nav mc-cat-showcase__nav--prev"
          aria-label={`Anteriores de ${label}`}
          onClick={() => scrollByDir(-1)}
        >
          <IconChevronLeft size={18} />
        </button>
      ) : null}
      {canNext ? (
        <button
          type="button"
          className="mc-cat-showcase__nav mc-cat-showcase__nav--next"
          aria-label={`Siguientes de ${label}`}
          onClick={() => scrollByDir(1)}
        >
          <IconChevronRight size={18} />
        </button>
      ) : null}
      <ul
        ref={scrollerRef}
        className={centered ? 'mc-cat-showcase__track mc-cat-showcase__track--center' : 'mc-cat-showcase__track'}
      >
        {children}
      </ul>
    </div>
  )
}
