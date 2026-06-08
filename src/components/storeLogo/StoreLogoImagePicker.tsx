import clsx from 'clsx'
import { McFileInputLabel } from '@/components/McFileInputLabel'

type Props = {
  previewUrl: string | null
  disabled?: boolean
  uploading?: boolean
  onPick: (file: File) => void
  onRemove: () => void
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

function pickImageFile(files: FileList, onPick: (file: File) => void) {
  const f = files[0]
  if (f?.type.startsWith('image/')) onPick(f)
}

export function StoreLogoImagePicker({
  previewUrl,
  disabled = false,
  uploading = false,
  onPick,
  onRemove,
}: Props) {
  const busy = disabled || uploading
  const hasImage = !!previewUrl

  const pickProps = {
    accept: 'image/*',
    disabled: busy,
    onFiles: (files: FileList) => pickImageFile(files, onPick),
  }

  return (
    <div className="flex flex-wrap items-start gap-5">
      {hasImage ? (
        <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-full border-2 border-mc-900/15 shadow-md ring-2 ring-mc-900/8 sm:h-[132px] sm:w-[132px]">
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition hover:bg-red-600 active:scale-95"
            aria-label="Quitar logo"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <McFileInputLabel
          {...pickProps}
          className={clsx(
            'flex h-[120px] w-[120px] shrink-0 flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed transition sm:h-[132px] sm:w-[132px]',
            busy
              ? 'cursor-not-allowed border-neutral-200/60 bg-neutral-50/50 text-neutral-300'
              : 'cursor-pointer border-neutral-300 bg-white text-mc-600 hover:border-mc-900/40 hover:bg-white hover:text-mc-900 active:scale-[0.98]',
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
            {uploading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-mc-700" />
            ) : (
              <IconPlus className="h-5 w-5" />
            )}
          </span>
          <span className="px-3 text-center text-[10px] font-semibold leading-tight">
            {uploading ? 'Subiendo…' : 'Subir logo'}
          </span>
        </McFileInputLabel>
      )}

      <div className="min-w-0 flex-1 space-y-2 pt-2">
        {hasImage ? (
          <>
            <p className="ios-footnote font-medium text-mc-800">Logo listo para guardar</p>
            <p className="text-[12px] leading-relaxed text-mc-600">
              Se muestra como un círculo junto al nombre de tu tienda en el catálogo público.
            </p>
            <McFileInputLabel
              {...pickProps}
              className={clsx(
                'text-[13px] font-medium text-mc-700 underline decoration-mc-300 underline-offset-2 hover:text-mc-900',
                busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              )}
            >
              {uploading ? 'Subiendo…' : 'Cambiar logo'}
            </McFileInputLabel>
          </>
        ) : (
          <>
            <p className="ios-footnote font-medium text-mc-800">Subí el logo de tu tienda</p>
            <p className="text-[12px] leading-relaxed text-mc-600">
              Imagen cuadrada, fondo neutro o transparente. Se optimiza automáticamente al guardar.
            </p>
            <McFileInputLabel
              {...pickProps}
              className={clsx(
                'inline-flex items-center justify-center rounded-lg border px-3.5 py-2 text-[13px] font-medium transition',
                busy
                  ? 'cursor-not-allowed border-neutral-200/60 bg-neutral-50 text-neutral-400'
                  : 'cursor-pointer border-neutral-300/90 bg-white text-mc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-mc-900/25 hover:bg-neutral-50 active:scale-[0.99]',
              )}
            >
              {uploading ? 'Subiendo…' : 'Elegir archivo'}
            </McFileInputLabel>
          </>
        )}
      </div>
    </div>
  )
}
