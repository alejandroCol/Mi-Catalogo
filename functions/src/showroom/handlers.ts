import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../firebaseAdmin.js'
import { isPaidBillingPlan } from '../billingPlan.js'
import { isTenantMembershipActive } from '../tenantMembership.js'
import { resolvePublicTenantBySlug } from '../live/liveAuth.js'

type ShowroomSlice = {
  enabled?: boolean
  waitlistEnabled?: boolean
  dropAtMs?: number
}

function normalizeEmail(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim().toLowerCase().slice(0, 160)
}

function normalizeName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const n = raw.trim().slice(0, 80)
  return n || undefined
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Lista de espera pública del Drop Room (plan Expert o Master).
 * No requiere auth; valida slug + showroom activo + drop aún cerrado.
 */
export const mcShowroomJoinWaitlist = onCall({ invoker: 'public' }, async (request) => {
  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    slug?: unknown
    email?: unknown
    name?: unknown
  }

  const slug = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : ''
  if (!slug) throw new HttpsError('invalid-argument', 'Falta el slug de la tienda.')

  const email = normalizeEmail(data.email)
  if (!isValidEmail(email)) {
    throw new HttpsError('invalid-argument', 'Ingresá un correo válido.')
  }
  const name = normalizeName(data.name)

  const { tenantId } = await resolvePublicTenantBySlug(slug)
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) throw new HttpsError('not-found', 'Tienda no encontrada.')

  const tenant = tenantSnap.data() as {
    billingPlan?: string
    subscriptionEndsAt?: number
    billingSubStatus?: string
    billingGraceUntilMs?: number
    catalogPublished?: boolean
    catalogPublishGrandfathered?: boolean
    collectionShowroom?: ShowroomSlice
  }

  if (!isPaidBillingPlan(tenant.billingPlan) || !isTenantMembershipActive(tenant)) {
    throw new HttpsError('failed-precondition', 'Esta experiencia requiere plan Expert activo.')
  }

  const showroom = tenant.collectionShowroom
  if (!showroom || showroom.enabled !== true) {
    throw new HttpsError('failed-precondition', 'El showroom no está activo.')
  }
  if (showroom.waitlistEnabled !== true) {
    throw new HttpsError('failed-precondition', 'La lista de espera no está habilitada.')
  }

  const dropAt = showroom.dropAtMs
  if (typeof dropAt !== 'number' || dropAt <= Date.now()) {
    throw new HttpsError('failed-precondition', 'El drop ya abrió. Entrá al pasillo.')
  }

  const existing = await db
    .collection(`mc_tenants/${tenantId}/showroom_waitlist`)
    .where('email', '==', email)
    .limit(1)
    .get()

  if (!existing.empty) {
    return { ok: true as const, alreadyJoined: true }
  }

  const ref = db.collection(`mc_tenants/${tenantId}/showroom_waitlist`).doc()
  await ref.set({
    email,
    ...(name ? { name } : {}),
    createdAt: Date.now(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  return { ok: true as const, alreadyJoined: false, id: ref.id }
})
