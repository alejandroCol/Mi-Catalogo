import clsx from 'clsx'
import { McFileInputLabel } from '@/components/McFileInputLabel'

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function ProcessingOverlay({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 px-4 backdrop-blur-[2px]">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <p className="text-center text-[11px] font-medium text-white">{label}</p>
      <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  )
}

type Props = {
  variant: 'image' | 'video'
  accept: string
  disabled?: boolean
  uploading?: boolean
  processing?: boolean
  processingLabel?: string
  processingPercent?: number
  idleLabel: string
  uploadingLabel?: string
  processingIdleLabel?: string
  onFiles: (files: FileList) => void
}

export function SeasonBannerMediaUploadSlot({
  variant,
  accept,
  disabled = false,
  uploading = false,
  processing = false,
  processingLabel,
  processingPercent = 0,
  idleLabel,
  uploadingLabel = 'Subiendo…',
  processingIdleLabel = 'Optimizando…',
  onFiles,
}: Props) {
  const busy = disabled || uploading || processing
  const isVideo = variant === 'video'
  const statusLabel = processing ? processingIdleLabel : uploading ? uploadingLabel : idleLabel

  return (
    <McFileInputLabel
      accept={accept}
      disabled={busy}
      onFiles={onFiles}
      className={clsx(
        'relative flex aspect-video w-full min-w-[200px] max-w-[320px] shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition sm:w-[280px]',
        isVideo
          ? busy
            ? 'cursor-not-allowed border-neutral-200/60 bg-neutral-50/50 text-neutral-300'
            : 'cursor-pointer border-violet-300/80 bg-gradient-to-b from-violet-50/50 to-white text-violet-700 hover:border-violet-400 hover:from-violet-50 active:scale-[0.98]'
          : busy
            ? 'cursor-not-allowed border-neutral-200/60 bg-neutral-50/50 text-neutral-300'
            : 'cursor-pointer border-neutral-300 bg-white text-mc-600 hover:border-mc-900/40 hover:bg-white hover:text-mc-900 active:scale-[0.98]',
      )}
    >
      {processing && (
        <ProcessingOverlay label={processingLabel ?? 'Procesando…'} percent={processingPercent} />
      )}
      <span
        className={clsx(
          'flex h-10 w-10 items-center justify-center rounded-full',
          isVideo ? 'bg-violet-100/80' : 'bg-neutral-100',
        )}
      >
        {processing || uploading ? (
          <span
            className={clsx(
              'h-5 w-5 animate-spin rounded-full border-2',
              isVideo ? 'border-violet-200 border-t-violet-600' : 'border-neutral-300 border-t-mc-700',
            )}
          />
        ) : (
          <IconPlus className="h-5 w-5" />
        )}
      </span>
      <span className="px-3 text-center text-[11px] font-semibold leading-tight">{statusLabel}</span>
    </McFileInputLabel>
  )
}
