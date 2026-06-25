import { randomBytes } from 'node:crypto'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from './firebaseAdmin.js'

/** Claim en el ID token: tienda que el súper admin está viendo como soporte. */
export const MC_IMPERSONATE_TENANT_CLAIM = 'mcImpersonateTenantId'

const SESSIONS_COLLECTION = 'mc_impersonation_sessions'

type McUserDoc = {
  isSuperAdmin?: boolean
  email?: string
  role?: string
  active?: boolean
}

type TenantDoc = {
  slug?: string
  nombreTienda?: string
}

async function assertCanStartDemoImpersonation(
  uid: string,
): Promise<{ isSuperAdmin: boolean; isSalesRep: boolean; email?: string }> {
  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  }
  const data = userSnap.data() as McUserDoc
  const isSuperAdmin = data.isSuperAdmin === true
  const isSalesRep = data.role === 'sales_rep' && data.active !== false
  if (!isSuperAdmin && !isSalesRep) {
    throw new HttpsError('permission-denied', 'Solo súper admin o vendedor de Mi Catálogo.')
  }
  return {
    isSuperAdmin,
    isSalesRep,
    email: typeof data.email === 'string' ? data.email : undefined,
  }
}

async function assertDemoStoreTenant(tenantId: string): Promise<void> {
  const snap = await db
    .collection('mc_demo_stores')
    .where('tenantId', '==', tenantId)
    .where('active', '==', true)
    .limit(1)
    .get()
  if (snap.empty) {
    throw new HttpsError(
      'permission-denied',
      'Solo podés entrar a tiendas demo activas (mc_demo_stores).',
    )
  }
}

async function readExistingCustomClaims(uid: string): Promise<Record<string, unknown>> {
  const record = await getAuth().getUser(uid)
  const raw = record.customClaims
  return raw && typeof raw === 'object' ? { ...raw } : {}
}

function parseTenantId(data: unknown): string {
  const d = (data && typeof data === 'object' ? data : {}) as { tenantId?: unknown }
  const tid = typeof d.tenantId === 'string' ? d.tenantId.trim() : ''
  if (!tid) {
    throw new HttpsError('invalid-argument', 'Falta tenantId.')
  }
  return tid
}

export const mcStartStoreImpersonation = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  }

  const actor = await assertCanStartDemoImpersonation(uid)
  const tenantId = parseTenantId(request.data)

  if (!actor.isSuperAdmin) {
    await assertDemoStoreTenant(tenantId)
  }

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) {
    throw new HttpsError('not-found', 'Tienda no encontrada.')
  }
  const tenant = tenantSnap.data() as TenantDoc

  const claims = await readExistingCustomClaims(uid)
  const sessionId = randomBytes(12).toString('hex')
  const startedAt = Date.now()

  await getAuth().setCustomUserClaims(uid, {
    ...claims,
    [MC_IMPERSONATE_TENANT_CLAIM]: tenantId,
    mcImpersonateSessionId: sessionId,
  })

  await db.doc(`${SESSIONS_COLLECTION}/${sessionId}`).set({
    sessionId,
    adminUid: uid,
    adminEmail: typeof actor.email === 'string' ? actor.email : '',
    salesRepDemo: actor.isSalesRep,
    tenantId,
    tenantSlug: typeof tenant.slug === 'string' ? tenant.slug : '',
    tenantName: typeof tenant.nombreTienda === 'string' ? tenant.nombreTienda : '',
    startedAt,
    endedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  })

  return {
    ok: true,
    sessionId,
    tenantId,
    tenantSlug: typeof tenant.slug === 'string' ? tenant.slug : '',
    tenantName: typeof tenant.nombreTienda === 'string' ? tenant.nombreTienda : '',
    startedAt,
  }
})

export const mcStopStoreImpersonation = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  }

  await assertCanStartDemoImpersonation(uid)

  const claims = await readExistingCustomClaims(uid)
  const sessionId =
    typeof claims.mcImpersonateSessionId === 'string' ? claims.mcImpersonateSessionId : ''
  const tenantId =
    typeof claims[MC_IMPERSONATE_TENANT_CLAIM] === 'string'
      ? (claims[MC_IMPERSONATE_TENANT_CLAIM] as string)
      : ''

  const nextClaims = { ...claims }
  delete nextClaims[MC_IMPERSONATE_TENANT_CLAIM]
  delete nextClaims.mcImpersonateSessionId
  await getAuth().setCustomUserClaims(uid, nextClaims)

  if (sessionId) {
    await db.doc(`${SESSIONS_COLLECTION}/${sessionId}`).set(
      {
        endedAt: Date.now(),
        endedAtServer: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  }

  return { ok: true, sessionId, tenantId }
})
