import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from './firebaseAdmin.js'
import { buildStorePublicUrl, isReservedStoreSlug } from './storePublicUrl.js'
import { defineString } from 'firebase-functions/params'
import { MC_IMPERSONATE_TENANT_CLAIM } from './storeImpersonation.js'

const mcPublicOrigin = defineString('MC_PUBLIC_ORIGIN', { default: 'https://micatalogo.io' })

const SLUG_MIN = 3
const SLUG_MAX = 48
const SLUG_PATTERN = /^[a-z0-9-]+$/
const SLUG_CHANGE_COOLDOWN_MS = 180 * 24 * 60 * 60 * 1000

function validateSlug(raw: unknown): { ok: true; slug: string } | { ok: false; code: string } {
  if (typeof raw !== 'string') return { ok: false, code: 'slug_invalid' }
  const slug = raw.trim().toLowerCase()
  if (!slug) return { ok: false, code: 'slug_empty' }
  if (slug.length < SLUG_MIN) return { ok: false, code: 'slug_too_short' }
  if (slug.length > SLUG_MAX) return { ok: false, code: 'slug_too_long' }
  if (!SLUG_PATTERN.test(slug)) return { ok: false, code: 'slug_invalid' }
  if (isReservedStoreSlug(slug)) return { ok: false, code: 'slug_reserved' }
  return { ok: true, slug }
}

function slugErrorMessage(code: string): string {
  switch (code) {
    case 'slug_empty':
      return 'Escribí un enlace para tu catálogo.'
    case 'slug_too_short':
      return `El enlace debe tener al menos ${SLUG_MIN} caracteres.`
    case 'slug_too_long':
      return `El enlace puede tener hasta ${SLUG_MAX} caracteres.`
    case 'slug_invalid':
      return 'Usá solo letras minúsculas, números y guiones.'
    case 'slug_reserved':
      return 'Ese enlace está reservado. Probá con otro.'
    case 'slug_taken':
      return 'Ese enlace ya está en uso.'
    case 'slug_cooldown':
      return 'Solo podés cambiar el dominio una vez cada 6 meses.'
    default:
      return 'No se pudo cambiar el dominio.'
  }
}

type TenantSlugSlice = {
  ownerUid?: string
  slug?: string
  storeSlugChangedAtMs?: number
}

/** Cambia el slug público de la tienda (máx. una vez cada 6 meses). */
export const mcChangeStoreSlug = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')

  const impersonateTenantId =
    typeof request.auth?.token?.[MC_IMPERSONATE_TENANT_CLAIM] === 'string'
      ? request.auth.token[MC_IMPERSONATE_TENANT_CLAIM].trim()
      : ''
  if (impersonateTenantId) {
    throw new HttpsError('permission-denied', 'No podés cambiar el dominio en modo soporte.')
  }

  const slugValidation = validateSlug(request.data?.slug)
  if (!slugValidation.ok) {
    throw new HttpsError('invalid-argument', slugErrorMessage(slugValidation.code))
  }
  const newSlug = slugValidation.slug

  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  const tenantId = (userSnap.data() as { tenantId?: string }).tenantId
  if (!tenantId) throw new HttpsError('failed-precondition', 'Sin tienda asociada.')

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) throw new HttpsError('not-found', 'Tienda no encontrada.')
  const tenant = tenantSnap.data() as TenantSlugSlice
  if (tenant.ownerUid !== uid) {
    throw new HttpsError('permission-denied', 'Solo el dueño puede cambiar el dominio.')
  }

  const oldSlug = typeof tenant.slug === 'string' ? tenant.slug.trim().toLowerCase() : ''
  if (!oldSlug) throw new HttpsError('failed-precondition', 'Tu tienda no tiene dominio configurado.')

  if (newSlug === oldSlug) {
    return {
      ok: true as const,
      slug: newSlug,
      unchanged: true,
      storeUrl: buildStorePublicUrl(mcPublicOrigin.value(), newSlug),
    }
  }

  const lastChange = tenant.storeSlugChangedAtMs
  if (typeof lastChange === 'number' && lastChange > 0) {
    const nextAllowed = lastChange + SLUG_CHANGE_COOLDOWN_MS
    if (Date.now() < nextAllowed) {
      throw new HttpsError('failed-precondition', slugErrorMessage('slug_cooldown'))
    }
  }

  const newSlugSnap = await db.doc(`mc_slugs/${newSlug}`).get()
  if (newSlugSnap.exists && newSlugSnap.data()?.active === true) {
    const otherTenantId = String(newSlugSnap.data()?.tenantId ?? '')
    if (otherTenantId !== tenantId) {
      throw new HttpsError('failed-precondition', slugErrorMessage('slug_taken'))
    }
  }

  const now = Date.now()
  const batch = db.batch()

  batch.update(db.doc(`mc_tenants/${tenantId}`), {
    slug: newSlug,
    storeSlugChangedAtMs: now,
  })

  batch.set(
    db.doc(`mc_slugs/${oldSlug}`),
    {
      tenantId,
      active: false,
      updatedAt: now,
    },
    { merge: true },
  )

  batch.set(db.doc(`mc_slugs/${newSlug}`), {
    tenantId,
    active: true,
    updatedAt: now,
  })

  await batch.commit()

  return {
    ok: true as const,
    slug: newSlug,
    storeUrl: buildStorePublicUrl(mcPublicOrigin.value(), newSlug),
    changedAt: now,
  }
})
