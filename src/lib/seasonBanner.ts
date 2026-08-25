import type { McSeasonBanner, McSeasonBannerMediaType, McTenant } from '@/types/mc'

export const SEASON_BANNER_DEFAULTS = {
  eyebrow: 'Nueva temporada',
  headline: 'Descubrí lo nuevo',
  subheadline: 'Piezas seleccionadas para este momento',
  ctaLabel: 'Ver colección',
} as const

export const SEASON_BANNER_LIMITS = {
  eyebrow: 48,
  headline: 72,
  subheadline: 140,
  ctaLabel: 32,
} as const

/** Medidas recomendadas para la imagen de campaña (pantalla completa, object-cover). */
export const SEASON_BANNER_IMAGE_SPECS = {
  vertical: { width: 1080, height: 1920, ratio: '9:16', label: 'Vertical (ideal en celular)' },
  horizontal: { width: 1920, height: 1080, ratio: '16:9', label: 'Horizontal (ideal en escritorio)' },
  minimum: { width: 1200, height: 1600 },
} as const

/**
 * Videos de banner: loops cortos (referencia e-commerce / hero autoplay).
 * Máx. 15 s (atención móvil); ideal 6–10 s para loop sin cansar.
 */
export const SEASON_BANNER_VIDEO_SPECS = {
  maxDurationSec: 15,
  minDurationSec: 2,
  recommendedDurationSec: { min: 6, max: 10 },
  maxLongEdgePx: 1280,
  crf: 28,
  maxInputBytes: 80 * 1024 * 1024,
  maxOutputBytes: 10 * 1024 * 1024,
  optimizeAboveBytes: 4 * 1024 * 1024,
  acceptedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'] as const,
  vertical: { width: 1080, height: 1920, ratio: '9:16', label: 'Vertical (ideal en celular)' },
  horizontal: { width: 1920, height: 1080, ratio: '16:9', label: 'Horizontal (ideal en escritorio)' },
} as const

export function formatSeasonBannerDimensions(width: number, height: number): string {
  return `${width.toLocaleString('es')} × ${height.toLocaleString('es')} px`
}

export function seasonBannerImageStoragePath(tenantId: string): string {
  return `mc_tenants/${tenantId}/season_banner/hero.jpg`
}

export function seasonBannerVideoStoragePath(tenantId: string): string {
  return `mc_tenants/${tenantId}/season_banner/hero.mp4`
}

export function seasonBannerPosterStoragePath(tenantId: string): string {
  return `mc_tenants/${tenantId}/season_banner/poster.jpg`
}

/** @deprecated Usar `seasonBannerImageStoragePath`. */
export function seasonBannerStoragePath(tenantId: string): string {
  return seasonBannerImageStoragePath(tenantId)
}

export const MC_CATALOGO_PRODUCTOS_ID = 'mc-catalogo-productos'

export function scrollToCatalogProducts(behavior: ScrollBehavior = 'smooth'): void {
  document.getElementById(MC_CATALOGO_PRODUCTOS_ID)?.scrollIntoView({ behavior, block: 'start' })
}

function trimTo(s: string | undefined, max: number): string {
  return (s ?? '').trim().slice(0, max)
}

export function resolveSeasonBannerMediaType(banner?: McSeasonBanner | null): McSeasonBannerMediaType {
  if (banner?.mediaType === 'video' && banner.videoUrl) return 'video'
  if (banner?.mediaType === 'image') return 'image'
  if (banner?.videoUrl) return 'video'
  return 'image'
}

/** Normaliza texto guardado en Firestore (vacío → undefined). */
export function sanitizeSeasonBannerFields(raw: {
  eyebrow?: string
  headline?: string
  subheadline?: string
  ctaLabel?: string
}): Pick<McSeasonBanner, 'eyebrow' | 'headline' | 'subheadline' | 'ctaLabel'> {
  const eyebrow = trimTo(raw.eyebrow, SEASON_BANNER_LIMITS.eyebrow)
  const headline = trimTo(raw.headline, SEASON_BANNER_LIMITS.headline)
  const subheadline = trimTo(raw.subheadline, SEASON_BANNER_LIMITS.subheadline)
  const ctaLabel = trimTo(raw.ctaLabel, SEASON_BANNER_LIMITS.ctaLabel)
  return {
    ...(eyebrow ? { eyebrow } : {}),
    ...(headline ? { headline } : {}),
    ...(subheadline ? { subheadline } : {}),
    ...(ctaLabel ? { ctaLabel } : {}),
  }
}

