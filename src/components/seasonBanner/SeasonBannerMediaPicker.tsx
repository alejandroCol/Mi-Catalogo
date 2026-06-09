import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { McFileInputLabel } from '@/components/McFileInputLabel'
import {
  SEASON_BANNER_IMAGE_SPECS,
  SEASON_BANNER_VIDEO_SPECS,
  formatSeasonBannerDimensions,
} from '@/lib/seasonBanner'
import { SeasonBannerImageLoadedPreview } from '@/components/seasonBanner/SeasonBannerImageLoadedPreview'
import { SeasonBannerMediaUploadSlot } from '@/components/seasonBanner/SeasonBannerMediaUploadSlot'
import { SeasonBannerVideoLoadedPreview } from '@/components/seasonBanner/SeasonBannerVideoLoadedPreview'
import {
  analyzeSeasonBannerVideo,
  formatVideoFileSize,
  validateSeasonBannerVideo,
} from '@/lib/seasonBannerVideo'
import type { McSeasonBannerMediaType } from '@/types/mc'

type VideoPreviewMeta = {
  durationSec: number
  width: number
  height: number
  sizeBytes: number
  optimized?: boolean
}

type Props = {
  mediaType: McSeasonBannerMediaType
  imageUrl: string | null
  videoUrl: string | null
  posterUrl: string | null
  disabled?: boolean
  uploading?: boolean
  processing?: boolean
  processingLabel?: string
  processingPercent?: number
  onMediaTypeChange: (type: McSeasonBannerMediaType) => void
  onPickImage: (file: File) => void
  onPickVideo: (file: File) => void
  onRemoveImage: () => void
  onRemoveVideo: () => void
  error?: string | null
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

function IconVideo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
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

function MediaTypeToggle({
  value,
  disabled,
  onChange,
}: {
  value: McSeasonBannerMediaType
  disabled?: boolean
  onChange: (v: McSeasonBannerMediaType) => void
}) {
  const options: { id: McSeasonBannerMediaType; label: string; icon: typeof IconImage }[] = [
    { id: 'image', label: 'Foto', icon: IconImage },
    { id: 'video', label: 'Video', icon: IconVideo },
  ]

  return (
    <div
      className="inline-flex rounded-xl border border-neutral-200/90 bg-neutral-100/80 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
      role="tablist"
      aria-label="Tipo de fondo del banner"
    >
      {options.map(({ id, label, icon: Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition',
              active
                ? 'bg-white text-mc-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-mc-600 hover:text-mc-800',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function VideoPreviewCard({
  videoUrl,
  posterUrl,
  meta,
  busy,
  processing,
  processingLabel,
  processingPercent,
  onRemove,
  onPick,
}: {
  videoUrl: string
  posterUrl: string | null
  meta: VideoPreviewMeta | null
  busy: boolean
  processing?: boolean
  processingLabel?: string
  processingPercent?: number
  onRemove: () => void
  onPick: (file: File) => void
}) {
  const durationOk =
    meta &&
    meta.durationSec >= SEASON_BANNER_VIDEO_SPECS.minDurationSec &&
    meta.durationSec <= SEASON_BANNER_VIDEO_SPECS.maxDurationSec

  return (
    <div className="flex flex-wrap items-start gap-4">
      <SeasonBannerVideoLoadedPreview
        videoUrl={videoUrl}
        posterUrl={posterUrl}
        durationSec={meta?.durationSec}
        durationOk={durationOk ?? true}
        busy={busy}
        processing={processing}
        processingLabel={processingLabel}
        processingPercent={processingPercent}
        onRemove={onRemove}
      />

      <div className="min-w-0 flex-1 space-y-2.5 pt-1">
        <p className="ios-footnote font-medium text-mc-800">Video de campaña cargado</p>
        {meta && (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-mc-700">
              {formatSeasonBannerDimensions(meta.width, meta.height)}
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-mc-700">
              {formatVideoFileSize(meta.sizeBytes)}
            </span>
            {meta.optimized && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                Optimizado para web
              </span>
            )}
          </div>
        )}
        <p className="text-[12px] leading-relaxed text-mc-600">
          Así se recorta en celular (vertical) y en escritorio (horizontal). Se reproduce en loop sin sonido
          al entrar al catálogo. Guardá para publicarlo.
        </p>
        <McFileInputLabel
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          disabled={busy}
          onFiles={(files) => {
            const f = files[0]
            if (f?.type.startsWith('video/')) onPick(f)
          }}
          className={clsx(
            'text-[13px] font-medium text-mc-700 underline decoration-mc-300 underline-offset-2 hover:text-mc-900',
            busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          )}
        >
          {uploadingLabel(busy, processing)}
        </McFileInputLabel>
      </div>
    </div>
  )
}

function uploadingLabel(busy: boolean, processing?: boolean): string {
  if (processing) return 'Procesando…'
  if (busy) return 'Subiendo…'
  return 'Cambiar video'
}

function ImageSection({
  imageUrl,
  busy,
  uploading,
  onPick,
  onRemove,
}: {
  imageUrl: string | null
  busy: boolean
  uploading?: boolean
  onPick: (file: File) => void
  onRemove: () => void
}) {
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
            <p className="ios-footnote font-semibold text-mc-900">Medidas recomendadas</p>
            <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
              La imagen ocupa toda la pantalla. Evitá textos pequeños en la foto; el título va encima.
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
          Se optimiza automáticamente al subir (JPEG, hasta 1600 px).
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {hasImage ? (
          <SeasonBannerImageLoadedPreview imageUrl={imageUrl} busy={busy} onRemove={onRemove} />
        ) : (
          <SeasonBannerMediaUploadSlot
            variant="image"
            accept={pickProps.accept}
            disabled={pickProps.disabled}
            uploading={uploading}
            idleLabel="Subir foto"
            onFiles={pickProps.onFiles}
          />
        )}

        <div className="min-w-0 flex-1 space-y-2 pt-1">
          {hasImage ? (
            <>
              <p className="ios-footnote font-medium text-mc-800">Imagen de campaña cargada</p>
              <p className="text-[12px] leading-relaxed text-mc-600">
                Así se recorta en celular (vertical) y en escritorio (horizontal). Guardá el banner para
                publicarla en tu catálogo.
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
              <p className="text-[12px] leading-relaxed text-mc-600">JPG o PNG desde tu dispositivo.</p>
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

function VideoSection({
  videoUrl,
  posterUrl,
  videoMeta,
  busy,
  uploading,
  processing,
  processingLabel,
  processingPercent,
  onPick,
  onRemove,
  error,
}: {
  videoUrl: string | null
  posterUrl: string | null
  videoMeta: VideoPreviewMeta | null
  busy: boolean
  uploading?: boolean
  processing?: boolean
  processingLabel?: string
  processingPercent?: number
  onPick: (file: File) => void
  onRemove: () => void
  error?: string | null
}) {
  const hasVideo = !!videoUrl

  const pickProps = {
    accept: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm',
    disabled: busy,
    onFiles: (files: FileList) => {
      const f = files[0]
      if (f?.type.startsWith('video/')) onPick(f)
    },
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 via-white to-white px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <IconVideo className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="ios-footnote font-semibold text-mc-900">Video corto en loop</p>
            <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
              Ideal para mostrar tu colección en movimiento. Se reproduce sin sonido y en bucle al entrar.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-violet-100 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <p className="text-[11px] font-semibold text-violet-900">Duración ideal</p>
            <p className="mt-0.5 font-mono text-[12px] font-medium tabular-nums text-violet-800">
              {SEASON_BANNER_VIDEO_SPECS.recommendedDurationSec.min}–
              {SEASON_BANNER_VIDEO_SPECS.recommendedDurationSec.max} s
            </p>
            <p className="mt-0.5 text-[10px] text-violet-600">
              Máximo {SEASON_BANNER_VIDEO_SPECS.maxDurationSec} s
            </p>
          </div>
          <DimensionChip
            label={SEASON_BANNER_VIDEO_SPECS.vertical.label}
            width={SEASON_BANNER_VIDEO_SPECS.vertical.width}
            height={SEASON_BANNER_VIDEO_SPECS.vertical.height}
            ratio={SEASON_BANNER_VIDEO_SPECS.vertical.ratio}
          />
          <DimensionChip
            label={SEASON_BANNER_VIDEO_SPECS.horizontal.label}
            width={SEASON_BANNER_VIDEO_SPECS.horizontal.width}
            height={SEASON_BANNER_VIDEO_SPECS.horizontal.height}
            ratio={SEASON_BANNER_VIDEO_SPECS.horizontal.ratio}
          />
        </div>

        <p className="mt-2.5 text-[11px] leading-relaxed text-mc-500">
          Al subir, optimizamos a 720p MP4 sin audio para ahorrar espacio (~2–5 MB).
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-[13px] leading-relaxed text-red-800">
          {error}
        </div>
      )}

      {hasVideo ? (
        <VideoPreviewCard
          videoUrl={videoUrl}
          posterUrl={posterUrl}
          meta={videoMeta}
          busy={busy}
          processing={processing}
          processingLabel={processingLabel}
          processingPercent={processingPercent}
          onRemove={onRemove}
          onPick={onPick}
        />
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          <SeasonBannerMediaUploadSlot
            variant="video"
            accept={pickProps.accept}
            disabled={pickProps.disabled}
            uploading={uploading}
            processing={processing}
            processingLabel={processingLabel}
            processingPercent={processingPercent}
            idleLabel="Subir video"
            onFiles={pickProps.onFiles}
          />

          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <p className="ios-footnote font-medium text-mc-800">Subí un clip de tu campaña</p>
            <p className="text-[12px] leading-relaxed text-mc-600">
              MP4, MOV o WebM. Validamos duración y comprimimos antes de subir.
            </p>
            <McFileInputLabel
              {...pickProps}
              className={clsx(
                'inline-flex items-center justify-center rounded-lg border px-3.5 py-2 text-[13px] font-medium transition',
                busy
                  ? 'cursor-not-allowed border-neutral-200/60 bg-neutral-50 text-neutral-400'
                  : 'cursor-pointer border-violet-200/90 bg-white text-violet-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-violet-300 hover:bg-violet-50/50 active:scale-[0.99]',
              )}
            >
              {processing ? 'Procesando…' : uploading ? 'Subiendo…' : 'Elegir video'}
            </McFileInputLabel>
          </div>
        </div>
      )}

    </div>
  )
}

export function SeasonBannerMediaPicker({
  mediaType,
  imageUrl,
  videoUrl,
  posterUrl,
  disabled = false,
  uploading = false,
  processing = false,
  processingLabel,
  processingPercent,
  onMediaTypeChange,
  onPickImage,
  onPickVideo,
  onRemoveImage,
  onRemoveVideo,
  error,
}: Props) {
  const busy = disabled || uploading || processing
  const [videoMeta, setVideoMeta] = useState<VideoPreviewMeta | null>(null)

  useEffect(() => {
    if (!videoUrl) {
      setVideoMeta(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(videoUrl, { method: 'HEAD' })
        const sizeHeader = res.headers.get('content-length')
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.src = videoUrl
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve()
          video.onerror = () => reject()
        })
        if (!cancelled) {
          setVideoMeta({
            durationSec: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            sizeBytes: sizeHeader ? Number(sizeHeader) : 0,
          })
        }
      } catch {
        if (!cancelled) setVideoMeta(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [videoUrl])

  return (
    <div className="space-y-5">
      <MediaTypeToggle value={mediaType} disabled={busy} onChange={onMediaTypeChange} />

      {mediaType === 'image' ? (
        <ImageSection
          imageUrl={imageUrl}
          busy={busy}
          uploading={uploading}
          onPick={onPickImage}
          onRemove={onRemoveImage}
        />
      ) : (
        <VideoSection
          videoUrl={videoUrl}
          posterUrl={posterUrl}
          videoMeta={videoMeta}
          busy={busy}
          uploading={uploading}
          processing={processing}
          processingLabel={processingLabel}
          processingPercent={processingPercent}
          onPick={onPickVideo}
          onRemove={onRemoveVideo}
          error={error}
        />
      )}
    </div>
  )
}

/** Analiza un archivo local antes de procesarlo (feedback inmediato en el picker). */
export async function previewLocalVideoMeta(file: File): Promise<VideoPreviewMeta | null> {
  try {
    const analysis = await analyzeSeasonBannerVideo(file)
    const validation = validateSeasonBannerVideo(analysis)
    if (!validation.ok) return null
    return {
      durationSec: analysis.durationSec,
      width: analysis.width,
      height: analysis.height,
      sizeBytes: analysis.sizeBytes,
    }
  } catch {
    return null
  }
}
