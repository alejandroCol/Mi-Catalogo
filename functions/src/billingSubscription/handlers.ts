import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import type { McBillingDebitMethod } from './constants.js'
import {
  accountReadyForDebit,
  onepayCreateNequiAccount,
  onepayCreateTokenizedCard,
  onepayListAccounts,
  onepayListCards,
  onepayListNequiBanks,
  onepayValidateAccount,
} from './onepayBillingApi.js'
import {
  mcBillingActivateWithCharge,
  mcBillingEnsureCustomerV2,
  mcBillingProcessGraceExpiries,
  mcBillingResolvePrice,
  mcBillingRunDueRenewals,
  mcBillingTryFinalizeFromChargeWebhook,
  type McBillingPayerProfile,
} from './service.js'
import type { McBillingPeriod } from './schedule.js'

const db = getFirestore()

const DEFAULT_CAPTURE_ROUTE_ID = 'ggMoeO2K3G'

async function resolveTenantOwner(uid: string): Promise<{ tenantId: string }> {
  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  const tenantId = (userSnap.data() as { tenantId?: string }).tenantId
  if (!tenantId) throw new HttpsError('failed-precondition', 'Sin tienda asociada.')
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) throw new HttpsError('not-found', 'Tienda no encontrada.')
  const ownerUid = (tenantSnap.data() as { ownerUid?: string }).ownerUid
  if (ownerUid !== uid) {
    throw new HttpsError('permission-denied', 'Solo el dueño puede gestionar el plan.')
  }
  return { tenantId }
}

async function getPlatformBillingCreds(): Promise<{
  secretKey: string
  publicKey: string
  captureRouteId: string
}> {
  const pc = await db.doc('mc_platform/credentials_onepay').get()
  const cred = pc.data() as { secretKey?: string; publicKey?: string } | undefined
  const sk = cred?.secretKey?.trim()
  if (!sk) {
    throw new HttpsError('failed-precondition', 'Configurá la pasarela Mi Catálogo en súper admin.')
  }
  const settings = (await db.doc('mc_platform/settings').get()).data() as {
    pasarelaMicatalogoActiva?: boolean
    onepayCaptureRouteId?: string
  }
  if (settings?.pasarelaMicatalogoActiva !== true) {
    throw new HttpsError('failed-precondition', 'Los pagos de planes no están habilitados.')
  }
  const publicKey = cred?.publicKey?.trim() ?? ''
  if (!publicKey) {
    throw new HttpsError('failed-precondition', 'Falta la clave pública OnePay (pk_) en la pasarela.')
  }
  const captureRouteId =
    settings?.onepayCaptureRouteId?.trim() ||
    process.env.MC_ONEPAY_CAPTURE_ROUTE_ID?.trim() ||
    DEFAULT_CAPTURE_ROUTE_ID
  return { secretKey: sk, publicKey, captureRouteId }
}

function parsePayer(data: Record<string, unknown>, fallbackEmail: string, fallbackName: string): McBillingPayerProfile {
  const { first, last } = (() => {
    const raw =
      (typeof data.firstName === 'string' && data.firstName.trim()) ||
      (typeof data.displayName === 'string' && data.displayName.trim()) ||
      fallbackName
    const p = raw.trim().split(/\s+/)
    if (p.length <= 1) return { first: p[0] || 'Titular', last: '—' }
    return { first: p[0]!, last: p.slice(1).join(' ') }
  })()
  const docType =
    typeof data.documentType === 'string' && data.documentType.trim()
      ? data.documentType.trim().toUpperCase()
      : 'CC'
  const docNum =
    typeof data.documentNumber === 'string' && data.documentNumber.trim()
      ? data.documentNumber.trim()
      : ''
  if (!docNum || docNum.length < 5) {
    throw new HttpsError('invalid-argument', 'Ingresá tu número de documento.')
  }
  const phone =
    typeof data.phone === 'string' && data.phone.replace(/\D/g, '').length >= 10
      ? data.phone.replace(/\D/g, '')
      : ''
  if (!phone) {
    throw new HttpsError('invalid-argument', 'Ingresá tu celular (mínimo 10 dígitos).')
  }
  const email =
    typeof data.email === 'string' && data.email.includes('@') ? data.email.trim() : fallbackEmail
  if (!email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Email inválido.')
  }
  return {
    firstName: first.slice(0, 80),
    lastName: last.slice(0, 80),
    email,
    phone,
    documentType: docType.slice(0, 12),
    documentNumber: docNum.slice(0, 32),
  }
}

export const mcBillingGetSdkContext = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  await resolveTenantOwner(uid)
  const { publicKey, captureRouteId } = await getPlatformBillingCreds()
  return {
    publicKey,
    captureRouteId,
    isLive: publicKey.startsWith('pk_live'),
  }
})

