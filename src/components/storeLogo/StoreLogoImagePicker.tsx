import clsx from 'clsx'
import { McFileInputLabel } from '@/components/McFileInputLabel'
import { StoreLogoCatalogHeaderPreview } from '@/components/storeLogo/StoreLogoCatalogHeaderPreview'
import {
  STORE_LOGO_IMAGE_SPECS,
  formatStoreLogoDimensions,
} from '@/lib/storeLogo'
import type { McTenant } from '@/types/mc'

type Props = {
  tenant: McTenant
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

function IconImage({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
      />
    </svg>
  )
}

function LogoDimensionChip() {
  const { recommended, minimum } = STORE_LOGO_IMAGE_SPECS

  return (
    <div className="rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-[11px] font-semibold text-mc-900">{recommended.label}</p>
      <p className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums text-mc-800">
        {formatStoreLogoDimensions(recommended.width, recommended.height)}
      </p>
      <p className="mt-0.5 text-[10px] text-mc-500">Proporción {recommended.ratio} · se recorta en círculo</p>
      <p className="mt-2 border-t border-neutral-100 pt-2 text-[10px] leading-relaxed text-mc-500">
        Mínimo{' '}
        <span className="font-mono font-medium tabular-nums text-mc-600">
          {formatStoreLogoDimensions(minimum.width, minimum.height)}
        </span>
      </p>
    </div>
  )
}

function pickImageFile(files: FileList, onPick: (file: File) => void) {
  const f = files[0]
  if (f?.type.startsWith('image/')) onPick(f)
}

export function StoreLogoImagePicker({
  tenant,
  previewUrl,
  disabled = false,
  uploading = false,
  onPick,
  onRemove,
}: Props) {
  const busy = disabled || uploading
  const hasImage = !!previewUrl
  const { recommended } = STORE_LOGO_IMAGE_SPECS

  const pickProps = {
    accept: 'image/*',
    disabled: busy,
    onFiles: (files: FileList) => pickImageFile(files, onPick),
  }

  return (
    <div className="space-y-5">
      {!hasImage && (
        <div className="rounded-xl border border-dashed border-neutral-300/90 bg-white/70 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-mc-600">
              <IconImage className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="ios-footnote font-semibold text-mc-900">Tamaño sugerido para subir</p>
              <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
                Usá una imagen cuadrada con buena resolución. Fondo neutro o transparente para que se vea prolijo en el
                círculo del catálogo.
              </p>
            </div>
          </div>
          <div className="mt-3 max-w-xs">
            <LogoDimensionChip />
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-mc-500">
            Se optimiza automáticamente al subir (JPEG, hasta{' '}
            {STORE_LOGO_IMAGE_SPECS.compressionMaxEdgePx.toLocaleString('es')} px).
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-5">
        {hasImage ? (
          <div className="relative h-[120px] w-[120px] shrink-0 sm:h-[132px] sm:w-[132px]">
            <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-mc-900/15 shadow-md ring-2 ring-mc-900/8">
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              {uploading ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 text-white backdrop-blur-[2px]"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="text-[10px] font-semibold tracking-wide">Guardando…</span>
                </div>
              ) : null}
            </div>
            {!uploading ? (
              <button
                type="button"
                disabled={busy}
                onClick={onRemove}
                className="absolute -right-0.5 -top-0.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-black/70 text-white shadow-md transition hover:bg-red-600 active:scale-95"
                aria-label="Quitar logo"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : (
          <McFileInputLabel
            {...pickProps}
            className={clsx(
              'group relative flex h-[120px] w-[120px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-full border-2 border-dashed transition sm:h-[132px] sm:w-[132px]',
              busy
                ? 'cursor-not-allowed border-neutral-200/60 bg-neutral-50/50 text-neutral-300'
                : 'cursor-pointer border-neutral-300 bg-white text-mc-600 hover:border-mc-900/40 hover:bg-white hover:text-mc-900 active:scale-[0.98]',
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 transition group-hover:bg-neutral-50">
              {uploading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-mc-700" />
              ) : (
                <IconPlus className="h-5 w-5" />
              )}
            </span>
            <span className="px-3 text-center text-[10px] font-semibold leading-tight">
              {uploading ? 'Guardando…' : 'Subir logo'}
            </span>
            {!uploading && (
              <span className="rounded-full bg-mc-900/[0.05] px-2 py-0.5 font-mono text-[9px] font-semibold tabular-nums text-mc-600">
                {formatStoreLogoDimensions(recommended.width, recommended.height)}
              </span>
            )}
          </McFileInputLabel>
        )}

        <div className="min-w-0 flex-1 space-y-2 pt-2">
          {hasImage ? (
            <>
              <p className="ios-footnote font-medium text-mc-800">
                {uploading ? 'Guardando tu logo…' : 'Logo activo en tu catálogo'}
              </p>
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
                {uploading ? 'Guardando…' : 'Cambiar logo'}
              </McFileInputLabel>
            </>
          ) : (
            <>
              <p className="ios-footnote font-medium text-mc-800">Subí el logo de tu tienda</p>
              <p className="text-[12px] leading-relaxed text-mc-600">
                Tocá el círculo o elegí un archivo JPG/PNG. Se guarda automáticamente al seleccionarlo.
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
                {uploading ? 'Guardando…' : 'Elegir archivo'}
              </McFileInputLabel>
            </>
          )}
        </div>
      </div>

      {hasImage && previewUrl && (
        <StoreLogoCatalogHeaderPreview tenant={tenant} logoUrl={previewUrl} />
      )}
    </div>
  )
}