export type SeasonBannerMediaPatch = {
  mediaType: McSeasonBannerMediaType
  imageUrl?: string | null
  videoUrl?: string | null
  posterUrl?: string | null
}

function resolveMediaUrl(
  value: string | null | undefined,
  previous: string | undefined,
): string | undefined {
  if (value === null) return undefined
  if (value !== undefined) return value
  return previous
}

/** Construye el objeto `seasonBanner` listo para Firestore. */
export function buildSeasonBannerForSave(
  enabled: boolean,
  fields: ReturnType<typeof sanitizeSeasonBannerFields>,
  media: SeasonBannerMediaPatch,
  previous?: McSeasonBanner,
): McSeasonBanner {
  const next: McSeasonBanner = {
    enabled,
    ...fields,
    mediaType: media.mediaType,
    updatedAt: Date.now(),
  }
  if (previous?.heroMode === 'interactive' || previous?.heroMode === 'media') {
    next.heroMode = previous.heroMode
  }
  if (previous?.interactiveProductIds?.length) {
    next.interactiveProductIds = previous.interactiveProductIds
  }
  if (previous?.interactiveMood) {
    next.interactiveMood = previous.interactiveMood
  }

  if (media.mediaType === 'video') {
    const videoUrl = resolveMediaUrl(media.videoUrl, previous?.videoUrl)
    const posterUrl = resolveMediaUrl(media.posterUrl, previous?.posterUrl)
    if (videoUrl) next.videoUrl = videoUrl
    if (posterUrl) next.posterUrl = posterUrl
  } else {
    const imageUrl = resolveMediaUrl(media.imageUrl, previous?.imageUrl)
    if (imageUrl) next.imageUrl = imageUrl
  }

  return next
}

export type ResolvedSeasonBanner = {
  mediaType: McSeasonBannerMediaType
  eyebrow: string
  headline: string
  subheadline: string
  ctaLabel: string
  imageUrl?: string
  videoUrl?: string
  posterUrl?: string
  revision: number
}

/** Contenido listo para mostrar (defaults + nombre de tienda). */
export function resolveSeasonBanner(
  tenant: McTenant | null | undefined,
): ResolvedSeasonBanner | null {
  const raw = tenant?.seasonBanner
  if (!raw?.enabled) return null

  const headline =
    raw.headline?.trim() ||
    (tenant?.nombreTienda ? `${tenant.nombreTienda}` : SEASON_BANNER_DEFAULTS.headline)

  const mediaType = resolveSeasonBannerMediaType(raw)

  return {
    mediaType,
    eyebrow: raw.eyebrow?.trim() || SEASON_BANNER_DEFAULTS.eyebrow,
    headline,
    subheadline: raw.subheadline?.trim() || SEASON_BANNER_DEFAULTS.subheadline,
    ctaLabel: raw.ctaLabel?.trim() || SEASON_BANNER_DEFAULTS.ctaLabel,
    imageUrl: raw.imageUrl,
    videoUrl: raw.videoUrl,
    posterUrl: raw.posterUrl,
    revision: raw.updatedAt ?? 0,
  }
}

/** Banner activo si hay contenido mínimo configurado. */
export function isSeasonBannerActive(tenant: McTenant | null | undefined): boolean {
  if (tenant?.seasonBanner?.heroMode === 'interactive') return false
  const resolved = resolveSeasonBanner(tenant)
  if (!resolved) return false
  const hasMedia =
    resolved.mediaType === 'video'
      ? Boolean(resolved.videoUrl)
      : Boolean(resolved.imageUrl)
  return Boolean(hasMedia || resolved.headline.trim())
}
