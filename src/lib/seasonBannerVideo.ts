import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { SEASON_BANNER_VIDEO_SPECS } from '@/lib/seasonBanner'

export type SeasonBannerVideoAnalysis = {
  durationSec: number
  width: number
  height: number
  sizeBytes: number
  mimeType: string
}

export type SeasonBannerVideoValidation =
  | { ok: true }
  | { ok: false; message: string }

export type SeasonBannerVideoPrepareProgress = {
  phase: 'analyzing' | 'optimizing' | 'poster'
  percent: number
  label: string
}

export type PreparedSeasonBannerVideo = {
  video: File
  poster: File
  analysis: SeasonBannerVideoAnalysis
  optimized: boolean
}

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null

function isAcceptedVideoMime(mime: string): boolean {
  return (SEASON_BANNER_VIDEO_SPECS.acceptedMimeTypes as readonly string[]).includes(mime)
}

function videoElementFromFile(file: File | Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
    }

    video.onloadedmetadata = () => {
      resolve(video)
    }
    video.onerror = () => {
      cleanup()
      reject(new Error('No se pudo leer el video.'))
    }
    video.src = url
  })
}

/** Lee duración y dimensiones sin subir el archivo. */
export async function analyzeSeasonBannerVideo(file: File): Promise<SeasonBannerVideoAnalysis> {
  const video = await videoElementFromFile(file)
  try {
    const durationSec = Number.isFinite(video.duration) ? video.duration : 0
    return {
      durationSec,
      width: video.videoWidth,
      height: video.videoHeight,
      sizeBytes: file.size,
      mimeType: file.type || 'video/mp4',
    }
  } finally {
    URL.revokeObjectURL(video.src)
  }
}

export function validateSeasonBannerVideo(
  analysis: SeasonBannerVideoAnalysis,
): SeasonBannerVideoValidation {
  if (!isAcceptedVideoMime(analysis.mimeType)) {
    return {
      ok: false,
      message: 'Formato no compatible. Usá MP4, MOV o WebM.',
    }
  }
  if (analysis.durationSec < SEASON_BANNER_VIDEO_SPECS.minDurationSec) {
    return {
      ok: false,
      message: `El video es muy corto. Mínimo ${SEASON_BANNER_VIDEO_SPECS.minDurationSec} segundos.`,
    }
  }
  if (analysis.durationSec > SEASON_BANNER_VIDEO_SPECS.maxDurationSec) {
    return {
      ok: false,
      message: `Duración máxima ${SEASON_BANNER_VIDEO_SPECS.maxDurationSec} s. Ideal: ${SEASON_BANNER_VIDEO_SPECS.recommendedDurationSec.min}–${SEASON_BANNER_VIDEO_SPECS.recommendedDurationSec.max} s en loop.`,
    }
  }
  if (analysis.sizeBytes > SEASON_BANNER_VIDEO_SPECS.maxInputBytes) {
    return {
      ok: false,
      message: `El archivo supera ${formatVideoFileSize(SEASON_BANNER_VIDEO_SPECS.maxInputBytes)}. Elegí un clip más corto o de menor resolución.`,
    }
  }
  if (analysis.width < 480 || analysis.height < 480) {
    return {
      ok: false,
      message: 'Resolución muy baja. Mínimo sugerido 720×1280 px (vertical) o 1280×720 px (horizontal).',
    }
  }
  return { ok: true }
}

export function formatVideoDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds * 10) / 10)
  if (s < 60) return `${s.toLocaleString('es', { maximumFractionDigits: 1 })} s`
  const m = Math.floor(s / 60)
  const rest = Math.round((s % 60) * 10) / 10
  return `${m}:${rest.toString().padStart(2, '0')}`
}

export function formatVideoFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function needsOptimization(analysis: SeasonBannerVideoAnalysis): boolean {
  const longEdge = Math.max(analysis.width, analysis.height)
  return (
    analysis.sizeBytes > SEASON_BANNER_VIDEO_SPECS.optimizeAboveBytes ||
    longEdge > SEASON_BANNER_VIDEO_SPECS.maxLongEdgePx ||
    analysis.mimeType !== 'video/mp4'
  )
}

async function loadFfmpeg(onProgress?: (pct: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance
  if (ffmpegLoadPromise) return ffmpegLoadPromise

  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg()
    ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(Math.min(99, Math.round(progress * 100)))
    })
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegInstance = ffmpeg
    return ffmpeg
  })()

  return ffmpegLoadPromise
}

