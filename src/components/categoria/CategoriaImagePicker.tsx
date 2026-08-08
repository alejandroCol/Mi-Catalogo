import clsx from 'clsx'
import { McFileInputLabel } from '@/components/McFileInputLabel'

type Props = {
  previewUrl: string | null
  /** Inicial del nombre si no hay foto. */
  fallbackLetter?: string
  disabled?: boolean
  uploading?: boolean
  size?: 'sm' | 'md'
  onPick: (file: File) => void
  onRemove?: () => void
}

export function CategoriaImagePicker({
  previewUrl,
  fallbackLetter,
  disabled = false,
  uploading = false,
  size = 'md',
  onPick,
  onRemove,
}: Props) {
  const busy = disabled || uploading
  const dim = size === 'sm' ? 'h-14 w-14' : 'h-[4.5rem] w-[4.5rem]'

  return (
    <div className="flex items-center gap-3">
      <div className={clsx('relative shrink-0', dim)}>
        {previewUrl ? (
          <div className="h-full w-full overflow-hidden rounded-full border border-neutral-200/80 bg-white shadow-sm ring-1 ring-black/[0.04]">
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            ) : null}
          </div>
        ) : (
          <McFileInputLabel
            accept="image/*"
            disabled={busy}
            onFiles={(files) => {
              const f = files[0]
              if (f?.type.startsWith('image/')) onPick(f)
            }}
            className={clsx(
              'flex h-full w-full flex-col items-center justify-center rounded-full border-2 border-dashed transition',
              busy
                ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-300'
                : 'cursor-pointer border-neutral-300/90 bg-white text-mc-500 hover:border-mc-900/35 hover:text-mc-800',
            )}
          >
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-mc-700" />
            ) : fallbackLetter ? (
              <span className="text-[15px] font-bold text-mc-700">{fallbackLetter}</span>
            ) : (
              <span className="text-[18px] font-light leading-none">+</span>
            )}
          </McFileInputLabel>
        )}
        {previewUrl && onRemove && !uploading ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white shadow"
            aria-label="Quitar imagen"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="min-w-0">
        <McFileInputLabel
          accept="image/*"
          disabled={busy}
          onFiles={(files) => {
            const f = files[0]
            if (f?.type.startsWith('image/')) onPick(f)
          }}
          className={clsx(
            'text-[12px] font-semibold underline underline-offset-2',
            busy ? 'cursor-not-allowed text-mc-400' : 'cursor-pointer text-mc-800 hover:text-mc-950',
          )}
        >
          {uploading ? 'Subiendo…' : previewUrl ? 'Cambiar foto' : 'Agregar foto'}
        </McFileInputLabel>
        <p className="mt-0.5 text-[11px] leading-snug text-mc-500">Cuadrada, se ve en círculo.</p>
      </div>
    </div>
  )
}
