import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import type { McSeasonBanner, McTenant } from '@/types/mc'

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

export function formatSeasonBannerDimensions(width: number, height: number): string {
  return `${width.toLocaleString('es')} × ${height.toLocaleString('es')} px`
}

export function seasonBannerStoragePath(tenantId: string): string {
  return `mc_tenants/${tenantId}/season_banner/hero.jpg`
}

export const MC_CATALOGO_PRODUCTOS_ID = 'mc-catalogo-productos'

export function scrollToCatalogProducts(behavior: ScrollBehavior = 'smooth'): void {
  document.getElementById(MC_CATALOGO_PRODUCTOS_ID)?.scrollIntoView({ behavior, block: 'start' })
}

function trimTo(s: string | undefined, max: number): string {
  return (s ?? '').trim().slice(0, max)
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

/** `imageUrl`: string = nueva URL; `undefined` = conservar la anterior; `null` = quitar imagen. */
export function buildSeasonBannerForSave(
  enabled: boolean,
  fields: ReturnType<typeof sanitizeSeasonBannerFields>,
  imageUrl: string | null | undefined,
  previous?: McSeasonBanner,
): McSeasonBanner {
  const resolvedUrl =
    imageUrl === null ? undefined : imageUrl !== undefined ? imageUrl : previous?.imageUrl
  const next: McSeasonBanner = {
    enabled,
    ...fields,
    updatedAt: Date.now(),
  }
  if (resolvedUrl) next.imageUrl = resolvedUrl
  return next
}

export type ResolvedSeasonBanner = {
  eyebrow: string
  headline: string
  subheadline: string
  ctaLabel: string
  imageUrl?: string
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

  return {
    eyebrow: raw.eyebrow?.trim() || SEASON_BANNER_DEFAULTS.eyebrow,
    headline,
    subheadline: raw.subheadline?.trim() || SEASON_BANNER_DEFAULTS.subheadline,
    ctaLabel: raw.ctaLabel?.trim() || SEASON_BANNER_DEFAULTS.ctaLabel,
    imageUrl: raw.imageUrl,
    revision: raw.updatedAt ?? 0,
  }
}

/** Banner activo solo para Expert con membresía/gracia y contenido mínimo. */
export function isSeasonBannerActive(tenant: McTenant | null | undefined): boolean {
  if (!hasExpertFeatureAccess(tenant)) return false
  const resolved = resolveSeasonBanner(tenant)
  if (!resolved) return false
  return Boolean(resolved.imageUrl || resolved.headline.trim())
}