async function transcodeWithFfmpeg(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const ffmpeg = await loadFfmpeg(onProgress)
  const ext = file.name.match(/\.[^.]+$/i)?.[0]?.slice(1) || 'mp4'
  const inputName = `input.${ext}`

  await ffmpeg.writeFile(inputName, await fetchFile(file))
  await ffmpeg.exec([
    '-i',
    inputName,
    '-t',
    String(SEASON_BANNER_VIDEO_SPECS.maxDurationSec),
    '-vf',
    `scale='min(${SEASON_BANNER_VIDEO_SPECS.maxLongEdgePx},iw)':'min(${SEASON_BANNER_VIDEO_SPECS.maxLongEdgePx},ih)':force_original_aspect_ratio=decrease`,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    String(SEASON_BANNER_VIDEO_SPECS.crf),
    '-an',
    '-movflags',
    '+faststart',
    'output.mp4',
  ])

  const data = await ffmpeg.readFile('output.mp4')
  const bytes =
    data instanceof Uint8Array
      ? new Uint8Array(data)
      : new TextEncoder().encode(String(data))
  return new Blob([bytes.buffer], { type: 'video/mp4' })
}

/** Extrae un frame del video y lo comprime como JPEG para poster. */
export async function extractSeasonBannerPoster(videoBlob: Blob): Promise<File> {
  const video = await videoElementFromFile(videoBlob)
  try {
    await new Promise<void>((resolve, reject) => {
      video.currentTime = Math.min(0.4, Math.max(0, (video.duration || 1) * 0.08))
      video.onseeked = () => resolve()
      video.onerror = () => reject(new Error('No se pudo generar la miniatura.'))
    })

    const long = Math.max(video.videoWidth, video.videoHeight)
    const scale = long > 1280 ? 1280 / long : 1
    const w = Math.max(1, Math.round(video.videoWidth * scale))
    const h = Math.max(1, Math.round(video.videoHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo generar la miniatura.')
    ctx.drawImage(video, 0, 0, w, h)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la miniatura.'))), 'image/jpeg', 0.86)
    })

    const raw = new File([blob], 'poster.jpg', { type: 'image/jpeg' })
    return compressImageForUpload(raw, { maxEdgePx: 1280, jpegQuality: 0.84 })
  } finally {
    URL.revokeObjectURL(video.src)
  }
}

/**
 * Valida, optimiza (720p H.264 sin audio) y genera poster.
 * Videos ya livianos en MP4 pueden pasar sin transcodificar.
 */
export async function prepareSeasonBannerVideo(
  file: File,
  onProgress?: (progress: SeasonBannerVideoPrepareProgress) => void,
): Promise<PreparedSeasonBannerVideo> {
  onProgress?.({ phase: 'analyzing', percent: 5, label: 'Analizando video…' })
  const analysis = await analyzeSeasonBannerVideo(file)
  const validation = validateSeasonBannerVideo(analysis)
  if (!validation.ok) throw new Error(validation.message)

  let videoBlob: Blob = file
  let optimized = false

  if (needsOptimization(analysis)) {
    onProgress?.({ phase: 'optimizing', percent: 12, label: 'Optimizando para web…' })
    videoBlob = await transcodeWithFfmpeg(file, (pct) => {
      onProgress?.({
        phase: 'optimizing',
        percent: 12 + Math.round(pct * 0.72),
        label: 'Comprimiendo video…',
      })
    })
    optimized = true
  }

  if (videoBlob.size > SEASON_BANNER_VIDEO_SPECS.maxOutputBytes) {
    throw new Error(
      `Tras optimizar sigue pesando ${formatVideoFileSize(videoBlob.size)}. Usá un clip más corto (ideal ${SEASON_BANNER_VIDEO_SPECS.recommendedDurationSec.min}–${SEASON_BANNER_VIDEO_SPECS.recommendedDurationSec.max} s).`,
    )
  }

  onProgress?.({ phase: 'poster', percent: 90, label: 'Generando miniatura…' })
  const poster = await extractSeasonBannerPoster(videoBlob)

  const finalAnalysis = await analyzeSeasonBannerVideo(
    new File([videoBlob], 'hero.mp4', { type: 'video/mp4' }),
  )

  onProgress?.({ phase: 'poster', percent: 100, label: 'Listo' })

  return {
    video: new File([videoBlob], 'hero.mp4', { type: 'video/mp4', lastModified: Date.now() }),
    poster,
    analysis: finalAnalysis,
    optimized,
  }
}
