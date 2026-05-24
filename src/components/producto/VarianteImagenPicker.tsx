import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

type Props = {
  file: File | null
  imageUrl?: string
  onChange: (file: File | null) => void
  onRemoveExisting?: () => void
  disabled?: boolean
  label?: string
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

/** Selector de una sola imagen para variantes (miniatura + eliminar). */
export function VarianteImagenPicker({
  file,
  imageUrl,
  onChange,
  onRemoveExisting,
  disabled = false,
  label = 'Foto de esta variante',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const displaySrc = previewUrl ?? (file ? null : imageUrl)
  const hasImage = !!displaySrc

  function clearImage() {
    if (file) {
      onChange(null)
    } else if (imageUrl && onRemoveExisting) {
      onRemoveExisting()
    }
  }

  return (
    <div>
      <p className="text-[11px] font-medium text-mc-600">{label}</p>
      <p className="mt-0.5 text-[11px] text-mc-500">Opcional. Se muestra al elegir esta variante en el catálogo.</p>

      <div className="mt-2 flex items-center gap-3">
        {hasImage ? (
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-neutral-200/80 shadow-sm">
            <img src={displaySrc!} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              disabled={disabled}
              onClick={clearImage}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition hover:bg-red-600 active:scale-95"
              aria-label="Quitar imagen de variante"
            >
              <IconX className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={clsx(
              'flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition',
              disabled
                ? 'cursor-not-allowed border-neutral-200/60 bg-neutral-50/50 text-neutral-300'
                : 'border-neutral-300/80 bg-white text-mc-600 hover:border-mc-900/30 hover:bg-neutral-50 hover:text-mc-900 active:scale-[0.98]',
            )}
          >
            <IconPlus className="h-5 w-5" />
            <span className="text-[9px] font-semibold">Subir</span>
          </button>
        )}

        {hasImage ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="text-[12px] font-medium text-mc-700 underline decoration-mc-300 underline-offset-2 hover:text-mc-900"
          >
            Cambiar foto
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f?.type.startsWith('image/')) onChange(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
