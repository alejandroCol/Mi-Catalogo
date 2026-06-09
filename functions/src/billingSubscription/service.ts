import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import {
  MC_BILLING_GRACE_MS,
  MC_BILLING_METADATA_KEYS,
  MC_BILLING_PAYMENTS_COLLECTION,
  MC_BILLING_PURPOSE,
  MC_BILLING_SUB_COLLECTION,
  MC_BILLING_SUB_DOC,
  type McBillingDebitMethod,
} from './constants.js'
import { resolveBillingDiscountCode } from './discountCodes.js'
import { billingPhoneE164Co } from './phone.js'
import {
  billingMetadataForApi,
  chargeStatusFailed,
  chargeStatusPaid,
  onepayCreateBillingCharge,
  onepayCreateBillingCustomer,
  readBillingMeta,
} from './onepayBillingApi.js'
import { mcCatalogUnpublishIfNeeded } from '../catalogPublish.js'
import {
  advancePeriodEndMs,
  computeFirstPeriodEndMs,
  computeFreeMonthsEndMs,
  idempotencyKeyForBillingDebit,
  nextDebitDueFromPeriodEnd,
  type McBillingPeriod,
} from './schedule.js'

export type McBillingSubFirestore = {
  status: 'active' | 'past_due' | 'canceled'
  billingPeriod: McBillingPeriod
  currentPeriodStartMs: number
  currentPeriodEndMs: number
  nextDebitDueAtMs?: number
  amountCop: number
  discountCodeId?: string
  debitMethodKind?: 'card' | 'account'
  autoRenewEnabled?: boolean
  lastChargeId?: string
  pendingChargeId?: string
  lastProcessedChargeId?: string
  failureStreak?: number
  updatedAt?: unknown
}

function paymentsRef(db: Firestore, tenantId: string, chargeId: string) {
  return db.doc(
    `mc_tenants/${tenantId}/${MC_BILLING_PAYMENTS_COLLECTION}/${chargeId}`,
  )
}

async function mcBillingRecordPayment(
  db: Firestore,
  tenantId: string,
  params: {
    chargeId: string
    amountCop: number
    period: McBillingPeriod
    kind: 'activation' | 'renewal'
    status?: string
  },
): Promise<void> {
  await paymentsRef(db, tenantId, params.chargeId).set(
    {
      chargeId: params.chargeId,
      amountCop: params.amountCop,
      period: params.period,
      kind: params.kind,
      status: params.status ?? 'paid',
      createdAt: Date.now(),
    },
    { merge: true },
  )
}

function subRef(db: Firestore, tenantId: string) {
  return db.doc(`mc_tenants/${tenantId}/${MC_BILLING_SUB_COLLECTION}/${MC_BILLING_SUB_DOC}`)
}

function buildMeta(tenantId: string, periodKey: string, period: McBillingPeriod) {
  return billingMetadataForApi([
    { key: MC_BILLING_METADATA_KEYS.purpose, value: MC_BILLING_PURPOSE },
    { key: MC_BILLING_METADATA_KEYS.tenantId, value: tenantId },
    { key: MC_BILLING_METADATA_KEYS.periodKey, value: periodKey },
    { key: MC_BILLING_METADATA_KEYS.period, value: period },
  ])
}

export type McBillingPayerProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string
  documentType: string
  documentNumber: string
}

function splitName(displayName: string): { first: string; last: string } {
  const p = displayName.trim().split(/\s+/)
  if (p.length === 0) return { first: 'Titular', last: 'Mi Catálogo' }
  if (p.length === 1) return { first: p[0]!, last: '—' }
  return { first: p[0]!, last: p.slice(1).join(' ') }
}

export async function mcBillingEnsureCustomerV2(
  db: Firestore,
  tenantId: string,
  payer: McBillingPayerProfile,
  platformSk: string,
): Promise<string> {
  const tref = db.doc(`mc_tenants/${tenantId}`)
  const t = (await tref.get()).data() as { billingOnePayCustomerId?: string }
  if (t?.billingOnePayCustomerId?.trim()) return t.billingOnePayCustomerId.trim()

  const id = await onepayCreateBillingCustomer(
    {
      first_name: payer.firstName,
      last_name: payer.lastName,
      email: payer.email,
      phone: billingPhoneE164Co(payer.phone),
      document_type: payer.documentType,
      document_number: payer.documentNumber,
    },
    platformSk,
  )
  await tref.set(
    {
      billingOnePayCustomerId: id,
      billingPayerFirstName: payer.firstName,
      billingPayerLastName: payer.lastName,
      billingPayerDocumentType: payer.documentType,
      billingPayerDocumentNumber: payer.documentNumber,
      billingPayerPhone: payer.phone,
    },
    { merge: true },
  )
  return id
}

