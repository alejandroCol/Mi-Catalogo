import { hasShowroomFeatureAccess } from '@/lib/billingAccess'
import { isValidFontId } from '@/lib/catalogFonts'
import type {
  McCatalogFontId,
  McCollectionShowroom,
  McSeasonBannerMediaType,
  McShowroomHomeLayout,
  McShowroomMood,
  McTenant,
} from '@/types/mc'

export const SHOWROOM_DEFAULTS = {
  teaserEyebrow: 'Drop exclusivo',
  teaserHeadline: 'La puerta aún no abre',
  teaserSubheadline: 'Dejá tu lugar y entrá al pasillo en el momento exacto.',
  teaserCtaLabel: 'Avisame',
  collectionTitle: 'Nueva colección',
  collectionSubtitle: 'Una pieza a la vez. Deslizá y descubrí la colección.',
  homeEyebrow: 'Nueva colección',
  homeHeadline: 'Entrá al showroom',
  homeSubheadline: 'Recorré las piezas. Deslizá, guardá y comprá.',
  homeCtaLabel: 'Entrar',
  homeLayout: 'editorial' as McShowroomHomeLayout,
  homeFontId: 'playfair' as McCatalogFontId,
  homeFullWidth: true,
  atelierHeadline: 'Atelier',
  atelierSubheadline: 'El look completo, listo para llevar.',
  mood: 'midnight' as McShowroomMood,
} as const

export const SHOWROOM_HOME_LAYOUTS: {
  id: McShowroomHomeLayout
  label: string
  description: string
}[] = [
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Alto medio, texto a la izquierda',
  },
  {
    id: 'center',
    label: 'Centrado',
    description: 'Más alto, todo al centro',
  },
  {
    id: 'panel',
    label: 'Panel',
    description: 'Bloque sólido a la izquierda',
  },
  {
    id: 'bottom',
    label: 'Cine',
    description: 'Franja baja con barra de texto',
  },
]

export function normalizeShowroomHomeLayout(raw: unknown): McShowroomHomeLayout {
  if (raw === 'center' || raw === 'panel' || raw === 'bottom' || raw === 'editorial') {
    return raw
  }
  return SHOWROOM_DEFAULTS.homeLayout
}

export function normalizeShowroomHomeFontId(raw: unknown): McCatalogFontId {
  return isValidFontId(raw) ? raw : SHOWROOM_DEFAULTS.homeFontId
}

export function normalizeShowroomHomeFullWidth(raw: unknown): boolean {
  if (raw === false) return false
  return true
}

export const SHOWROOM_LIMITS = {
  teaserEyebrow: 48,
  teaserHeadline: 72,
  teaserSubheadline: 160,
  teaserCtaLabel: 32,
  collectionTitle: 72,
  collectionSubtitle: 140,
  homeEyebrow: 40,
  homeHeadline: 64,
  homeSubheadline: 120,
  homeCtaLabel: 28,
  atelierHeadline: 72,
  atelierSubheadline: 140,
  maxProducts: 16,
  maxAtelier: 6,
} as const

export const SHOWROOM_MOODS: {
  id: McShowroomMood
  label: string
  description: string
}[] = [
  { id: 'midnight', label: 'Midnight', description: 'Oscuro, íntimo, luz cálida' },
  { id: 'atelier', label: 'Atelier', description: 'Crema, costura, luz de taller' },
  { id: 'runway', label: 'Runway', description: 'Negro + blanco, pasarela' },
  { id: 'gallery', label: 'Gallery', description: 'Museo limpio, piezas flotando' },
]

function trimTo(s: string | undefined, max: number): string {
  return (s ?? '').trim().slice(0, max)
}

export function showroomTeaserImageStoragePath(tenantId: string): string {
  return `mc_tenants/${tenantId}/showroom/teaser.jpg`
}

export function showroomTeaserVideoStoragePath(tenantId: string): string {
  return `mc_tenants/${tenantId}/showroom/teaser.mp4`
}

export function showroomTeaserPosterStoragePath(tenantId: string): string {
  return `mc_tenants/${tenantId}/showroom/poster.jpg`
}

export function resolveShowroomMediaType(
  showroom?: McCollectionShowroom | null,
): McSeasonBannerMediaType {
  if (showroom?.teaserMediaType === 'video' && showroom.teaserVideoUrl) return 'video'
  if (showroom?.teaserMediaType === 'image') return 'image'
  if (showroom?.teaserVideoUrl) return 'video'
  return 'image'
}

