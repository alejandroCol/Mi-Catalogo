import { randomBytes } from 'node:crypto'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { db } from '../firebaseAdmin.js'
import { AddiAccessPolicy } from './AddiAccessPolicy.js'
import { AddiApplicationsClient } from './AddiApplicationsClient.js'
import { AddiAuthClient } from './AddiAuthClient.js'
import { AddiCheckoutService } from './AddiCheckoutService.js'
import { AddiCredentialsRepository } from './AddiCredentialsRepository.js'
import { createAddiWebhookApp } from './webhookApp.js'
import type { AddiCredentialsStored } from './types.js'

const REGION = process.env.MC_FUNCTIONS_REGION || 'us-central1'
const enviaApiToken = defineSecret('ENVIA_API_TOKEN')
const resendApiKey = defineSecret('RESEND_API_KEY')
const mcPublicOrigin = defineString('MC_PUBLIC_ORIGIN', { default: 'https://micatalogo.io' })

function readResendApiKey(): string {
  try {
    const v = resendApiKey.value()
    return typeof v === 'string' ? v.trim() : ''
  } catch {
    return ''
  }
}

function newHookRouteKey(): string {
  return randomBytes(16).toString('hex')
}

async function resolveOwnerTenantId(
  req: { auth?: { uid?: string } },
  dataRaw: unknown,
): Promise<{ tenantId: string; superAdminBypass: boolean }> {
  const uid = req.auth?.uid
  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  }
  const data = (dataRaw && typeof dataRaw === 'object' ? dataRaw : {}) as { targetTenantId?: unknown }
  const target =
    typeof data.targetTenantId === 'string' && data.targetTenantId.trim().length > 0
      ? data.targetTenantId.trim()
      : ''

  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  const u = userSnap.data() as { tenantId?: string; isSuperAdmin?: boolean }

  if (target) {
    if (u.isSuperAdmin !== true) {
      throw new HttpsError('permission-denied', 'Solo súper admin puede configurar Addi para otra tienda.')
    }
    const tenantSnap = await db.doc(`mc_tenants/${target}`).get()
    if (!tenantSnap.exists) throw new HttpsError('not-found', 'Tienda no encontrada.')
    return { tenantId: target, superAdminBypass: true }
  }

  const tenantId = u.tenantId
  if (!tenantId || typeof tenantId !== 'string') {
    throw new HttpsError('failed-precondition', 'No tenés tienda asociada.')
  }
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) throw new HttpsError('not-found', 'Tienda no encontrada.')
  const ownerUid = (tenantSnap.data() as { ownerUid?: string }).ownerUid
  if (ownerUid !== uid) {
    throw new HttpsError('permission-denied', 'Solo el dueño puede vincular Addi.')
  }
  return { tenantId, superAdminBypass: false }
}

function assertNonEmpty(v: unknown, label: string, min = 3, max = 200): string {
  if (typeof v !== 'string') throw new HttpsError('invalid-argument', `${label} inválido.`)
  const t = v.trim()
  if (t.length < min || t.length > max) {
    throw new HttpsError('invalid-argument', `${label}: entre ${min} y ${max} caracteres.`)
  }
  return t
}

