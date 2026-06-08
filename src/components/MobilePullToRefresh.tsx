import {
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import clsx from 'clsx'
import { useIsMobileViewport } from '@/hooks/useMediaQuery'
import { usePrefersReducedMotion } from '@/public/cart-animation/usePrefersReducedMotion'

const PULL_THRESHOLD = 72
const MAX_PULL = 128
const MIN_REFRESH_MS = 450

type MobilePullToRefreshProps = {
  children: ReactNode
  onRefresh: () => void | Promise<void>
  className?: string
  disabled?: boolean
}

function scrollAtTop(): boolean {
  return window.scrollY <= 2
}

function rubberBand(distance: number): number {
  if (distance <= 0) return 0
  return Math.min(MAX_PULL, distance * 0.52)
}

export function MobilePullToRefresh({
  children,
  onRefresh,
  className,
  disabled = false,
}: MobilePullToRefreshProps) {
  const isMobile = useIsMobileViewport()
  const reducedMotion = usePrefersReducedMotion()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef<number | null>(null)
  const pulling = useRef(false)
  const refreshLock = useRef(false)

  const resetTouch = useCallback(() => {
    touchStartY.current = null
    pulling.current = false
  }, [])

  const runRefresh = useCallback(async () => {
    if (refreshLock.current) return
    refreshLock.current = true
    setRefreshing(true)
    setPull(reducedMotion ? 0 : 44)
    const started = Date.now()
    try {
      await onRefresh()
    } finally {
      const elapsed = Date.now() - started
      if (elapsed < MIN_REFRESH_MS) {
        await new Promise((r) => setTimeout(r, MIN_REFRESH_MS - elapsed))
      }
      setRefreshing(false)
      setPull(0)
      refreshLock.current = false
    }
  }, [onRefresh, reducedMotion])

  useEffect(() => {
    if (!isMobile || disabled) return

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current || touchStartY.current === null || refreshLock.current) return
      if (!scrollAtTop()) {
        resetTouch()
        setPull(0)
        return
      }
      const y = e.touches[0]?.clientY
      if (y == null) return
      const distance = y - touchStartY.current
      if (distance <= 0) {
        setPull(0)
        return
      }
      e.preventDefault()
      setPull(rubberBand(distance))
    }

    window.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => window.removeEventListener('touchmove', onTouchMove)
  }, [disabled, isMobile, resetTouch])

  function onTouchStart(e: ReactTouchEvent) {
    if (!isMobile || disabled || refreshing || refreshLock.current) return
    if (!scrollAtTop()) return
    touchStartY.current = e.touches[0]?.clientY ?? null
    pulling.current = touchStartY.current != null
  }

  function onTouchEnd() {
    if (!isMobile || disabled || !pulling.current) {
      resetTouch()
      return
    }
    const shouldRefresh = pull >= PULL_THRESHOLD
    resetTouch()
    if (shouldRefresh) {
      void runRefresh()
      return
    }
    setPull(0)
  }

  function onTouchCancel() {
    resetTouch()
    if (!refreshing) setPull(0)
  }

  const showIndicator = isMobile && !disabled && (pull > 0 || refreshing)
  const ready = pull >= PULL_THRESHOLD || refreshing
  const indicatorOpacity = refreshing ? 1 : Math.min(1, pull / PULL_THRESHOLD)

  if (!isMobile) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      className={clsx('relative', className)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <div
        className={clsx(
          'pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center',
          reducedMotion ? '' : 'transition-[opacity,transform] duration-200 ease-out',
        )}
        style={{
          opacity: showIndicator ? indicatorOpacity : 0,
          transform: `translateY(${refreshing ? 12 : Math.max(0, pull - 36)}px)`,
        }}
        aria-hidden={!showIndicator}
      >
        <div
          className={clsx(
            'flex items-center gap-2 rounded-full border border-neutral-200/60 bg-[color-mix(in_srgb,var(--cat-surface)_92%,transparent)] px-3.5 py-2 shadow-[0_8px_24px_-16px_color-mix(in_srgb,var(--cat-text)_35%,transparent)] backdrop-blur-md',
            ready && 'border-[color-mix(in_srgb,var(--cat-accent)_28%,transparent)]',
          )}
        >
          <span
            className={clsx(
              'mc-ptr-spinner h-4 w-4 shrink-0 rounded-full border-2 border-neutral-200/80 border-t-[var(--cat-accent)]',
              refreshing && 'mc-ptr-spinner-active',
            )}
          />
          <span className="text-[12px] font-medium tracking-tight text-[var(--cat-muted)]">
            {refreshing ? 'Actualizando…' : ready ? 'Suelta para actualizar' : 'Desliza para actualizar'}
          </span>
        </div>
      </div>

      <div
        className={reducedMotion ? undefined : 'transition-transform duration-200 ease-out'}
        style={{
          transform: pull > 0 && !refreshing ? `translateY(${pull * 0.35}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
