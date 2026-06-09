import type { McTenant } from '@/types/mc'

export const STORE_DISPLAY_NAME_MIN = 2
export const STORE_DISPLAY_NAME_MAX = 80

/** ~6 meses (180 días). Debe coincidir con el cooldown del backend. */
export const STORE_SLUG_CHANGE_COOLDOWN_MS = 180 * 24 * 60 * 60 * 1000

export function validateStoreDisplayName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length < STORE_DISPLAY_NAME_MIN) {
    return `El nombre debe tener al menos ${STORE_DISPLAY_NAME_MIN} caracteres.`
  }
  if (trimmed.length > STORE_DISPLAY_NAME_MAX) {
    return `El nombre puede tener hasta ${STORE_DISPLAY_NAME_MAX} caracteres.`
  }
  return null
}

export function canChangeStoreSlug(
  tenant: Pick<McTenant, 'storeSlugChangedAtMs'> | null | undefined,
  nowMs = Date.now(),
): boolean {
  const last = tenant?.storeSlugChangedAtMs
  if (typeof last !== 'number' || last <= 0) return true
  return nowMs - last >= STORE_SLUG_CHANGE_COOLDOWN_MS
}

export function nextStoreSlugChangeAtMs(
  tenant: Pick<McTenant, 'storeSlugChangedAtMs'> | null | undefined,
  nowMs = Date.now(),
): number | null {
  const last = tenant?.storeSlugChangedAtMs
  if (typeof last !== 'number' || last <= 0) return null
  const next = last + STORE_SLUG_CHANGE_COOLDOWN_MS
  return next > nowMs ? next : null
}

export function formatStoreSlugChangeAvailableDate(ms: number): string {
  return new Date(ms).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