/** Vincula credenciales BYOK Addi (solo Master). */
export const mcAddiLinkMerchant = onCall({ region: REGION, invoker: 'public' }, async (request) => {
  const dataIn = request.data as {
    clientId?: unknown
    clientSecret?: unknown
    allySlug?: unknown
    sandbox?: unknown
    enabled?: unknown
    targetTenantId?: unknown
  }
  const { tenantId, superAdminBypass } = await resolveOwnerTenantId(request, request.data)
  const tenantRef = db.doc(`mc_tenants/${tenantId}`)
  const tenantSnap = await tenantRef.get()
  const td = tenantSnap.data() as {
    ownerUid?: string
    billingPlan?: string
    subscriptionEndsAt?: number
    addiWebHookK?: string
  }
  if (!superAdminBypass && td.ownerUid !== request.auth!.uid) {
    throw new HttpsError('permission-denied', 'Solo el dueño.')
  }
  AddiAccessPolicy.assertMasterTenant(td)

  const clientId = assertNonEmpty(dataIn.clientId, 'Client ID', 8, 200)
  const clientSecret = assertNonEmpty(dataIn.clientSecret, 'Client Secret', 8, 400)
  const allySlug = assertNonEmpty(dataIn.allySlug, 'Ally slug', 2, 80)
  const sandbox = dataIn.sandbox === true
  const enabled = dataIn.enabled !== false

  const auth = new AddiAuthClient(sandbox)
  let callbackUser: string | undefined
  let callbackPassword: string | undefined
  try {
    const { accessToken } = await auth.fetchAccessToken(clientId, clientSecret)
    const apps = new AddiApplicationsClient(sandbox)
    const cb = await apps.fetchCallbackCredentials(accessToken)
    if (cb) {
      callbackUser = cb.user
      callbackPassword = cb.password
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Credenciales Addi inválidas.'
    throw new HttpsError('invalid-argument', msg)
  }

  const routeKey =
    typeof td.addiWebHookK === 'string' && td.addiWebHookK.length >= 16
      ? td.addiWebHookK
      : newHookRouteKey()

  const cred: AddiCredentialsStored = {
    clientId,
    clientSecret,
    allySlug,
    sandbox,
    ...(callbackUser ? { callbackUser } : {}),
    ...(callbackPassword ? { callbackPassword } : {}),
  }

  const repo = new AddiCredentialsRepository(db)
  await repo.save(tenantId, cred, { routeKey, enabled })

  return {
    ok: true as const,
    addiWebHookK: routeKey,
    callbackCredentialsReady: Boolean(callbackUser && callbackPassword),
  }
})

export const mcAddiUnlinkMerchant = onCall({ region: REGION, invoker: 'public' }, async (request) => {
  const { tenantId, superAdminBypass } = await resolveOwnerTenantId(request, request.data)
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const td = tenantSnap.data() as {
    ownerUid?: string
    addiWebHookK?: string
    billingPlan?: string
    subscriptionEndsAt?: number
  }
  if (!superAdminBypass && td.ownerUid !== request.auth!.uid) {
    throw new HttpsError('permission-denied', 'Solo el dueño.')
  }
  // Unlink permitido aunque deje de ser Master (limpieza).
  const repo = new AddiCredentialsRepository(db)
  await repo.delete(tenantId, td.addiWebHookK)
  return { ok: true as const }
})

export const mcAddiSetEnabled = onCall({ region: REGION, invoker: 'public' }, async (request) => {
  const dataIn = request.data as { enabled?: unknown }
  const { tenantId, superAdminBypass } = await resolveOwnerTenantId(request, request.data)
  const tenantRef = db.doc(`mc_tenants/${tenantId}`)
  const tenantSnap = await tenantRef.get()
  const td = tenantSnap.data() as {
    ownerUid?: string
    billingPlan?: string
    subscriptionEndsAt?: number
  }
  if (!superAdminBypass && td.ownerUid !== request.auth!.uid) {
    throw new HttpsError('permission-denied', 'Solo el dueño.')
  }
  AddiAccessPolicy.assertMasterTenant(td)
  const enabled = dataIn.enabled === true
  if (enabled) {
    const repo = new AddiCredentialsRepository(db)
    const cred = await repo.get(tenantId)
    if (!cred) {
      throw new HttpsError('failed-precondition', 'Primero guardá las credenciales de Addi.')
    }
  }
  await tenantRef.update({ addiPaymentsEnabled: enabled, addiLinkedAt: Date.now() })
  return { ok: true as const, enabled }
})

export const mcAddiStartCatalogCheckout = onCall(
  { region: REGION, invoker: 'public', secrets: [enviaApiToken] },
  async (request) => {
    const data = request.data as {
      slug?: string
      lineas?: unknown[]
      cuponCodigo?: string
      nombre?: string
      telefono?: string
      email?: string
      nota?: string
      envioCiudad?: string
      envioDepartamento?: string
      envioDireccion?: string
      envioReferencia?: string
      clienteTipoDocumento?: string
      clienteDocumentoNumero?: string
      redirectOrigin?: string
      idempotencyKey?: string
      carritoIniciadoId?: string
      esRegalo?: boolean
      wishlistId?: string
      destinatarioNombre?: string
    }

    const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || ''
    const webhookBaseUrl = `https://${REGION}-${project}.cloudfunctions.net/mcAddiCatalogWebhook`

    const service = new AddiCheckoutService(db, new AddiCredentialsRepository(db))
    return service.start({
      slug: typeof data.slug === 'string' ? data.slug : '',
      lineas: Array.isArray(data.lineas) ? (data.lineas as never[]) : [],
      cuponCodigo: data.cuponCodigo,
      nombre: typeof data.nombre === 'string' ? data.nombre : '',
      telefono: typeof data.telefono === 'string' ? data.telefono : '',
      email: typeof data.email === 'string' ? data.email : '',
      nota: data.nota,
      envioCiudad: typeof data.envioCiudad === 'string' ? data.envioCiudad : '',
      envioDepartamento: typeof data.envioDepartamento === 'string' ? data.envioDepartamento : '',
      envioDireccion: typeof data.envioDireccion === 'string' ? data.envioDireccion : '',
      envioReferencia: data.envioReferencia,
      clienteTipoDocumento: typeof data.clienteTipoDocumento === 'string' ? data.clienteTipoDocumento : '',
      clienteDocumentoNumero:
        typeof data.clienteDocumentoNumero === 'string' ? data.clienteDocumentoNumero : '',
      redirectOrigin: typeof data.redirectOrigin === 'string' ? data.redirectOrigin : '',
      idempotencyKey: typeof data.idempotencyKey === 'string' ? data.idempotencyKey : '',
      carritoIniciadoId: data.carritoIniciadoId,
      esRegalo: data.esRegalo,
      wishlistId: data.wishlistId,
      destinatarioNombre: data.destinatarioNombre,
      enviaToken: enviaApiToken.value(),
      publicOrigin: mcPublicOrigin.value(),
      webhookBaseUrl,
    })
  },
)

export const mcAddiCheckoutStatus = onCall({ region: REGION, invoker: 'public' }, async (request) => {
  const d = request.data as { slug?: string; orderId?: string; addiViewToken?: string }
  const slug = typeof d.slug === 'string' ? d.slug.trim().toLowerCase() : ''
  const orderId = typeof d.orderId === 'string' ? d.orderId.trim() : ''
  const token = typeof d.addiViewToken === 'string' ? d.addiViewToken.trim() : ''
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug) || !orderId || !token) {
    throw new HttpsError('invalid-argument', 'Datos incompletos.')
  }

  const slugSnap = await db.doc(`mc_slugs/${slug}`).get()
  if (!slugSnap.exists) throw new HttpsError('not-found', 'Catálogo no encontrado.')
  const tenantId = (slugSnap.data() as { tenantId: string }).tenantId
  const ref = db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderId}`)
  const oSnap = await ref.get()
  if (!oSnap.exists) return { notFound: true as const }
  const o = oSnap.data() as {
    addiViewToken?: string
    estado?: string
    totalCop?: number
    updatedAt?: number
  }
  if (o.addiViewToken !== token) {
    throw new HttpsError('permission-denied', 'Enlace de consulta inválido.')
  }
  return {
    notFound: false as const,
    estado: o.estado,
    totalCop: o.totalCop,
    updatedAt: o.updatedAt,
    orderId,
  }
})

const addiWebhookApp = createAddiWebhookApp({
  db,
  getPublicOrigin: () => mcPublicOrigin.value(),
  readResendApiKey,
})

export const mcAddiCatalogWebhook = onRequest(
  { region: REGION, cors: false, invoker: 'public', secrets: [resendApiKey] },
  addiWebhookApp,
)