export const mcBillingValidateDiscountCode = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  const data = request.data as { period?: unknown; code?: unknown }
  const period: McBillingPeriod = data.period === 'yearly' ? 'yearly' : 'monthly'
  const code = typeof data.code === 'string' ? data.code.trim() : ''
  if (!code) throw new HttpsError('invalid-argument', 'Ingresá un código.')
  try {
    const pricing = await mcBillingResolvePrice(db, period, code)
    return {
      ok: true as const,
      basePriceCop: pricing.basePriceCop,
      finalPriceCop: pricing.finalPriceCop,
      freeTrialDays: pricing.freeTrialDays,
    }
  } catch (e) {
    throw new HttpsError('failed-precondition', e instanceof Error ? e.message : 'Código inválido.')
  }
})

export const mcBillingEnsureCustomer = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  const { tenantId } = await resolveTenantOwner(uid)
  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as Record<
    string,
    unknown
  >
  const userSnap = await db.doc(`mc_users/${uid}`).get()
  const u = userSnap.data() as { email?: string; displayName?: string }
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const nombreTienda = (tenantSnap.data() as { nombreTienda?: string }).nombreTienda ?? 'Tienda'
  const payer = parsePayer(data, u.email ?? '', u.displayName ?? nombreTienda)
  const { secretKey } = await getPlatformBillingCreds()
  const customerId = await mcBillingEnsureCustomerV2(db, tenantId, payer, secretKey)
  return { ok: true as const, customerId }
})

export const mcBillingAddCard = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  const { tenantId } = await resolveTenantOwner(uid)
  const cardToken = typeof (request.data as { cardToken?: unknown })?.cardToken === 'string'
    ? (request.data as { cardToken: string }).cardToken.trim()
    : ''
  if (!cardToken) throw new HttpsError('invalid-argument', 'Falta el token de tarjeta.')

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const customerId = (tenantSnap.data() as { billingOnePayCustomerId?: string }).billingOnePayCustomerId?.trim()
  if (!customerId) {
    throw new HttpsError('failed-precondition', 'Completá primero tus datos de facturación.')
  }
  const { secretKey } = await getPlatformBillingCreds()
  const card = await onepayCreateTokenizedCard({ secretKey, customerId, cardToken })
  await db.doc(`mc_tenants/${tenantId}`).set(
    {
      billingPinnedCardId: card.id,
      billingPinnedAccountId: FieldValue.delete(),
      billingDebitMethod: 'card',
    },
    { merge: true },
  )
  return { ok: true as const, cardId: card.id, brand: card.brand, lastFour: card.last_four }
})

export const mcBillingListNequiBanks = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  await resolveTenantOwner(uid)
  const { secretKey } = await getPlatformBillingCreds()
  const banks = await onepayListNequiBanks(secretKey)
  if (banks.length === 0) {
    throw new HttpsError('failed-precondition', 'No se encontró Nequi en el catálogo OnePay.')
  }
  return { banks }
})

export const mcBillingAddNequi = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  const { tenantId } = await resolveTenantOwner(uid)
  const data = request.data as { phone?: unknown; bankId?: unknown }
  const phone = typeof data.phone === 'string' ? data.phone.replace(/\D/g, '') : ''
  const bankId = typeof data.bankId === 'string' ? data.bankId.trim() : ''
  if (!phone || phone.length < 10) {
    throw new HttpsError('invalid-argument', 'Ingresá tu número de celular Nequi.')
  }
  if (!bankId) throw new HttpsError('invalid-argument', 'Seleccioná Nequi.')

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const customerId = (tenantSnap.data() as { billingOnePayCustomerId?: string }).billingOnePayCustomerId?.trim()
  if (!customerId) {
    throw new HttpsError('failed-precondition', 'Completá primero tus datos de facturación.')
  }
  const { secretKey } = await getPlatformBillingCreds()
  const acct = await onepayCreateNequiAccount({
    secretKey,
    customerId,
    accountNumber: phone,
    bankId,
  })
  await db.doc(`mc_tenants/${tenantId}`).set(
    {
      billingPinnedAccountId: acct.id,
      billingPinnedCardId: FieldValue.delete(),
      billingDebitMethod: 'nequi',
    },
    { merge: true },
  )
  const st = (acct.status ?? '').toUpperCase()
  const needsWait =
    st === 'PENDING' ||
    st === 'VALIDATING' ||
    st === 'WAITING' ||
    acct.authorization !== true
  return {
    ok: true as const,
    accountId: acct.id,
    status: acct.status,
    awaitingApproval: needsWait,
  }
})

