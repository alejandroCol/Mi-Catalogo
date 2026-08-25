import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import {
  INTERACTIVE_LANDING_LIMITS,
  isInteractiveLandingLiteMood,
  normalizeInteractiveLandingMood,
  resolveInteractiveLanding,
  resolveInteractiveLandingProducts,
} from '@/lib/interactiveLanding'
import { productoPrecioVentaDesde } from '@/lib/productoDescuento'
import { scrollToCatalogProducts } from '@/lib/seasonBanner'
import type { McInteractiveLandingMood, McProducto, McTenant } from '@/types/mc'

type Props = {
  tenant: McTenant
  products: McProducto[]
  productPath?: (id: string) => string
  preview?: boolean
  className?: string
}

function wrapIndex(i: number, n: number): number {
  if (n <= 0) return 0
  return ((i % n) + n) % n
}

function circularOffset(i: number, active: number, n: number): number {
  let d = i - active
  while (d > n / 2) d -= n
  while (d < -n / 2) d += n
  return d
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function itemTransform(
  offset: number,
  compact: boolean,
  narrow: boolean,
  tiltX: number,
  tiltY: number,
): string {
  const abs = Math.abs(offset)
  const spacing = narrow ? 72 : compact ? 62 : 78
  const x = offset * spacing
  const z = -abs * (narrow ? 70 : compact ? 100 : 160)
  const rotateY = offset * (narrow ? -9 : -12) + tiltY
  const rotateX = tiltX
  const scale = Math.max(narrow ? 0.42 : 0.46, 1 - abs * (narrow ? 0.28 : 0.24))
  return `translate(-50%, -50%) translateX(${x}%) translateZ(${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`
}

export function InteractiveLandingHero({
  tenant,
  products,
  productPath,
  preview = false,
  className,
}: Props) {
  const cfg = resolveInteractiveLanding(tenant)
  const items = useMemo(
    () => resolveInteractiveLandingProducts(products, cfg?.productIds),
    [products, cfg?.productIds],
  )
  const mood: McInteractiveLandingMood = normalizeInteractiveLandingMood(cfg?.mood)
  const lite = isInteractiveLandingLiteMood(mood)
  const n = items.length

  const [track, setTrack] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [entered, setEntered] = useState(preview)
  const [narrow, setNarrow] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [zoomIn, setZoomIn] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const stageRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef(0)
  const targetRef = useRef(0)
  const animRef = useRef(0)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startTrack: number
    moved: boolean
    pressIndex: number
    captured: boolean
  } | null>(null)
  const tiltRef = useRef({ x: 0, y: 0 })
  const gyroRef = useRef({ x: 0, y: 0 })
  const lookRef = useRef({ x: 0, y: 0 })
  const wheelIdleRef = useRef(0)
  const gyroOnRef = useRef(false)
  const expandedRef = useRef(false)
  const tiltRafRef = useRef(0)
  const gyroHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)

  expandedRef.current = expanded

  function publishTilt() {
    if (tiltRafRef.current) return
    tiltRafRef.current = requestAnimationFrame(() => {
      tiltRafRef.current = 0
      const next = {
        x: clamp(gyroRef.current.x + lookRef.current.x, -16, 16),
        y: clamp(gyroRef.current.y + lookRef.current.y, -22, 22),
      }
      if (Math.abs(next.x - tiltRef.current.x) < 0.08 && Math.abs(next.y - tiltRef.current.y) < 0.08) {
        return
      }
      tiltRef.current = next
      setTilt(next)
    })
  }

  function applyGyro(e: DeviceOrientationEvent) {
    if (expandedRef.current) return
    const gamma = e.gamma ?? 0
    const beta = e.beta ?? 0
    gyroRef.current = {
      x: clamp((beta - 35) * -0.28, -14, 14),
      y: clamp(gamma * 0.48, -20, 20),
    }
    publishTilt()
  }

  const applyTrack = useCallback((value: number) => {
    trackRef.current = value
    setTrack(value)
  }, [])

  const stopAnim = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = 0
    }
  }, [])

  const animateTo = useCallback(
    (rawTarget: number) => {
      if (n < 2) return
      targetRef.current = rawTarget
      stopAnim()
      const step = () => {
        const current = trackRef.current
        let dest = targetRef.current
        let diff = dest - current
        while (diff > n / 2) {
          dest -= n
          diff = dest - current
        }
        while (diff < -n / 2) {
          dest += n
          diff = dest - current
        }
        const next = current + (dest - current) * 0.15
        if (Math.abs(dest - next) < 0.003) {
          const snapped = wrapIndex(Math.round(dest), n)
          applyTrack(snapped)
          targetRef.current = snapped
          animRef.current = 0
          return
        }
        applyTrack(next)
        animRef.current = requestAnimationFrame(step)
      }
      animRef.current = requestAnimationFrame(step)
    },
    [applyTrack, n, stopAnim],
  )

  useEffect(() => {
    return () => stopAnim()
  }, [stopAnim])

  useEffect(() => {
    if (n === 0) return
    const next = wrapIndex(Math.round(trackRef.current), n)
    applyTrack(next)
    targetRef.current = next
  }, [applyTrack, n])

  useEffect(() => {
    if (preview) {
      setEntered(true)
      return
    }
    const t = window.setTimeout(() => setEntered(true), 40)
    return () => window.clearTimeout(t)
  }, [preview])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)')
    const apply = () => setNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n < 2 || expanded) return
      const current = wrapIndex(Math.round(trackRef.current), n)
      animateTo(current + dir)
    },
    [animateTo, expanded, n],
  )

  const activeIndex = wrapIndex(Math.round(track), n)
  const active = n > 0 ? items[activeIndex] : undefined

  useEffect(() => {
    const el = stageRef.current
    if (!el || n < 2) return

    const onWheel = (e: WheelEvent) => {
      if (expanded) return
      const overItem =
        (e.target as HTMLElement | null)?.closest?.('[data-ix-index]') ||
        indexAtPoint(e.clientX, e.clientY) != null
      if (!overItem) return
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (Math.abs(delta) < 2) return
      e.preventDefault()
      stopAnim()
      applyTrack(trackRef.current + delta / 220)
      window.clearTimeout(wheelIdleRef.current)
      wheelIdleRef.current = window.setTimeout(() => {
        animateTo(Math.round(trackRef.current))
      }, 140)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      window.clearTimeout(wheelIdleRef.current)
    }
  }, [animateTo, applyTrack, expanded, n, stopAnim])

  useEffect(() => {
    if (preview || n < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expanded) {
        e.preventDefault()
        setExpanded(false)
        return
      }
      if (expanded) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, go, n, preview])

  useEffect(() => {
    if (!expanded) {
      setZoomIn(false)
      return
    }
    const id = window.requestAnimationFrame(() => setZoomIn(true))
    return () => window.cancelAnimationFrame(id)
  }, [expanded])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) return
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof DOE.requestPermission === 'function') return
    gyroHandlerRef.current = applyGyro
    window.addEventListener('deviceorientation', applyGyro)
    gyroOnRef.current = true
    return () => {
      window.removeEventListener('deviceorientation', applyGyro)
      gyroOnRef.current = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (gyroHandlerRef.current) {
        window.removeEventListener('deviceorientation', gyroHandlerRef.current)
      }
      if (tiltRafRef.current) cancelAnimationFrame(tiltRafRef.current)
    }
  }, [])

  async function enableGyroFromGesture() {
    if (gyroOnRef.current) return
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof DOE.requestPermission !== 'function') return
    try {
      const res = await DOE.requestPermission()
      if (res !== 'granted') return
      gyroHandlerRef.current = applyGyro
      window.addEventListener('deviceorientation', applyGyro)
      gyroOnRef.current = true
    } catch {
      /* iOS denegó el giroscopio */
    }
  }

  function lookFromPoint(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    const nx = (clientX - rect.left) / rect.width - 0.5
    const ny = (clientY - rect.top) / rect.height - 0.5
    lookRef.current = {
      x: clamp(ny * -18, -14, 14),
      y: clamp(nx * 26, -20, 20),
    }
    publishTilt()
  }

  function indexAtPoint(clientX: number, clientY: number): number | null {
    const stage = stageRef.current
    if (!stage) return null
    const fromEvent = (document.elementFromPoint(clientX, clientY) as HTMLElement | null)?.closest?.(
      '[data-ix-index]',
    )
    if (fromEvent) {
      const i = Number(fromEvent.getAttribute('data-ix-index'))
      if (Number.isFinite(i)) return i
    }
    let bestIndex: number | null = null
    let bestZ = -Infinity
    let bestArea = Infinity
    for (const el of stage.querySelectorAll<HTMLElement>('[data-ix-index]')) {
      const r = el.getBoundingClientRect()
      const pad = 14
      if (
        clientX < r.left - pad ||
        clientX > r.right + pad ||
        clientY < r.top - pad ||
        clientY > r.bottom + pad
      ) {
        continue
      }
      const i = Number(el.getAttribute('data-ix-index'))
      if (!Number.isFinite(i)) continue
      const z = Number(el.style.zIndex) || 0
      const area = Math.max(1, r.width * r.height)
      if (z > bestZ || (z === bestZ && area < bestArea)) {
        bestIndex = i
        bestZ = z
        bestArea = area
      }
    }
    return bestIndex
  }

  function onPointerDown(e: PointerEvent) {
    if (expanded) return
    void enableGyroFromGesture()
    lookFromPoint(e.clientX, e.clientY)
    const fromTarget = (e.target as HTMLElement | null)?.closest?.('[data-ix-index]')
    const pressIndex = fromTarget
      ? Number(fromTarget.getAttribute('data-ix-index'))
      : indexAtPoint(e.clientX, e.clientY)
    if (pressIndex == null || !Number.isFinite(pressIndex)) return
    e.preventDefault()
    stopAnim()
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTrack: trackRef.current,
      moved: false,
      pressIndex,
      captured: false,
    }
  }

  function onPointerMove(e: PointerEvent) {
    lookFromPoint(e.clientX, e.clientY)
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) > 6) {
      drag.moved = true
      if (!dragging) setDragging(true)
      if (!drag.captured) {
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.captured = true
      }
    }
    if (!drag.moved || n < 2) return
    const width = stageRef.current?.clientWidth || 720
    applyTrack(drag.startTrack - dx / (width * 0.28))
  }

  function onPointerUp(e: PointerEvent) {
    const drag = dragRef.current
    if (drag && drag.captured) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }
    dragRef.current = null
    setDragging(false)
    if (!drag) return
    if (drag.moved) {
      if (n > 1) animateTo(Math.round(trackRef.current))
      return
    }
    const i = drag.pressIndex
    const offset = circularOffset(i, trackRef.current, n)
    if (Math.abs(offset) > 0.4) {
      animateTo(i)
      return
    }
    setExpanded(true)
  }

  function onPointerLeave() {
    if (dragRef.current) return
    lookRef.current = { x: 0, y: 0 }
    publishTilt()
  }

  function closeZoom() {
    setExpanded(false)
  }

  if (n < INTERACTIVE_LANDING_LIMITS.minProducts || !active) return null

  const compact = preview
  const progress = n > 0 ? (activeIndex + 1) / n : 0
  const href = productPath?.(active.id)
  const visibleRange = narrow ? 1.2 : 2.4

  return (
    <section
      className={clsx(
        'mc-ix-hero',
        `mc-ix-hero--${mood}`,
        lite && 'mc-ix-hero--lite',
        entered && 'mc-ix-hero--in',
        preview && 'mc-ix-hero--preview',
        dragging && 'mc-ix-hero--dragging',
        expanded && 'mc-ix-hero--zoomed',
        className,
      )}
      aria-label="Colección interactiva"
    >
      <div className="mc-ix-hero__atmosphere" aria-hidden>
        <span className="mc-ix-hero__orb mc-ix-hero__orb--a" />
        <span className="mc-ix-hero__orb mc-ix-hero__orb--b" />
        <span className="mc-ix-hero__floor" />
        <span className="mc-ix-hero__grain" />
      </div>

      <p className="mc-ix-hero__store">{tenant.nombreTienda}</p>

      <div
        ref={stageRef}
        className="mc-ix-stage"
        style={{
          perspectiveOrigin: `${50 + tilt.y * 0.7}% ${46 + tilt.x * -0.55}%`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        {items.map((p, i) => {
          const offset = circularOffset(i, track, n)
          const abs = Math.abs(offset)
          if (abs > visibleRange) return null
          const focused = abs < 0.35
          return (
            <div
              key={p.id}
              data-ix-index={i}
              className={clsx(
                'mc-ix-item',
                focused && 'mc-ix-item--focus',
                dragging && 'mc-ix-item--live',
              )}
              style={{
                transform: itemTransform(offset, compact, narrow, tilt.x, tilt.y),
                opacity: Math.max(0.38, 1 - abs * 0.28),
                zIndex: 40 - Math.round(abs * 10),
                filter: `brightness(${Math.max(0.82, 1 - abs * 0.12)})`,
                ['--ix-parx' as string]: `${tilt.y * -1.1}px`,
                ['--ix-pary' as string]: `${tilt.x * 1.15}px`,
              }}
            >
              <button
                type="button"
                className="mc-ix-item__hit"
                tabIndex={focused ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  if (focused) setExpanded(true)
                  else animateTo(i)
                }}
              >
                <span className="mc-ix-item__plate">
                  <img src={p.imageUrl} alt={focused ? p.nombre : ''} draggable={false} />
                </span>
              </button>
              <span className="mc-ix-item__shadow" aria-hidden />
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className="mc-ix-nav mc-ix-nav--prev"
        aria-label="Producto anterior"
        onClick={() => go(-1)}
      >
        ‹
      </button>
      <button
        type="button"
        className="mc-ix-nav mc-ix-nav--next"
        aria-label="Producto siguiente"
        onClick={() => go(1)}
      >
        ›
      </button>

      <div className="mc-ix-copy">
        <h2 className="mc-ix-copy__name">{active.nombre}</h2>
        <p className="mc-ix-copy__price">{formatCop(productoPrecioVentaDesde(active))}</p>
      </div>

      <div className="mc-ix-progress" role="group" aria-label="Productos de la colección">
        <div className="mc-ix-progress__track">
          <span className="mc-ix-progress__fill" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
        <div className="mc-ix-progress__dots">
          {items.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={clsx('mc-ix-progress__dot', i === activeIndex && 'is-on')}
              aria-label={p.nombre}
              aria-current={i === activeIndex ? 'true' : undefined}
              onClick={() => animateTo(i)}
            />
          ))}
        </div>
      </div>

      {!preview ? (
        <button
          type="button"
          className="mc-ix-scroll"
          aria-label="Ir al catálogo"
          onClick={() => scrollToCatalogProducts()}
        >
          Deslizá para descubrir
          <span className="mc-ix-scroll__line" aria-hidden />
        </button>
      ) : null}

      {expanded ? (
        <div
          className={clsx('mc-ix-zoom', zoomIn && 'mc-ix-zoom--in')}
          role="dialog"
          aria-modal="true"
          aria-label={active.nombre}
          onClick={closeZoom}
        >
          <button type="button" className="mc-ix-zoom__close" aria-label="Cerrar" onClick={closeZoom}>
            ✕
          </button>
          <div className="mc-ix-zoom__card" onClick={(e) => e.stopPropagation()}>
            <div className="mc-ix-zoom__photo">
              <img src={active.imageUrl} alt={active.nombre} />
            </div>
            <div className="mc-ix-zoom__meta">
              <p className="mc-ix-zoom__name">{active.nombre}</p>
              <p className="mc-ix-zoom__price">{formatCop(productoPrecioVentaDesde(active))}</p>
              {href && !preview ? (
                <Link to={href} className="mc-ix-zoom__cta">
                  Ver detalle
                </Link>
              ) : (
                <span className="mc-ix-zoom__cta mc-ix-zoom__cta--static">Ver detalle</span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
