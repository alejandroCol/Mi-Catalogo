import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'

type Props = {
  urls: string[]
  alt: string
  isBold?: boolean
  onOpenFullscreen: (index: number) => void
  /** Acciones encima de la foto (ej. favorito + compartir), arriba a la derecha. */
  overlayActions?: ReactNode
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {direction === 'left' ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  )
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
    </svg>
  )
}

function GalleryChrome({
  overlayActions,
  hasMultiple,
  safeIndex,
  urlsLength,
}: {
  overlayActions?: ReactNode
  hasMultiple: boolean
  safeIndex: number
  urlsLength: number
}) {
  return (
    <>
      {overlayActions ? (
        <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5 sm:right-3 sm:top-3">
          <div className="pointer-events-auto flex items-center gap-1.5">{overlayActions}</div>
        </div>
      ) : null}

      {hasMultiple ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {Array.from({ length: urlsLength }, (_, i) => (
            <span
              key={i}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-300',
                i === safeIndex ? 'w-5 bg-white shadow-sm' : 'w-1.5 bg-white/50',
              )}
              aria-hidden
            />
          ))}
        </div>
      ) : null}

      <span
        className="pointer-events-none absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white shadow-sm backdrop-blur-[2px] sm:bottom-4 sm:right-4"
        aria-hidden
      >
        <ExpandIcon className="h-3.5 w-3.5" />
      </span>
    </>
  )
}

function OverlayActionShell({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[var(--cat-text)] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.35)] ring-1 ring-black/5 backdrop-blur-md transition hover:bg-white active:scale-95">
      {children}
    </span>
  )
}

export function ProductGalleryActionButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      className="inline-flex"
    >
      <OverlayActionShell>{children}</OverlayActionShell>
    </button>
  )
}

export function ProductImageGallery({ urls, alt, isBold, onOpenFullscreen, overlayActions }: Props) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIndex(0)
    scrollRef.current?.scrollTo({ left: 0, behavior: 'auto' })
  }, [urls])

  const hasMultiple = urls.length > 1
  const safeIndex = Math.min(index, Math.max(0, urls.length - 1))
  const currentSrc = urls[safeIndex] ?? null

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, urls.length - 1))
      setIndex(clamped)
      const el = scrollRef.current
      if (el) {
        el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
      }
    },
    [urls.length],
  )

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || el.clientWidth <= 0) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    setIndex(Math.max(0, Math.min(i, urls.length - 1)))
  }, [urls.length])

  if (!currentSrc) {
    return (
      <div
        className={clsx(
          'relative overflow-hidden mc-pc-surface mc-pc-rey-card',
          isBold
            ? 'aspect-[5/3] w-full min-h-[220px] sm:aspect-[2/1] sm:min-h-0'
            : 'aspect-square w-full max-w-xl md:max-w-none',
        )}
      >
        <div className="flex h-full items-center justify-center mc-pc-muted">Sin imagen</div>
        {overlayActions ? (
          <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5">{overlayActions}</div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Mobile: scroll horizontal con snap */}
      <div
        className={clsx(
          'relative overflow-hidden mc-pc-surface mc-pc-rey-card md:hidden',
          isBold
            ? 'aspect-[5/3] w-full min-h-[220px] sm:aspect-[2/1] sm:min-h-0'
            : 'aspect-square w-full',
        )}
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={clsx(
            'flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain',
            hasMultiple && 'scrollbar-none',
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              className="group/img relative h-full w-full shrink-0 snap-center cursor-zoom-in focus:outline-none focus-visible:ring-1 focus-visible:ring-inset mc-pc-ring-focus"
              onClick={() => onOpenFullscreen(i)}
              aria-label={`Ver imagen ${i + 1} de ${urls.length} en pantalla completa`}
            >
              <img
                src={url}
                alt={i === 0 ? alt : ''}
                className="h-full w-full object-cover transition duration-500 group-hover/img:brightness-[0.98]"
                draggable={false}
              />
            </button>
          ))}
        </div>

        <GalleryChrome
          overlayActions={overlayActions}
          hasMultiple={hasMultiple}
          safeIndex={safeIndex}
          urlsLength={urls.length}
        />
      </div>

      {/* Desktop: imagen principal con flechas */}
      <div
        className={clsx(
          'relative hidden overflow-hidden mc-pc-surface mc-pc-rey-card md:block',
          isBold
            ? 'aspect-[5/3] w-full min-h-[220px] sm:aspect-[2/1] sm:min-h-0'
            : 'aspect-square w-full max-w-xl md:max-w-none',
        )}
      >
        <button
          type="button"
          className="group/img relative h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-1 focus-visible:ring-inset mc-pc-ring-focus"
          onClick={() => onOpenFullscreen(safeIndex)}
          aria-label={`Ver ${alt} en pantalla completa`}
        >
          <img
            src={currentSrc}
            alt={alt}
            className="h-full w-full object-cover transition duration-500 group-hover/img:brightness-[0.98]"
            draggable={false}
          />
        </button>

        <GalleryChrome
          overlayActions={overlayActions}
          hasMultiple={hasMultiple}
          safeIndex={safeIndex}
          urlsLength={urls.length}
        />

        {hasMultiple ? (
          <>
            <button
              type="button"
              disabled={safeIndex <= 0}
              onClick={(e) => {
                e.stopPropagation()
                goTo(safeIndex - 1)
              }}
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[color-mix(in_srgb,var(--cat-text)_55%,transparent)] text-white shadow-lg backdrop-blur-md transition hover:bg-[color-mix(in_srgb,var(--cat-text)_70%,transparent)] disabled:pointer-events-none disabled:opacity-0"
              aria-label="Imagen anterior"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              disabled={safeIndex >= urls.length - 1}
              onClick={(e) => {
                e.stopPropagation()
                goTo(safeIndex + 1)
              }}
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[color-mix(in_srgb,var(--cat-text)_55%,transparent)] text-white shadow-lg backdrop-blur-md transition hover:bg-[color-mix(in_srgb,var(--cat-text)_70%,transparent)] disabled:pointer-events-none disabled:opacity-0"
              aria-label="Imagen siguiente"
            >
              <ChevronIcon direction="right" />
            </button>
          </>
        ) : null}
      </div>

      {/* Thumbnails desktop */}
      {hasMultiple ? (
        <div className="mt-3 hidden gap-2 md:flex">
          {urls.map((url, i) => {
            const active = i === safeIndex
            return (
              <button
                key={url}
                type="button"
                onClick={() => goTo(i)}
                className={clsx(
                  'relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16',
                  active
                    ? 'border-[var(--cat-accent)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_30%,transparent)]'
                    : 'border-transparent opacity-85 hover:opacity-100',
                )}
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={active ? 'true' : undefined}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
