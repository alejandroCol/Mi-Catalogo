import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import { McFileInputLabel } from '@/components/McFileInputLabel'
import {
  createImagenDraftFromFile,
  getImagenDraftSrc,
  revokeImagenDraftPreviews,
  type ProductoImagenDraft,
} from '@/lib/productoImagenes'

type Props = {
  items: ProductoImagenDraft[]
  coverId: string | null
  onChange: (items: ProductoImagenDraft[], coverId: string | null) => void
  disabled?: boolean
  label?: string
  hint?: string
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export function ProductoImagenesEditor({
  items,
  coverId,
  onChange,
  disabled = false,
  label = 'Fotos del producto',
  hint = 'Tocá una miniatura para marcarla como portada.',
}: Props) {
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    return () => revokeImagenDraftPreviews(itemsRef.current)
  }, [])

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) return

    const next = [...items]
    for (const file of list) {
      next.push(createImagenDraftFromFile(file))
    }
    const nextCover = coverId ?? next[0]?.id ?? null
    onChange(next, nextCover)
  }

  function removeItem(id: string) {
    const removed = items.find((i) => i.id === id)
    if (removed?.kind === 'new') URL.revokeObjectURL(removed.previewUrl)

    const next = items.filter((i) => i.id !== id)
    let nextCover = coverId
    if (coverId === id) nextCover = next[0]?.id ?? null
    onChange(next, nextCover)
  }

  function setCover(id: string) {
    if (disabled || coverId === id) return
    onChange(items, id)
  }

  const effectiveCoverId = coverId && items.some((i) => i.id === coverId) ? coverId : (items[0]?.id ?? null)

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ios-footnote font-medium text-mc-700">{label}</p>
          {hint ? <p className="mt-1 text-[12px] leading-relaxed text-mc-500">{hint}</p> : null}
        </div>
        {items.length > 0 ? (
          <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-mc-600">
            {items.length} {items.length === 1 ? 'foto' : 'fotos'}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2.5 sm:gap-3">
        {items.map((item) => {
          const isCover = item.id === effectiveCoverId
          const src = getImagenDraftSrc(item)

          return (
            <div
              key={item.id}
              className={clsx(
                'group relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-[96px] sm:w-[96px]',
                isCover
                  ? 'border-mc-900 shadow-md ring-2 ring-mc-900/15'
                  : 'border-neutral-300/90 hover:border-neutral-400',
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => setCover(item.id)}
                className="absolute inset-0 h-full w-full"
                aria-label={isCover ? 'Portada del producto' : 'Marcar como portada'}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
                <span
                  className={clsx(
                    'absolute inset-0 transition',
                    isCover ? 'bg-black/0' : 'bg-black/0 group-hover:bg-black/10',
                  )}
                />
              </button>

              {isCover ? (
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                  <IconStar className="h-2.5 w-2.5" />
                  Portada
                </span>
              ) : (
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-mc-600 opacity-0 shadow-sm transition group-hover:opacity-100">
                  Portada
                </span>
              )}

              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  removeItem(item.id)
                }}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition hover:bg-red-600 active:scale-95"
                aria-label="Quitar imagen"
              >
                <IconX className="h-3 w-3" />
              </button>
            </div>
          )
        })}

        <McFileInputLabel
          accept="image/*"
          multiple
          disabled={disabled}
          onFiles={addFiles}
          className={clsx(
            'flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition sm:h-[96px] sm:w-[96px]',
            disabled
              ? 'cursor-not-allowed border-neutral-200/60 bg-neutral-50/50 text-neutral-300'
              : 'cursor-pointer border-neutral-300 bg-white text-mc-600 hover:border-mc-900/40 hover:bg-white hover:text-mc-900 active:scale-[0.98]',
          )}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
            <IconPlus className="h-5 w-5" />
          </span>
          <span className="text-[10px] font-semibold leading-tight">
            {items.length === 0 ? 'Subir foto' : 'Agregar'}
          </span>
        </McFileInputLabel>
      </div>
    </div>
  )
}
