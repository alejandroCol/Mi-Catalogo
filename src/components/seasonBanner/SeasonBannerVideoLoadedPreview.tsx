import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { SEASON_BANNER_VIDEO_SPECS } from '@/lib/seasonBanner'
import { formatVideoDuration } from '@/lib/seasonBannerVideo'

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11.04-7.36a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
    </svg>
  )
}

function ProcessingOverlay({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/55 px-4 backdrop-blur-[2px]">
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
  videoUrl: string
  posterUrl: string | null
  durationSec?: number
  durationOk?: boolean
  busy?: boolean
  processing?: boolean
  processingLabel?: string
  processingPercent?: number
  onRemove: () => void
}

function VideoPreviewFrame({
  label,
  ratioClass,
  widthClass,
  videoRef,
  videoUrl,
  posterUrl,
  onPlay,
  onPause,
  badge,
}: {
  label: string
  ratioClass: string
  widthClass: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  videoUrl: string
  posterUrl: string | null
  onPlay: () => void
  onPause: () => void
  badge?: React.ReactNode
}) {
  return (
    <div className={clsx('space-y-1.5', widthClass)}>
      <p className="text-[10px] font-semibold leading-tight text-mc-600">{label}</p>
      <div
        className={clsx(
          'relative overflow-hidden rounded-xl border-2 border-mc-900/20 shadow-md ring-2 ring-mc-900/10',
          ratioClass,
        )}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl ?? undefined}
          className="h-full w-full object-cover object-center"
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={onPlay}
          onPause={onPause}
        />
        {badge}
      </div>
    </div>
  )
}

export function SeasonBannerVideoLoadedPreview({
  videoUrl,
  posterUrl,
  durationSec,
  durationOk = true,
  busy = false,
  processing = false,
  processingLabel,
  processingPercent = 0,
  onRemove,
}: Props) {
  const verticalRef = useRef<HTMLVideoElement>(null)
  const horizontalRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setPlaying(false)
    verticalRef.current?.pause()
    horizontalRef.current?.pause()
  }, [videoUrl])

  function syncPlaying(next: boolean) {
    setPlaying(next)
  }

  function togglePlay() {
    if (processing) return
    const vertical = verticalRef.current
    const horizontal = horizontalRef.current
    if (!vertical || !horizontal) return
    if (vertical.paused) {
      void Promise.all([vertical.play(), horizontal.play()])
        .then(() => syncPlaying(true))
        .catch(() => syncPlaying(false))
    } else {
      vertical.pause()
      horizontal.pause()
      syncPlaying(false)
    }
  }

  return (
    <div className="relative flex flex-wrap gap-3 sm:gap-4">
      <VideoPreviewFrame
        label={SEASON_BANNER_VIDEO_SPECS.vertical.label}
        ratioClass="aspect-[9/16]"
        widthClass="w-[108px] shrink-0 sm:w-[120px]"
        videoRef={verticalRef}
        videoUrl={videoUrl}
        posterUrl={posterUrl}
        onPlay={() => syncPlaying(true)}
        onPause={() => {
          if (verticalRef.current?.paused && horizontalRef.current?.paused) syncPlaying(false)
        }}
        badge={
          durationSec != null ? (
            <span
              className={clsx(
                'absolute bottom-2 left-2 z-10 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums backdrop-blur-sm',
                durationOk ? 'bg-emerald-600/85 text-white' : 'bg-amber-500/90 text-white',
              )}
            >
              {formatVideoDuration(durationSec)}
            </span>
          ) : null
        }
      />
      <VideoPreviewFrame
        label={SEASON_BANNER_VIDEO_SPECS.horizontal.label}
        ratioClass="aspect-video"
        widthClass="w-[172px] shrink-0 sm:w-[196px]"
        videoRef={horizontalRef}
        videoUrl={videoUrl}
        posterUrl={posterUrl}
        onPlay={() => syncPlaying(true)}
        onPause={() => {
          if (verticalRef.current?.paused && horizontalRef.current?.paused) syncPlaying(false)
        }}
      />

      {!processing && (
        <button
          type="button"
          className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/0 transition hover:bg-black/10"
          onClick={togglePlay}
          aria-label={playing ? 'Pausar vista previa' : 'Reproducir vista previa'}
        >
          {!playing && (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
              <IconPlay className="ml-0.5 h-5 w-5" />
            </span>
          )}
        </button>
      )}

      {processing && (
        <ProcessingOverlay label={processingLabel ?? 'Procesando…'} percent={processingPercent} />
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onRemove}
        className="absolute -right-1 -top-1 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur-sm transition hover:bg-red-600 active:scale-95 sm:right-0 sm:top-0"
        aria-label="Quitar video de campaña"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
