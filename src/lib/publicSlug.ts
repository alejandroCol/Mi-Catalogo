import { doc, getDoc } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { MC } from '@/lib/mcCollections'
import { isReservedStoreSlug, mcPlatformPublicHost } from '@/lib/storePublicUrl'

export const PUBLIC_STORE_SLUG_MIN = 3
export const PUBLIC_STORE_SLUG_MAX = 48
export const PUBLIC_STORE_SLUG_PATTERN = /^[a-z0-9-]+$/

export type PublicSlugValidationIssue =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'reserved'

export type PublicSlugAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'reserved'

export function slugifyStoreName(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, PUBLIC_STORE_SLUG_MAX)
}

/** Normaliza lo que el usuario escribe en el campo de enlace personalizado. */
export function normalizePublicStoreSlug(input: string): string {
  return slugifyStoreName(input)
}

export function validatePublicStoreSlug(
  slug: string,
): { ok: true; slug: string } | { ok: false; issue: PublicSlugValidationIssue } {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return { ok: false, issue: 'empty' }
  if (normalized.length < PUBLIC_STORE_SLUG_MIN) return { ok: false, issue: 'too_short' }
  if (normalized.length > PUBLIC_STORE_SLUG_MAX) return { ok: false, issue: 'too_long' }
  if (!PUBLIC_STORE_SLUG_PATTERN.test(normalized)) return { ok: false, issue: 'invalid_chars' }
  if (isReservedStoreSlug(normalized)) return { ok: false, issue: 'reserved' }
  return { ok: true, slug: normalized }
}

export function publicSlugValidationMessage(issue: PublicSlugValidationIssue): string {
  switch (issue) {
    case 'empty':
      return 'Escribí un enlace para tu catálogo.'
    case 'too_short':
      return `El enlace debe tener al menos ${PUBLIC_STORE_SLUG_MIN} caracteres (letras o números).`
    case 'too_long':
      return `El enlace puede tener hasta ${PUBLIC_STORE_SLUG_MAX} caracteres.`
    case 'invalid_chars':
      return 'Usá solo letras minúsculas, números y guiones (sin espacios ni tildes).'
    case 'reserved':
      return 'Ese enlace está reservado para la plataforma. Probá con otro.'
  }
}

export function formatPublicSlugHostPreview(slug: string): string {
  const host = mcPlatformPublicHost()
  return `${slug.trim().toLowerCase()}.${host}`
}

export async function probePublicSlugAvailability(
  db: Firestore,
  rawSlug: string,
): Promise<{ status: PublicSlugAvailabilityStatus; slug: string; issue?: PublicSlugValidationIssue }> {
  const validation = validatePublicStoreSlug(rawSlug)
  if (!validation.ok) {
    const status: PublicSlugAvailabilityStatus =
      validation.issue === 'reserved' ? 'reserved' : 'invalid'
    return { status, slug: normalizePublicStoreSlug(rawSlug), issue: validation.issue }
  }

  const slug = validation.slug
  const slugSnap = await getDoc(doc(db, MC.slugs, slug))
  if (!slugSnap.exists()) {
    return { status: 'available', slug }
  }
  if (slugSnap.data()?.active === true) {
    return { status: 'taken', slug }
  }
  return { status: 'available', slug }
}

/** @deprecated Prefer explicit slug + probePublicSlugAvailability at registration. */
export async function resolveAvailablePublicSlug(db: Firestore, nombreTienda: string): Promise<string> {
  const base = slugifyStoreName(nombreTienda)
  if (base.length < PUBLIC_STORE_SLUG_MIN) {
    throw new Error('slug_too_short')
  }
  for (let n = 0; n < 80; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`
    const probe = await probePublicSlugAvailability(db, candidate)
    if (probe.status === 'available') {
      return probe.slug
    }
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`
}

export async function assertPublicSlugAvailableForRegistration(
  db: Firestore,
  rawSlug: string,
): Promise<string> {
  const probe = await probePublicSlugAvailability(db, rawSlug)
  if (probe.status === 'available') {
    return probe.slug
  }
  if (probe.status === 'taken') {
    throw new Error('slug_taken')
  }
  if (probe.status === 'reserved') {
    throw new Error('slug_reserved')
  }
  throw new Error(probe.issue ?? 'slug_invalid')
}