export async function mcBillingResolvePrice(
  db: Firestore,
  period: McBillingPeriod,
  discountCodeRaw?: string,
  tenantId?: string,
): Promise<{
  basePriceCop: number
  finalPriceCop: number
  discountCodeId?: string
  freeMonths?: number
  freeTrialDays?: number
  requiresPaymentMethod?: boolean
}> {
  const settingsSnap = await db.doc('mc_platform/settings').get()
  const s = settingsSnap.data() as {
    planExpertPrecioMensualCop?: number
    planExpertPrecioAnualCop?: number
  }
  const basePriceCop =
    period === 'yearly'
      ? Math.max(0, Math.round(Number(s?.planExpertPrecioAnualCop ?? 299_000)))
      : Math.max(0, Math.round(Number(s?.planExpertPrecioMensualCop ?? 29_900)))

  if (!discountCodeRaw?.trim()) {
    return { basePriceCop, finalPriceCop: basePriceCop }
  }
  const resolved = await resolveBillingDiscountCode(db, discountCodeRaw, period, basePriceCop, tenantId)
  if (!resolved.ok) {
    throw new Error(resolved.error)
  }
  return {
    basePriceCop,
    finalPriceCop: resolved.finalPriceCop,
    discountCodeId: resolved.codeId,
    freeMonths: resolved.freeMonths,
    freeTrialDays: resolved.freeTrialDays,
    requiresPaymentMethod: resolved.requiresPaymentMethod,
  }
}

/** Activa Expert tras pago aprobado (checkout o renovación). */
export async function mcBillingApplyPaidPeriod(params: {
  db: Firestore
  tenantId: string
  period: McBillingPeriod
  amountCop: number
  discountCodeId?: string
  freeMonths?: number
  freeTrialDays?: number
  chargeId?: string
  isRenewal?: boolean
}): Promise<void> {
  const { db, tenantId, period, amountCop, discountCodeId, freeMonths, freeTrialDays, chargeId, isRenewal } =
    params
  const tenantRef = db.doc(`mc_tenants/${tenantId}`)
  const tenantSnap = await tenantRef.get()
  if (!tenantSnap.exists) return

  const tenant = tenantSnap.data() as {
    subscriptionEndsAt?: number
    billingOnePayCustomerId?: string
    billingPinnedCardId?: string
  }

  const now = Date.now()
  const subSnap = await subRef(db, tenantId).get()
  const sub = subSnap.exists ? (subSnap.data() as McBillingSubFirestore) : null

  let periodStart = now
  let periodEnd: number
  if (isRenewal && sub?.currentPeriodEndMs && sub.currentPeriodEndMs > now) {
    periodStart = sub.currentPeriodStartMs
    periodEnd = advancePeriodEndMs(sub.currentPeriodEndMs, period)
  } else if (
    typeof tenant.subscriptionEndsAt === 'number' &&
    tenant.subscriptionEndsAt > now &&
    isRenewal
  ) {
    periodEnd = advancePeriodEndMs(tenant.subscriptionEndsAt, period)
    periodStart = sub?.currentPeriodStartMs ?? now
  } else if (freeMonths && freeMonths > 0 && !isRenewal) {
    periodEnd = computeFreeMonthsEndMs(now, freeMonths)
  } else if (freeTrialDays && freeTrialDays > 0 && !isRenewal) {
    periodEnd = now + freeTrialDays * 24 * 60 * 60 * 1000
  } else {
    periodEnd = computeFirstPeriodEndMs(now, period)
  }

  const nextDebit = nextDebitDueFromPeriodEnd(periodEnd, 0)
  const subscriptionEndsAt = Math.max(tenant.subscriptionEndsAt ?? 0, periodEnd)

  const subPayload: McBillingSubFirestore = {
    status: 'active',
    billingPeriod: period,
    currentPeriodStartMs: periodStart,
    currentPeriodEndMs: periodEnd,
    nextDebitDueAtMs: nextDebit,
    amountCop,
    autoRenewEnabled: true,
    ...(discountCodeId ? { discountCodeId } : {}),
    ...(chargeId ? { lastChargeId: chargeId } : {}),
    failureStreak: 0,
    updatedAt: FieldValue.serverTimestamp(),
  }

  await subRef(db, tenantId).set(
    {
      ...subPayload,
      ...(chargeId ? { pendingChargeId: FieldValue.delete() } : {}),
    },
    { merge: true },
  )
  await tenantRef.set(
    {
      billingPlan: 'expert',
      subscriptionEndsAt,
      subscriptionPlan: period === 'yearly' ? 'yearly' : 'monthly',
      billingSubStatus: 'active',
      billingAutoRenewEnabled: true,
      billingGraceUntilMs: FieldValue.delete(),
      billingPastDueSinceMs: FieldValue.delete(),
      updatedAt: now,
    },
    { merge: true },
  )

  if (chargeId && amountCop > 0) {
    await mcBillingRecordPayment(db, tenantId, {
      chargeId,
      amountCop,
      period,
      kind: isRenewal ? 'renewal' : 'activation',
    })
  }

  if (discountCodeId) {
    await db.doc(`mc_billing_discount_codes/${discountCodeId}`).set(
      { redemptionCount: FieldValue.increment(1) },
      { merge: true },
    )
  }
}