export function sanitizeShowroomTextFields(raw: {
  teaserEyebrow?: string
  teaserHeadline?: string
  teaserSubheadline?: string
  teaserCtaLabel?: string
  collectionTitle?: string
  collectionSubtitle?: string
  homeEyebrow?: string
  homeHeadline?: string
  homeSubheadline?: string
  homeCtaLabel?: string
  atelierHeadline?: string
  atelierSubheadline?: string
}): Pick<
  McCollectionShowroom,
  | 'teaserEyebrow'
  | 'teaserHeadline'
  | 'teaserSubheadline'
  | 'teaserCtaLabel'
  | 'collectionTitle'
  | 'collectionSubtitle'
  | 'homeEyebrow'
  | 'homeHeadline'
  | 'homeSubheadline'
  | 'homeCtaLabel'
  | 'atelierHeadline'
  | 'atelierSubheadline'
> {
  const teaserEyebrow = trimTo(raw.teaserEyebrow, SHOWROOM_LIMITS.teaserEyebrow)
  const teaserHeadline = trimTo(raw.teaserHeadline, SHOWROOM_LIMITS.teaserHeadline)
  const teaserSubheadline = trimTo(raw.teaserSubheadline, SHOWROOM_LIMITS.teaserSubheadline)
  const teaserCtaLabel = trimTo(raw.teaserCtaLabel, SHOWROOM_LIMITS.teaserCtaLabel)
  const collectionTitle = trimTo(raw.collectionTitle, SHOWROOM_LIMITS.collectionTitle)
  const collectionSubtitle = trimTo(raw.collectionSubtitle, SHOWROOM_LIMITS.collectionSubtitle)
  const homeEyebrow = trimTo(raw.homeEyebrow, SHOWROOM_LIMITS.homeEyebrow)
  const homeHeadline = trimTo(raw.homeHeadline, SHOWROOM_LIMITS.homeHeadline)
  const homeSubheadline = trimTo(raw.homeSubheadline, SHOWROOM_LIMITS.homeSubheadline)
  const homeCtaLabel = trimTo(raw.homeCtaLabel, SHOWROOM_LIMITS.homeCtaLabel)
  const atelierHeadline = trimTo(raw.atelierHeadline, SHOWROOM_LIMITS.atelierHeadline)
  const atelierSubheadline = trimTo(raw.atelierSubheadline, SHOWROOM_LIMITS.atelierSubheadline)
  return {
    ...(teaserEyebrow ? { teaserEyebrow } : {}),
    ...(teaserHeadline ? { teaserHeadline } : {}),
    ...(teaserSubheadline ? { teaserSubheadline } : {}),
    ...(teaserCtaLabel ? { teaserCtaLabel } : {}),
    ...(collectionTitle ? { collectionTitle } : {}),
    ...(collectionSubtitle ? { collectionSubtitle } : {}),
    ...(homeEyebrow ? { homeEyebrow } : {}),
    ...(homeHeadline ? { homeHeadline } : {}),
    ...(homeSubheadline ? { homeSubheadline } : {}),
    ...(homeCtaLabel ? { homeCtaLabel } : {}),
    ...(atelierSubheadline ? { atelierSubheadline } : {}),
    ...(atelierHeadline ? { atelierHeadline } : {}),
  }
}

function uniqueIds(ids: string[] | undefined, max: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of ids ?? []) {
    const id = raw.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= max) break
  }
  return out
}

