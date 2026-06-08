import { getAuth } from 'firebase-admin/auth'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from './firebaseAdmin.js'
import { buildStorePublicUrl, isReservedStoreSlug } from './storePublicUrl.js'
import { defineString } from 'firebase-functions/params'

const mcPublicOrigin = defineString('MC_PUBLIC_ORIGIN', { default: 'https://micatalogo.io' })

const SLUG_MIN = 3
const SLUG_MAX = 48
const SLUG_PATTERN = /^[a-z0-9-]+$/
const DEFAULT_TERMS_VERSION = '2026-05-23'

async function assertMcSuperAdminUid(uid: string): Promise<void> {
  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  }
  if ((userSnap.data() as { isSuperAdmin?: boolean }).isSuperAdmin !== true) {
    throw new HttpsError('permission-denied', 'Solo súper admin.')
  }
}

function slugifyStoreName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, SLUG_MAX)
}

function validateSlug(raw: string): { ok: true; slug: string } | { ok: false; reason: string } {
  const slug = raw.trim().toLowerCase()
  if (!slug) return { ok: false, reason: 'slug_empty' }
  if (slug.length < SLUG_MIN) return { ok: false, reason: 'slug_too_short' }
  if (slug.length > SLUG_MAX) return { ok: false, reason: 'slug_too_long' }
  if (!SLUG_PATTERN.test(slug)) return { ok: false, reason: 'slug_invalid' }
  if (isReservedStoreSlug(slug)) return { ok: false, reason: 'slug_reserved' }
  return { ok: true, slug }
}

async function isSlugAvailable(slug: string): Promise<boolean> {
  const snap = await db.doc(`mc_slugs/${slug}`).get()
  if (!snap.exists) return true
  return snap.data()?.active !== true
}

async function resolveSlug(nombreTienda: string, customSlug?: string): Promise<string> {
  if (customSlug?.trim()) {
    const v = validateSlug(customSlug)
    if (!v.ok) {
      const msg =
        v.reason === 'slug_taken'
          ? 'Ese enlace ya está en uso.'
          : v.reason === 'slug_reserved'
            ? 'Ese enlace está reservado.'
            : 'Enlace de catálogo inválido.'
      throw new HttpsError('invalid-argument', msg)
    }
    if (!(await isSlugAvailable(v.slug))) {
      throw new HttpsError('already-exists', 'Ese enlace ya está en uso.')
    }
    return v.slug
  }

  const base = slugifyStoreName(nombreTienda)
  if (base.length < SLUG_MIN) {
    throw new HttpsError('invalid-argument', 'El nombre debe generar un enlace de al menos 3 caracteres.')
  }

  for (let n = 0; n < 80; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`
    const v = validateSlug(candidate)
    if (!v.ok) continue
    if (await isSlugAvailable(v.slug)) return v.slug
  }

  throw new HttpsError('resource-exhausted', 'No se pudo generar un enlace disponible. Probá con otro nombre.')
}

type PlatformTerms = { version: string; text: string }

async function loadPlatformTerms(): Promise<PlatformTerms> {
  const snap = await db.doc('mc_platform/settings').get()
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : null
  const version =
    typeof data?.platformTermsVersion === 'string' && data.platformTermsVersion.trim()
      ? data.platformTermsVersion.trim()
      : DEFAULT_TERMS_VERSION
  const text =
    typeof data?.platformTermsText === 'string' && data.platformTermsText.trim()
      ? data.platformTermsText.trim()
      : ''
  return { version, text }
}

function hashTermsContent(text: string): string {
  if (!text) return '00000000'
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export const mcAdminCreateStore = onCall({ invoker: 'public' }, async (request) => {
  const callerUid = request.auth?.uid
  if (!callerUid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  await assertMcSuperAdminUid(callerUid)

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    nombreTienda?: unknown
    email?: unknown
    password?: unknown
    whatsappNumero?: unknown
    slug?: unknown
  }

  const nombreTienda = typeof data.nombreTienda === 'string' ? data.nombreTienda.trim() : ''
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
  const password = typeof data.password === 'string' ? data.password : ''
  const whatsappRaw = typeof data.whatsappNumero === 'string' ? data.whatsappNumero : ''
  const whatsappNumero = whatsappRaw.replace(/\D/g, '')
  const customSlug = typeof data.slug === 'string' ? data.slug.trim() : ''

  if (nombreTienda.length < 2) {
    throw new HttpsError('invalid-argument', 'Nombre de tienda requerido.')
  }
  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Correo inválido.')
  }
  if (password.length < 6) {
    throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.')
  }
  if (whatsappNumero.length < 10 || whatsappNumero.length > 15) {
    throw new HttpsError('invalid-argument', 'WhatsApp inválido (10–15 dígitos).')
  }

  const slug = await resolveSlug(nombreTienda, customSlug || undefined)
  const terms = await loadPlatformTerms()
  const termsContentHash = hashTermsContent(terms.text)
  const acceptedAt = Date.now()

  const auth = getAuth()
  let ownerUid: string
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: nombreTienda,
      emailVerified: true,
    })
    ownerUid = userRecord.uid
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No se pudo crear el usuario.'
    if (msg.includes('email-already-exists') || msg.includes('already in use')) {
      throw new HttpsError('already-exists', 'Ya existe una cuenta con ese correo.')
    }
    throw new HttpsError('internal', msg)
  }

  const tenantRef = db.collection('mc_tenants').doc()
  const tenantId = tenantRef.id

  try {
    const batch = db.batch()
    batch.set(tenantRef, {
      ownerUid,
      slug,
      nombreTienda,
      whatsappNumero,
      mensajeIntro: '',
      createdAt: acceptedAt,
      billingPlan: 'free',
      platformTermsAcceptedAt: acceptedAt,
      platformTermsVersion: terms.version,
      platformTermsAcceptedByUid: ownerUid,
      platformTermsAcceptedByEmail: email,
      platformTermsContentHash: termsContentHash,
      platformTermsUserAgent: 'mcAdminCreateStore',
    })
    batch.set(db.doc(`mc_users/${ownerUid}`), {
      uid: ownerUid,
      email,
      displayName: nombreTienda,
      tenantId,
      isSuperAdmin: false,
      createdAt: acceptedAt,
    })
    batch.set(db.doc(`mc_slugs/${slug}`), {
      tenantId,
      active: true,
      updatedAt: acceptedAt,
    })
    await batch.commit()

    await db.doc(`mc_tenants/${tenantId}/legal_acceptances/${terms.version}`).set({
      acceptedAt,
      termsVersion: terms.version,
      termsContentHash,
      acceptedByUid: ownerUid,
      acceptedByEmail: email,
      context: 'admin_provision',
      provisionedByUid: callerUid,
      userAgent: 'mcAdminCreateStore',
    })
  } catch (e: unknown) {
    try {
      await auth.deleteUser(ownerUid)
    } catch {
      /* best-effort */
    }
    const msg = e instanceof Error ? e.message : 'No se pudo crear la tienda.'
    throw new HttpsError('internal', msg)
  }

  const storeUrl = buildStorePublicUrl(mcPublicOrigin.value(), slug)

  return {
    ok: true as const,
    tenantId,
    ownerUid,
    slug,
    storeUrl,
    emailVerified: true,
  }
})