/** Pago vencido: gracia 7 días, mantiene Expert. */
export async function mcBillingMarkPastDue(db: Firestore, tenantId: string): Promise<void> {
  const now = Date.now()
  const graceUntil = now + MC_BILLING_GRACE_MS
  await subRef(db, tenantId).set(
    {
      status: 'past_due',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  await db.doc(`mc_tenants/${tenantId}`).set(
    {
      billingSubStatus: 'past_due',
      billingPastDueSinceMs: now,
      billingGraceUntilMs: graceUntil,
      updatedAt: now,
    },
    { merge: true },
  )
}

/** Tras gracia: vuelve a Free y resetea configuración Expert. */
export async function mcBillingDowngradeToFree(db: Firestore, tenantId: string): Promise<void> {
  const now = Date.now()
  await subRef(db, tenantId).set(
    {
      status: 'canceled',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const tenantData = tenantSnap.exists ? tenantSnap.data() : null

  await db.doc(`mc_tenants/${tenantId}`).set(
    {
      billingPlan: 'free',
      billingSubStatus: 'canceled',
      subscriptionEndsAt: FieldValue.delete(),
      subscriptionPlan: FieldValue.delete(),
      billingGraceUntilMs: FieldValue.delete(),
      billingPastDueSinceMs: FieldValue.delete(),
      billingPinnedCardId: FieldValue.delete(),
      billingPinnedAccountId: FieldValue.delete(),
      updatedAt: now,
    },
    { merge: true },
  )

  if (tenantData) {
    await mcCatalogUnpublishIfNeeded(db, tenantId, {
      ...tenantData,
      billingPlan: 'free',
      subscriptionEndsAt: undefined,
      billingSubStatus: 'canceled',
      billingGraceUntilMs: undefined,
    })
  }
}

/** Activa suscripción V2: primer cargo directo (tarjeta o Nequi). */
export async function mcBillingActivateWithCharge(params: {
  db: Firestore
  tenantId: string
  period: McBillingPeriod
  method: McBillingDebitMethod
  cardId?: string
  accountId?: string
  discountCodeRaw?: string
  platformSk: string
  nombreTienda: string
}): Promise<{
  chargeId: string
  status?: string
  pending: boolean
  message?: string
}> {
  const pricing = await mcBillingResolvePrice(
    params.db,
    params.period,
    params.discountCodeRaw,
    params.tenantId,
  )

  if (pricing.finalPriceCop === 0) {
    if (pricing.requiresPaymentMethod) {
      return mcBillingActivatePromoWithPaymentMethod({
        db: params.db,
        tenantId: params.tenantId,
        period: params.period,
        method: params.method,
        cardId: params.cardId,
        accountId: params.accountId,
        pricing,
      })
    }
    await mcBillingActivateFreeWithCode({
      db: params.db,
      tenantId: params.tenantId,
      period: params.period,
      discountCodeRaw: params.discountCodeRaw ?? '',
    })
    return { chargeId: 'free', status: 'paid', pending: false }
  }

  const tenantSnap = await params.db.doc(`mc_tenants/${params.tenantId}`).get()
  const customerId = (tenantSnap.data() as { billingOnePayCustomerId?: string }).billingOnePayCustomerId?.trim()
  if (!customerId) throw new Error('Primero completá tus datos de facturación.')

  const initMs = Date.now()
  const periodKey = `init-${initMs}`
  const idem = idempotencyKeyForBillingDebit(params.tenantId, initMs)
  const title = `Plan Expert · ${params.nombreTienda.slice(0, 60)}`

  const ch = await onepayCreateBillingCharge({
    secretKey: params.platformSk,
    customerId,
    amountCop: pricing.finalPriceCop,
    title,
    cardId: params.method === 'card' ? params.cardId : undefined,
    accountId: params.method === 'nequi' ? params.accountId : undefined,
    metadata: buildMeta(params.tenantId, periodKey, params.period),
    externalId: `mcb-${params.tenantId.slice(0, 8)}-${periodKey}`.slice(0, 64),
    idempotencyKey: idem,
  })

  const pin: Record<string, unknown> = {
    billingDebitMethod: params.method,
    billingPinnedCardId: params.method === 'card' && params.cardId ? params.cardId : FieldValue.delete(),
    billingPinnedAccountId:
      params.method === 'nequi' && params.accountId ? params.accountId : FieldValue.delete(),
  }
  await params.db.doc(`mc_tenants/${params.tenantId}`).set(pin, { merge: true })

  const periodStart = Date.now()
  const periodEnd = computeFirstPeriodEndMs(periodStart, params.period)
  const subInit: McBillingSubFirestore = {
    status: 'active',
    billingPeriod: params.period,
    currentPeriodStartMs: periodStart,
    currentPeriodEndMs: periodEnd,
    nextDebitDueAtMs: nextDebitDueFromPeriodEnd(periodEnd, 0),
    amountCop: pricing.finalPriceCop,
    discountCodeId: pricing.discountCodeId,
    autoRenewEnabled: true,
    lastChargeId: ch.id,
    debitMethodKind: params.method === 'nequi' ? 'account' : 'card',
    updatedAt: FieldValue.serverTimestamp(),
  }
  await subRef(params.db, params.tenantId).set(
    {
      ...subInit,
      ...(chargeStatusPaid(ch.status)
        ? { pendingChargeId: FieldValue.delete() }
        : { pendingChargeId: ch.id }),
    },
    { merge: true },
  )

  if (chargeStatusPaid(ch.status)) {
    await mcBillingApplyPaidPeriod({
      db: params.db,
      tenantId: params.tenantId,
      period: params.period,
      amountCop: pricing.finalPriceCop,
      discountCodeId: pricing.discountCodeId,
      chargeId: ch.id,
    })
    return { chargeId: ch.id, status: ch.status, pending: false, message: ch.message }
  }

  if (chargeStatusFailed(ch.status)) {
    throw new Error(ch.message || 'El cobro fue rechazado.')
  }

  return {
    chargeId: ch.id,
    status: ch.status,
    pending: true,
    message:
      ch.message ??
      'Pago en proceso. En cuanto OnePay confirme, activamos tu plan (suele tardar segundos).',
  }
}

export async function mcBillingTryFinalizeFromChargeWebhook(params: {
  db: Firestore
  chargeId: string
  platformSk: string
  chargeMeta?: unknown
}): Promise<boolean> {
  const { db, chargeId, platformSk, chargeMeta } = params
  const purpose = readBillingMeta(chargeMeta, MC_BILLING_METADATA_KEYS.purpose)
  if (purpose && purpose !== MC_BILLING_PURPOSE) return false

  const tenantId = readBillingMeta(chargeMeta, MC_BILLING_METADATA_KEYS.tenantId)
  if (!tenantId) return false

  const periodRaw = readBillingMeta(chargeMeta, MC_BILLING_METADATA_KEYS.period)
  const period: McBillingPeriod = periodRaw === 'yearly' ? 'yearly' : 'monthly'

  const sref = subRef(db, tenantId)
  const snap = await sref.get()
  if (!snap.exists) return false
  const d = snap.data() as McBillingSubFirestore
  if (d.status !== 'active' && d.status !== 'past_due') return false

  const processed = (d as { lastProcessedChargeId?: string }).lastProcessedChargeId
  if (processed === chargeId) return true

  const lastC = d.lastChargeId
  const pend = d.pendingChargeId
  if (lastC !== chargeId && pend !== chargeId) return false

  await mcBillingApplyPaidPeriod({
    db,
    tenantId,
    period: d.billingPeriod ?? period,
    amountCop: d.amountCop,
    discountCodeId: d.discountCodeId,
    chargeId,
    isRenewal: Boolean(d.currentPeriodEndMs && d.currentPeriodEndMs > Date.now()),
  })
  await sref.set({ lastProcessedChargeId: chargeId, pendingChargeId: FieldValue.delete() }, { merge: true })
  return true
}

export async function mcBillingRunDueRenewals(
  db: Firestore,
  platformSk: string,
): Promise<{ processed: number; failed: number }> {
  const now = Date.now()
  let processed = 0
  let failed = 0

  const tenantsSnap = await db
    .collectionGroup(MC_BILLING_SUB_COLLECTION)
    .where('status', '==', 'active')
    .where('nextDebitDueAtMs', '<=', now)
    .limit(50)
    .get()

  for (const doc of tenantsSnap.docs) {
    const tenantId = doc.ref.parent.parent?.id
    if (!tenantId) continue
    const sub = doc.data() as McBillingSubFirestore
    if (sub.pendingChargeId) continue
    if (sub.autoRenewEnabled === false) continue

    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
    if (!tenantSnap.exists) continue
    const tenant = tenantSnap.data() as {
      billingOnePayCustomerId?: string
      billingPinnedCardId?: string
      billingPinnedAccountId?: string
      nombreTienda?: string
    }

    const customerId = tenant.billingOnePayCustomerId?.trim()
    const cardId = tenant.billingPinnedCardId?.trim()
    const accountId = tenant.billingPinnedAccountId?.trim()
    const useNequi = sub.debitMethodKind === 'account' || (!cardId && accountId)

    if (!customerId || (!cardId && !accountId)) {
      await mcBillingMarkPastDue(db, tenantId)
      failed++
      continue
    }

    const periodEnd = sub.currentPeriodEndMs
    const idem = idempotencyKeyForBillingDebit(tenantId, periodEnd)
    const title = `Expert · ${(tenant.nombreTienda ?? 'Mi Catálogo').slice(0, 40)}`

    try {
      const ch = await onepayCreateBillingCharge({
        secretKey: platformSk,
        customerId,
        amountCop: sub.amountCop,
        title,
        cardId: useNequi ? undefined : cardId,
        accountId: useNequi ? accountId : undefined,
        metadata: buildMeta(tenantId, `renew-${periodEnd}`, sub.billingPeriod),
        idempotencyKey: idem,
      })
      const st = (ch.status ?? '').toLowerCase()
      if (st === 'declined' || st === 'failed') {
        await mcBillingMarkPastDue(db, tenantId)
        failed++
        continue
      }
      if (st === 'succeeded' || st === 'paid' || st === 'approved') {
        await mcBillingApplyPaidPeriod({
          db,
          tenantId,
          period: sub.billingPeriod,
          amountCop: sub.amountCop,
          discountCodeId: sub.discountCodeId,
          chargeId: ch.id,
          isRenewal: true,
        })
        processed++
      } else {
        await doc.ref.set({ pendingChargeId: ch.id, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
      }
    } catch {
      await mcBillingMarkPastDue(db, tenantId)
      failed++
    }
  }
  return { processed, failed }
}

export async function mcBillingProcessGraceExpiries(db: Firestore): Promise<number> {
  const now = Date.now()
  const snap = await db
    .collection('mc_tenants')
    .where('billingSubStatus', '==', 'past_due')
    .where('billingGraceUntilMs', '<=', now)
    .limit(50)
    .get()

  let n = 0
  for (const doc of snap.docs) {
    await mcBillingDowngradeToFree(db, doc.id)
    n++
  }
  return n
}

export async function mcBillingActivateFreeWithCode(params: {
  db: Firestore
  tenantId: string
  period: McBillingPeriod
  discountCodeRaw: string
}): Promise<void> {
  const pricing = await mcBillingResolvePrice(
    params.db,
    params.period,
    params.discountCodeRaw,
    params.tenantId,
  )
  if (pricing.finalPriceCop > 0) {
    throw new Error('Este código no activa el plan gratis.')
  }
  if (pricing.requiresPaymentMethod) {
    throw new Error('Este código requiere registrar un método de pago.')
  }
  await mcBillingApplyPaidPeriod({
    db: params.db,
    tenantId: params.tenantId,
    period: params.period,
    amountCop: 0,
    discountCodeId: pricing.discountCodeId,
    freeMonths: pricing.freeMonths,
    freeTrialDays: pricing.freeTrialDays ?? (params.period === 'yearly' ? 365 : 30),
  })
}

/** Primer período gratis con método de pago vinculado; renovaciones al precio base. */
async function mcBillingActivatePromoWithPaymentMethod(params: {
  db: Firestore
  tenantId: string
  period: McBillingPeriod
  method: McBillingDebitMethod
  cardId?: string
  accountId?: string
  pricing: Awaited<ReturnType<typeof mcBillingResolvePrice>>
}): Promise<{ chargeId: string; status?: string; pending: boolean; message?: string }> {
  const { db, tenantId, period, method, cardId, accountId, pricing } = params

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  const customerId = (tenantSnap.data() as { billingOnePayCustomerId?: string }).billingOnePayCustomerId?.trim()
  if (!customerId) throw new Error('Primero completá tus datos de facturación.')
  if (method === 'card' && !cardId?.trim()) {
    throw new Error('Registrá tu tarjeta antes de activar.')
  }
  if (method === 'nequi' && !accountId?.trim()) {
    throw new Error('Vinculá Nequi antes de activar.')
  }

  const pin: Record<string, unknown> = {
    billingDebitMethod: method,
    billingPinnedCardId: method === 'card' && cardId ? cardId : FieldValue.delete(),
    billingPinnedAccountId: method === 'nequi' && accountId ? accountId : FieldValue.delete(),
  }
  await db.doc(`mc_tenants/${tenantId}`).set(pin, { merge: true })

  await mcBillingApplyPaidPeriod({
    db,
    tenantId,
    period,
    amountCop: pricing.basePriceCop,
    discountCodeId: pricing.discountCodeId,
    freeMonths: pricing.freeMonths,
    freeTrialDays: pricing.freeTrialDays,
  })

  await subRef(db, tenantId).set(
    {
      debitMethodKind: method === 'nequi' ? 'account' : 'card',
    },
    { merge: true },
  )

  return {
    chargeId: 'promo-free',
    status: 'paid',
    pending: false,
    message: 'Plan activado. El primer período es gratis; el cobro normal empieza en la renovación.',
  }
}

/** Detiene renovaciones automáticas; el plan sigue vigente hasta subscriptionEndsAt. */
export async function mcBillingCancelAutoRenew(db: Firestore, tenantId: string): Promise<void> {
  const tenantRef = db.doc(`mc_tenants/${tenantId}`)
  const tenantSnap = await tenantRef.get()
  if (!tenantSnap.exists) throw new Error('Tienda no encontrada.')

  const tenant = tenantSnap.data() as { subscriptionEndsAt?: number }
  if (typeof tenant.subscriptionEndsAt !== 'number' || tenant.subscriptionEndsAt <= Date.now()) {
    throw new Error('No hay un plan vigente para modificar.')
  }

  await subRef(db, tenantId).set(
    {
      autoRenewEnabled: false,
      nextDebitDueAtMs: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  await tenantRef.set(
    {
      billingAutoRenewEnabled: false,
      billingPinnedCardId: FieldValue.delete(),
      billingPinnedAccountId: FieldValue.delete(),
      billingDebitMethod: FieldValue.delete(),
      updatedAt: Date.now(),
    },
    { merge: true },
  )
}

export async function mcBillingListPaymentHistory(
  db: Firestore,
  tenantId: string,
  limit = 24,
): Promise<
  {
    chargeId: string
    amountCop: number
    period: McBillingPeriod
    kind: 'activation' | 'renewal'
    status: string
    createdAt: number
  }[]
> {
  const snap = await db
    .collection(`mc_tenants/${tenantId}/${MC_BILLING_PAYMENTS_COLLECTION}`)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()
  return snap.docs.map((d) => {
    const row = d.data() as {
      chargeId?: string
      amountCop?: number
      period?: McBillingPeriod
      kind?: 'activation' | 'renewal'
      status?: string
      createdAt?: number
    }
    return {
      chargeId: row.chargeId ?? d.id,
      amountCop: Math.max(0, Math.round(Number(row.amountCop ?? 0))),
      period: row.period === 'yearly' ? 'yearly' : 'monthly',
      kind: row.kind === 'renewal' ? 'renewal' : 'activation',
      status: row.status ?? 'paid',
      createdAt: typeof row.createdAt === 'number' ? row.createdAt : 0,
    }
  })
}