export type ShowroomMediaPatch = {
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

export function buildCollectionShowroomForSave(input: {
  enabled: boolean
  dropAtMs?: number | null
  mood: McShowroomMood
  showStockLeft: boolean
  waitlistEnabled: boolean
  productIds: string[]
  atelierProductIds: string[]
  homeLayout?: McShowroomHomeLayout
  homeFontId?: McCatalogFontId
  homeFullWidth?: boolean
  fields: ReturnType<typeof sanitizeShowroomTextFields>
  media: ShowroomMediaPatch
  previous?: McCollectionShowroom
}): McCollectionShowroom {
  const prev = input.previous
  const imageUrl = resolveMediaUrl(input.media.imageUrl, prev?.teaserImageUrl)
  const videoUrl = resolveMediaUrl(input.media.videoUrl, prev?.teaserVideoUrl)
  const posterUrl = resolveMediaUrl(input.media.posterUrl, prev?.teaserPosterUrl)
  const productIds = uniqueIds(input.productIds, SHOWROOM_LIMITS.maxProducts)
  const atelierProductIds = uniqueIds(input.atelierProductIds, SHOWROOM_LIMITS.maxAtelier)
  const homeLayout = normalizeShowroomHomeLayout(input.homeLayout ?? prev?.homeLayout)
  const homeFontId = normalizeShowroomHomeFontId(input.homeFontId ?? prev?.homeFontId)
  const homeFullWidth = normalizeShowroomHomeFullWidth(
    input.homeFullWidth ?? prev?.homeFullWidth,
  )

  const dropAtMs =
    input.dropAtMs === null
      ? undefined
      : typeof input.dropAtMs === 'number' && Number.isFinite(input.dropAtMs)
        ? Math.floor(input.dropAtMs)
        : prev?.dropAtMs

  const showroom: McCollectionShowroom = {
    enabled: input.enabled,
    mood: input.mood,
    showStockLeft: input.showStockLeft,
    waitlistEnabled: input.waitlistEnabled,
    productIds,
    homeLayout,
    homeFontId,
    homeFullWidth,
    updatedAtMs: Date.now(),
    ...input.fields,
    teaserMediaType: input.media.mediaType,
  }

  if (dropAtMs != null) showroom.dropAtMs = dropAtMs
  if (atelierProductIds.length > 0) showroom.atelierProductIds = atelierProductIds

  if (input.media.mediaType === 'video') {
    if (videoUrl) showroom.teaserVideoUrl = videoUrl
    if (posterUrl) showroom.teaserPosterUrl = posterUrl
  } else if (imageUrl) {
    showroom.teaserImageUrl = imageUrl
  }

  return showroom
}

export function resolveCollectionShowroom(
  tenant: McTenant | null | undefined,
): McCollectionShowroom | null {
  const s = tenant?.collectionShowroom
  if (!s || s.enabled !== true) return null
  return s
}

/** Visible en catálogo público solo si Master activo + showroom habilitado. */
export function isCollectionShowroomPubliclyActive(
  tenant: McTenant | null | undefined,
): boolean {
  if (!hasShowroomFeatureAccess(tenant)) return false
  const s = resolveCollectionShowroom(tenant)
  return Boolean(s)
}

export function isShowroomDropLocked(
  showroom: McCollectionShowroom | null | undefined,
  nowMs = Date.now(),
): boolean {
  const dropAt = showroom?.dropAtMs
  return typeof dropAt === 'number' && dropAt > nowMs
}

export function showroomDoorOpenedStorageKey(tenantId: string, updatedAtMs?: number): string {
  return `mc-showroom-door:${tenantId}:${updatedAtMs ?? 0}`
}

export function resolveShowroomCopy(showroom: McCollectionShowroom) {
  const collectionTitle = showroom.collectionTitle?.trim() || SHOWROOM_DEFAULTS.collectionTitle
  return {
    teaserEyebrow: showroom.teaserEyebrow?.trim() || SHOWROOM_DEFAULTS.teaserEyebrow,
    teaserHeadline: showroom.teaserHeadline?.trim() || SHOWROOM_DEFAULTS.teaserHeadline,
    teaserSubheadline: showroom.teaserSubheadline?.trim() || SHOWROOM_DEFAULTS.teaserSubheadline,
    teaserCtaLabel: showroom.teaserCtaLabel?.trim() || SHOWROOM_DEFAULTS.teaserCtaLabel,
    collectionTitle,
    collectionSubtitle: showroom.collectionSubtitle?.trim() || SHOWROOM_DEFAULTS.collectionSubtitle,
    homeEyebrow: showroom.homeEyebrow?.trim() || SHOWROOM_DEFAULTS.homeEyebrow,
    homeHeadline: showroom.homeHeadline?.trim() || collectionTitle || SHOWROOM_DEFAULTS.homeHeadline,
    homeSubheadline: showroom.homeSubheadline?.trim() || SHOWROOM_DEFAULTS.homeSubheadline,
    homeCtaLabel: showroom.homeCtaLabel?.trim() || SHOWROOM_DEFAULTS.homeCtaLabel,
    homeLayout: normalizeShowroomHomeLayout(showroom.homeLayout),
    homeFontId: normalizeShowroomHomeFontId(showroom.homeFontId),
    homeFullWidth: normalizeShowroomHomeFullWidth(showroom.homeFullWidth),
    atelierHeadline: showroom.atelierHeadline?.trim() || SHOWROOM_DEFAULTS.atelierHeadline,
    atelierSubheadline: showroom.atelierSubheadline?.trim() || SHOWROOM_DEFAULTS.atelierSubheadline,
    mood: showroom.mood && SHOWROOM_MOODS.some((m) => m.id === showroom.mood)
      ? showroom.mood
      : SHOWROOM_DEFAULTS.mood,
  }
}

export function msToDatetimeLocalValue(ms?: number | null): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return ''
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function datetimeLocalValueToMs(value: string): number | null {
  const v = value.trim()
  if (!v) return null
  const ms = new Date(v).getTime()
  return Number.isFinite(ms) ? ms : null
}
