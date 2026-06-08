import clsx from 'clsx'
import { McFileInputLabel } from '@/components/McFileInputLabel'
import {
  SEASON_BANNER_IMAGE_SPECS,
  formatSeasonBannerDimensions,
} from '@/lib/seasonBanner'

type Props = {
  imageUrl: string | null
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

function DimensionChip({
  label,
  width,
  height,
  ratio,
}: {
  label: string
  width: number
  height: number
  ratio: string
}) {
  return (
    <div className="rounded-lg border border-neutral-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-[11px] font-semibold text-mc-900">{label}</p>
      <p className="mt-0.5 font-mono text-[12px] font-medium tabular-nums text-mc-700">
        {formatSeasonBannerDimensions(width, height)}
      </p>
      <p className="mt-0.5 text-[10px] text-mc-500">Proporción {ratio}</p>
    </div>
  )
}

export function SeasonBannerImagePicker({
  imageUrl,
  disabled = false,
  uploading = false,
  onPick,
  onRemove,
}: Props) {
  const busy = disabled || uploading
  const hasImage = !!imageUrl

  const pickProps = {
    accept: 'image/*',
    disabled: busy,
    onFiles: (files: FileList) => {
      const f = files[0]
      if (f?.type.startsWith('image/')) onPick(f)
    },
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-neutral-300/90 bg-white/70 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-mc-600">
            <IconImage className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="ios-footnote font-semibold text-mc-900">Medidas recomendadas antes de subir</p>
            <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
              La imagen ocupa toda la pantalla al entrar al catálogo. Usá buena luz y evitá textos pequeños en la
              foto; el título va encima.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <DimensionChip
            label={SEASON_BANNER_IMAGE_SPECS.vertical.label}
            width={SEASON_BANNER_IMAGE_SPECS.vertical.width}
            height={SEASON_BANNER_IMAGE_SPECS.vertical.height}
            ratio={SEASON_BANNER_IMAGE_SPECS.vertical.ratio}
          />
          <DimensionChip
            label={SEASON_BANNER_IMAGE_SPECS.horizontal.label}
            width={SEASON_BANNER_IMAGE_SPECS.horizontal.width}
            height={SEASON_BANNER_IMAGE_SPECS.horizontal.height}
            ratio={SEASON_BANNER_IMAGE_SPECS.horizontal.ratio}
          />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-mc-500">
          Mínimo sugerido:{' '}
          <span className="font-mono font-medium tabular-nums text-mc-600">
            {formatSeasonBannerDimensions(
              SEASON_BANNER_IMAGE_SPECS.minimum.width,
              SEASON_BANNER_IMAGE_SPECS.minimum.height,
            )}
          </span>
          . Se optimiza automáticamente al subir (JPEG, hasta 1600 px).
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {hasImage ? (
          <div className="relative aspect-[9/16] w-[120px] shrink-0 overflow-hidden rounded-xl border-2 border-mc-900/20 shadow-md ring-2 ring-mc-900/10 sm:w-[132px]">
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              disabled={busy}
              onClick={onRemove}
              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition hover:bg-red-600 active:scale-95"
              aria-label="Quitar imagen de campaña"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <McFileInputLabel
            {...pickProps}
            className={clsx(
              'flex aspect-[9/16] w-[120px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition sm:w-[132px]',
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
            <span className="px-2 text-center text-[10px] font-semibold leading-tight">
              {uploading ? 'Subiendo…' : 'Subir foto'}
            </span>
          </McFileInputLabel>
        )}

        <div className="min-w-0 flex-1 space-y-2 pt-1">
          {hasImage ? (
            <>
              <p className="ios-footnote font-medium text-mc-800">Imagen de campaña cargada</p>
              <p className="text-[12px] leading-relaxed text-mc-600">
                Guardá el banner para publicarla en tu catálogo. Podés cambiarla cuando quieras.
              </p>
              <McFileInputLabel
                {...pickProps}
                className={clsx(
                  'text-[13px] font-medium text-mc-700 underline decoration-mc-300 underline-offset-2 hover:text-mc-900',
                  busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                )}
              >
                {uploading ? 'Subiendo…' : 'Cambiar foto'}
              </McFileInputLabel>
            </>
          ) : (
            <>
              <p className="ios-footnote font-medium text-mc-800">Subí la foto de tu campaña</p>
              <p className="text-[12px] leading-relaxed text-mc-600">
                Tocá el recuadro o elegí un archivo JPG/PNG desde tu dispositivo.
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
    </div>
  )
}