export const mcBillingValidateNequi = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  const { tenantId } = await resolveTenantOwner(uid)
  const accountId =
    typeof (request.data as { accountId?: unknown })?.accountId === 'string'
      ? (request.data as { accountId: string }).accountId.trim()
      : ''
  const otp =
    typeof (request.data as { otp?: unknown })?.otp === 'string'
      ? (request.data as { otp: string }).otp.trim()
      : undefined
  if (!accountId) throw new HttpsError('invalid-argument', 'accountId requerido.')
  const { secretKey } = await getPlatformBillingCreds()
  const out = await onepayValidateAccount(accountId, secretKey, otp)
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const customerId = (tenantSnap.data() as { billingOnePayCustomerId?: string }).billingOnePayCustomerId?.trim()
  if (customerId) {
    const accounts = await onepayListAccounts(customerId, secretKey)
    const acc = accounts.find((a) => a.id === accountId)
    if (acc && accountReadyForDebit(acc)) {
      await db.doc(`mc_tenants/${tenantId}`).set({ billingPinnedAccountId: accountId }, { merge: true })
    }
  }
  return { ok: true as const, status: out.status, message: out.message }
})

export const mcBillingCompleteActivation = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  const { tenantId } = await resolveTenantOwner(uid)
  const data = request.data as {
    period?: unknown
    method?: unknown
    cardId?: unknown
    accountId?: unknown
    discountCode?: unknown
  }
  const period: McBillingPeriod = data.period === 'yearly' ? 'yearly' : 'monthly'
  const methodRaw = data.method === 'nequi' ? 'nequi' : 'card'
  const method: McBillingDebitMethod = methodRaw
  const cardId = typeof data.cardId === 'string' ? data.cardId.trim() : ''
  const accountId = typeof data.accountId === 'string' ? data.accountId.trim() : ''
  const discountCode = typeof data.discountCode === 'string' ? data.discountCode.trim() : ''

  if (method === 'card' && !cardId) {
    throw new HttpsError('invalid-argument', 'Registrá tu tarjeta antes de activar.')
  }
  if (method === 'nequi' && !accountId) {
    throw new HttpsError('invalid-argument', 'Vinculá Nequi antes de activar.')
  }

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const nombreTienda = (tenantSnap.data() as { nombreTienda?: string }).nombreTienda ?? 'Tienda'
  const { secretKey } = await getPlatformBillingCreds()

  if (method === 'nequi' && accountId) {
    const customerId = (tenantSnap.data() as { billingOnePayCustomerId?: string }).billingOnePayCustomerId?.trim()
    if (customerId) {
      const accounts = await onepayListAccounts(customerId, secretKey)
      const acc = accounts.find((a) => a.id === accountId)
      if (acc && !accountReadyForDebit(acc)) {
        throw new HttpsError(
          'failed-precondition',
          'Tu Nequi aún no está listo. Aprobá la vinculación en la app Nequi e intentá de nuevo.',
        )
      }
    }
  }

  const result = await mcBillingActivateWithCharge({
    db,
    tenantId,
    period,
    method,
    cardId: method === 'card' ? cardId : undefined,
    accountId: method === 'nequi' ? accountId : undefined,
    discountCodeRaw: discountCode || undefined,
    platformSk: secretKey,
    nombreTienda,
  })

  return {
    ok: true as const,
    chargeId: result.chargeId,
    status: result.status,
    pending: result.pending,
    message: result.message,
  }
})

export const mcBillingPaymentMethods = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  const { tenantId } = await resolveTenantOwner(uid)
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const customerId = (tenantSnap.data() as { billingOnePayCustomerId?: string }).billingOnePayCustomerId?.trim()
  if (!customerId) return { cards: [], nequiAccounts: [] }
  const { secretKey } = await getPlatformBillingCreds()
  const [cards, accounts] = await Promise.all([
    onepayListCards(customerId, secretKey),
    onepayListAccounts(customerId, secretKey),
  ])
  const nequiAccounts = accounts.filter(
    (a) => (a.subtype ?? '').toUpperCase() === 'ELECTRONIC_DEPOSIT',
  )
  return { cards, nequiAccounts }
})

export const mcBillingCron = onSchedule(
  { schedule: 'every 6 hours', timeZone: 'America/Bogota' },
  async () => {
    const pc = await db.doc('mc_platform/credentials_onepay').get()
    const sk = (pc.data() as { secretKey?: string } | undefined)?.secretKey?.trim()
    if (!sk) return
    await mcBillingRunDueRenewals(db, sk)
    await mcBillingProcessGraceExpiries(db)
  },
)

export { mcBillingTryFinalizeFromChargeWebhook } from './service.js'
