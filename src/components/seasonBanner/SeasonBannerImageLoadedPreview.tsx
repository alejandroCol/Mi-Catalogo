import clsx from 'clsx'
import { SEASON_BANNER_IMAGE_SPECS } from '@/lib/seasonBanner'

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

type Props = {
  imageUrl: string
  busy?: boolean
  onRemove: () => void
}

function PreviewFrame({
  label,
  ratioClass,
  widthClass,
  imageUrl,
}: {
  label: string
  ratioClass: string
  widthClass: string
  imageUrl: string
}) {
  return (
    <div className={clsx('space-y-1.5', widthClass)}>
      <p className="text-[10px] font-semibold leading-tight text-mc-600">{label}</p>
      <div
        className={clsx(
          'overflow-hidden rounded-xl border-2 border-mc-900/20 shadow-md ring-2 ring-mc-900/10',
          ratioClass,
        )}
      >
        <img src={imageUrl} alt="" className="h-full w-full object-cover object-center" />
      </div>
    </div>
  )
}

export function SeasonBannerImageLoadedPreview({ imageUrl, busy = false, onRemove }: Props) {
  return (
    <div className="relative flex flex-wrap gap-3 sm:gap-4">
      <PreviewFrame
        label={SEASON_BANNER_IMAGE_SPECS.vertical.label}
        ratioClass="aspect-[9/16]"
        widthClass="w-[108px] shrink-0 sm:w-[120px]"
        imageUrl={imageUrl}
      />
      <PreviewFrame
        label={SEASON_BANNER_IMAGE_SPECS.horizontal.label}
        ratioClass="aspect-video"
        widthClass="w-[172px] shrink-0 sm:w-[196px]"
        imageUrl={imageUrl}
      />
      <button
        type="button"
        disabled={busy}
        onClick={onRemove}
        className="absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition hover:bg-red-600 active:scale-95 sm:right-0 sm:top-0"
        aria-label="Quitar imagen de campaña"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
