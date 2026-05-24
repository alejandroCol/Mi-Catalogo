import { useCallback, useEffect, useState } from 'react'

export function FullscreenImageOverlay({
  src,
  urls,
  initialIndex = 0,
  alt,
  open,
  onClose,
}: {
  src?: string | null
  /** Galería completa; si se pasa, habilita navegación con flechas. */
  urls?: string[]
  initialIndex?: number
  alt: string
  open: boolean
  onClose: () => void
}) {
  const gallery = urls && urls.length > 0 ? urls : src ? [src] : []
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [open, initialIndex])

  const hasMultiple = gallery.length > 1
  const safeIndex = Math.min(index, Math.max(0, gallery.length - 1))
  const currentSrc = gallery[safeIndex] ?? null

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(gallery.length - 1, i + 1))
  }, [gallery.length])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasMultiple) goPrev()
      if (e.key === 'ArrowRight' && hasMultiple) goNext()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, hasMultiple, goPrev, goNext])

  if (!open || !currentSrc) return null

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label="Imagen ampliada"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-3 top-3 z-10 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        Cerrar
      </button>

      {hasMultiple ? (
        <>
          <button
            type="button"
            disabled={safeIndex <= 0}
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 disabled:pointer-events-none disabled:opacity-30 sm:left-5"
            aria-label="Imagen anterior"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={safeIndex >= gallery.length - 1}
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 disabled:pointer-events-none disabled:opacity-30 sm:right-5"
            aria-label="Imagen siguiente"
          >
            ›
          </button>
          <span className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {safeIndex + 1} / {gallery.length}
          </span>
        </>
      ) : null}

      <div className="flex h-full w-full items-center justify-center p-4 pt-14">
        <img
          src={currentSrc}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>
    </div>
  )
}
