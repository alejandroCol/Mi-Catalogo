import { useEffect } from 'react'

export function FullscreenImageOverlay({
  src,
  alt,
  open,
  onClose,
}: {
  src: string | null
  alt: string
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || !src) return null

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
      <div className="flex h-full w-full items-center justify-center p-4 pt-14">
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>
    </div>
  )
}
