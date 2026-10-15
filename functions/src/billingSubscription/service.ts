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
import { computeMonthPromoTotals, resolveLiveMonthPromo } from './monthPromo.js'
import { billingPhoneE164Co } from './phone.js'
import {
  billingMetadataForApi,
  chargeStatusFailed,
  chargeStatusPaid,
  onepayCreateBillingCharge,
  onepayCreateBillingCustomer,
  onepayGetCharge,
  readBillingMeta,
  type OnePayChargeDetails,
} from './onepayBillingApi.js'
import { mcCatalogUnpublishIfNeeded } from '../catalogPublish.js'
import { resolveBillingWebhookChargeMatch } from './webhookMatch.js'
import {
  advancePeriodEndMs,
  computeFirstPeriodEndMs,
  computeFreeMonthsEndMs,
  computePrepaidMonthsEndMs,
  idempotencyKeyForActivation,
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
  /** `charge_id` de OnePay: el id que llega en webhooks `charge.*`. */
  lastChargeAttemptId?: string
  pendingChargeAttemptId?: string
  lastProcessedChargeId?: string
  pendingPrepaidMonths?: number
  pendingRenewalAmountCop?: number
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

/** Firestore rechaza valores `undefined` explícitos. */
function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as Partial<T>
}

function isBillingChargeExternalId(externalId?: string): boolean {
  const ext = externalId?.trim() ?? ''
  return ext.startsWith('mcb_') || ext.startsWith('mcb-')
}

/** `external_id` con el tenant completo. OnePay lo limita a 100 caracteres. */
function billingExternalId(tenantId: string, periodKey: string): string {
  const id = `mcb_${tenantId}_${periodKey}`
  return id.length <= 100 ? id : `mcb_${tenantId}`.slice(0, 100)
}

function parseBillingExternalId(externalId?: string): { tenantId: string; period: McBillingPeriod } | null {
  const ext = externalId?.trim() ?? ''
  if (!ext.startsWith('mcb_')) return null
  const rest = ext.slice('mcb_'.length)
  const sep = rest.indexOf('_')
  if (sep <= 0) return null
  const tenantId = rest.slice(0, sep).trim()
  const periodKey = rest.slice(sep + 1)
  if (!tenantId || tenantId.includes('/')) return null
  return { tenantId, period: periodKey.includes('yearly') ? 'yearly' : 'monthly' }
}

function parsePeriodFromExternalId(externalId?: string): McBillingPeriod {
  return externalId?.includes('yearly') ? 'yearly' : 'monthly'
}

function billingChargeIsRenewal(
  tenant: { billingPlan?: string; subscriptionEndsAt?: number },
  sub: McBillingSubFirestore | null,
): boolean {
  if (sub?.lastProcessedChargeId) return true
  return (
    tenant.billingPlan === 'expert' &&
    typeof tenant.subscriptionEndsAt === 'number' &&
    tenant.subscriptionEndsAt > Date.now()
  )
}

async function resolveBillingTenantFromCharge(
  db: Firestore,
  chargeMeta: unknown,
  chargeDetails?: OnePayChargeDetails | null,
): Promise<{ tenantId: string; period: McBillingPeriod } | null> {
  const tenantFromMeta = readBillingMeta(chargeMeta, MC_BILLING_METADATA_KEYS.tenantId)
  if (tenantFromMeta) {
    const periodRaw = readBillingMeta(chargeMeta, MC_BILLING_METADATA_KEYS.period)
    return { tenantId: tenantFromMeta, period: periodRaw === 'yearly' ? 'yearly' : 'monthly' }
  }

  const externalId = chargeDetails?.external_id?.trim()
  const parsed = parseBillingExternalId(externalId)
  if (parsed) return parsed
  if (!isBillingChargeExternalId(externalId)) return null

  const customerId = chargeDetails?.customer_id?.trim()
  if (!customerId) return null

  const snap = await db
    .collection('mc_tenants')
    .where('billingOnePayCustomerId', '==', customerId)
    .limit(2)
    .get()
  if (snap.size !== 1) return null

  return {
    tenantId: snap.docs[0]!.id,
    period: parsePeriodFromExternalId(externalId),
  }
}

export type McBillingWebhookResult = 'handled' | 'not_billing' | 'retry'
export { resolveBillingWebhookChargeMatch } from './webhookMatch.js'

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
  options?: { monthPromo?: boolean },
): Promise<{
  basePriceCop: number
  finalPriceCop: number
  discountCodeId?: string
  freeMonths?: number
  freeTrialDays?: number
  requiresPaymentMethod?: boolean
  prepaidMonths?: number
  renewalAmountCop?: number
  isMonthPromo?: boolean
}> {
  const settingsSnap = await db.doc('mc_platform/settings').get()
  const s = settingsSnap.data() as {
    planExpertPrecioMensualCop?: number
    planExpertPrecioAnualCop?: number
    monthPromo?: {
      enabled?: boolean
      monthKey?: string
      discountPercent?: number
      prepaidMonths?: number
    }
  }
  const monthlyCop = Math.max(0, Math.round(Number(s?.planExpertPrecioMensualCop ?? 29_900)))
  const basePriceCop =
    period === 'yearly'
      ? Math.max(0, Math.round(Number(s?.planExpertPrecioAnualCop ?? 299_000)))
      : monthlyCop

  if (options?.monthPromo) {
    const promo = resolveLiveMonthPromo(s)
    if (!promo) {
      throw new Error('La promo del mes no está activa.')
    }
    const totals = computeMonthPromoTotals(monthlyCop, promo)
    return {
      basePriceCop: totals.baseTotalCop,
      finalPriceCop: totals.finalTotalCop,
      prepaidMonths: totals.prepaidMonths,
      renewalAmountCop: totals.renewalAmountCop,
      isMonthPromo: true,
    }
  }

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
  prepaidMonths?: number
  renewalAmountCop?: number
  chargeId?: string
  isRenewal?: boolean
}): Promise<void> {
  const {
    db,
    tenantId,
    period,
    amountCop,
    discountCodeId,
    freeMonths,
    freeTrialDays,
    prepaidMonths,
    renewalAmountCop,
    chargeId,
    isRenewal,
  } = params
  const tenantRef = db.doc(`mc_tenants/${tenantId}`)
  const tenantSnap = await tenantRef.get()
  if (!tenantSnap.exists) {
    console.warn('[mcBillingApplyPaidPeriod] tenant not found', { tenantId, chargeId })
    return
  }

  const tenant = tenantSnap.data() as {
    subscriptionEndsAt?: number
    billingOnePayCustomerId?: string
    billingPinnedCardId?: string
  }

  const now = Date.now()
  const subSnap = await subRef(db, tenantId).get()
  const sub = subSnap.exists ? (subSnap.data() as McBillingSubFirestore) : null
  if (chargeId && sub?.lastProcessedChargeId) {
    const thisCharge = new Set(
      [chargeId, sub.lastChargeId, sub.pendingChargeId, sub.lastChargeAttemptId, sub.pendingChargeAttemptId].filter(
        (id): id is string => Boolean(id),
      ),
    )
    if (thisCharge.has(sub.lastProcessedChargeId) && thisCharge.has(chargeId)) return
  }
  const effectivePrepaidMonths = prepaidMonths ?? sub?.pendingPrepaidMonths
  const effectiveRenewalAmount = renewalAmountCop ?? sub?.pendingRenewalAmountCop

  let periodStart = now
  let periodEnd: number
  if (effectivePrepaidMonths && effectivePrepaidMonths > 1) {
    const liveEnd = Math.max(sub?.currentPeriodEndMs ?? 0, tenant.subscriptionEndsAt ?? 0)
    const anchor = liveEnd > now ? liveEnd : now
    periodStart = sub?.currentPeriodStartMs && liveEnd > now ? sub.currentPeriodStartMs : now
    periodEnd = computePrepaidMonthsEndMs(anchor, effectivePrepaidMonths)
  } else if (isRenewal && sub?.currentPeriodEndMs && sub.currentPeriodEndMs > now) {
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
  const storedAmountCop =
    typeof effectiveRenewalAmount === 'number' && effectiveRenewalAmount > 0
      ? effectiveRenewalAmount
      : amountCop

  const subPayload: McBillingSubFirestore = {
    status: 'active',
    billingPeriod: period,
    currentPeriodStartMs: periodStart,
    currentPeriodEndMs: periodEnd,
    nextDebitDueAtMs: nextDebit,
    amountCop: storedAmountCop,
    autoRenewEnabled: true,
    ...(discountCodeId ? { discountCodeId } : {}),
    ...(chargeId ? { lastChargeId: chargeId } : {}),
    failureStreak: 0,
    updatedAt: FieldValue.serverTimestamp(),
  }

  await subRef(db, tenantId).set(
    {
      ...subPayload,
      ...(chargeId
        ? { pendingChargeId: FieldValue.delete(), lastProcessedChargeId: chargeId }
        : {}),
      pendingPrepaidMonths: FieldValue.delete(),
      pendingRenewalAmountCop: FieldValue.delete(),
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

  console.info('[mcBillingApplyPaidPeriod] expert activated', {
    tenantId,
    chargeId,
    period,
    isRenewal: Boolean(isRenewal),
    subscriptionEndsAt,
  })

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
  monthPromo?: boolean
  platformSk: string
  nombreTienda: string
}): Promise<{
  chargeId: string
  status?: string
  pending: boolean
  message?: string
}> {
  const useMonthPromo = params.monthPromo === true
  const pricing = await mcBillingResolvePrice(
    params.db,
    useMonthPromo ? 'monthly' : params.period,
    useMonthPromo ? undefined : params.discountCodeRaw,
    params.tenantId,
    useMonthPromo ? { monthPromo: true } : undefined,
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
  const tenant = tenantSnap.data() as {
    billingOnePayCustomerId?: string
    subscriptionEndsAt?: number
    billingSubStatus?: string
  }
  const customerId = tenant.billingOnePayCustomerId?.trim()
  if (!customerId) throw new Error('Primero completá tus datos de facturación.')

  const now = Date.now()
  const subSnap = await subRef(params.db, params.tenantId).get()
  const existingSub = subSnap.exists ? (subSnap.data() as McBillingSubFirestore) : null

  if (
    typeof tenant.subscriptionEndsAt === 'number' &&
    tenant.subscriptionEndsAt > now &&
    tenant.billingSubStatus === 'active'
  ) {
    return {
      chargeId: existingSub?.lastProcessedChargeId ?? existingSub?.lastChargeId ?? 'active',
      status: 'paid',
      pending: false,
      message: 'Tu plan ya está activo.',
    }
  }

  const pendingId = existingSub?.pendingChargeId?.trim()
  const pendingAttemptId = existingSub?.pendingChargeAttemptId?.trim()
  if (pendingId) {
    let existingCharge = await onepayGetCharge(pendingId, params.platformSk)
    if (!existingCharge && pendingAttemptId && pendingAttemptId !== pendingId) {
      existingCharge = await onepayGetCharge(pendingAttemptId, params.platformSk)
    }
    const pendingStatus = existingCharge?.status
    const stalePending = existingSub?.lastProcessedChargeId === pendingId
    if (existingCharge && !chargeStatusFailed(pendingStatus)) {
      const paid = chargeStatusPaid(pendingStatus)
      if (paid) {
        const finalized = await mcBillingTryFinalizeFromChargeWebhook({
          db: params.db,
          chargeId: pendingId,
          platformSk: params.platformSk,
          chargeMeta: existingCharge.metadata,
          chargeDetails: existingCharge,
        })
        if (finalized === 'handled') {
          const after = await params.db.doc(`mc_tenants/${params.tenantId}`).get()
          const ends = (after.data() as { subscriptionEndsAt?: number } | undefined)?.subscriptionEndsAt
          if (typeof ends === 'number' && ends > Date.now()) {
            return { chargeId: pendingId, status: pendingStatus, pending: false }
          }
          // Cargo viejo ya aplicado: el plan venció, hay que cobrar de nuevo.
        } else if (finalized === 'retry' || !stalePending) {
          return {
            chargeId: pendingId,
            status: pendingStatus,
            pending: true,
            message:
              params.method === 'nequi'
                ? 'Te enviamos una notificación a Nequi. Abrí la app y aprobá el cobro para activar tu plan.'
                : 'Pago en proceso. En cuanto OnePay confirme, activamos tu plan (suele tardar segundos).',
          }
        }
      } else if (!stalePending) {
        return {
          chargeId: pendingId,
          status: pendingStatus,
          pending: true,
          message:
            params.method === 'nequi'
              ? 'Te enviamos una notificación a Nequi. Abrí la app y aprobá el cobro para activar tu plan.'
              : 'Pago en proceso. En cuanto OnePay confirme, activamos tu plan (suele tardar segundos).',
        }
      }
    } else if (!existingCharge && !stalePending) {
      return {
        chargeId: pendingId,
        status: pendingStatus,
        pending: true,
        message:
          params.method === 'nequi'
            ? 'Te enviamos una notificación a Nequi. Abrí la app y aprobá el cobro para activar tu plan.'
            : 'Pago en proceso. En cuanto OnePay confirme, activamos tu plan (suele tardar segundos).',
      }
    }
  }

  const billingPeriod: McBillingPeriod = useMonthPromo ? 'monthly' : params.period
  const periodKey = useMonthPromo ? 'init-month_promo' : `init-${params.period}`
  const idem = idempotencyKeyForActivation(params.tenantId, useMonthPromo ? 'month_promo' : params.period)
  const title = useMonthPromo
    ? `Promo Expert · ${params.nombreTienda.slice(0, 56)}`
    : `Plan Expert · ${params.nombreTienda.slice(0, 60)}`

  const ch = await onepayCreateBillingCharge({
    secretKey: params.platformSk,
    customerId,
    amountCop: pricing.finalPriceCop,
    title,
    cardId: params.method === 'card' ? params.cardId : undefined,
    accountId: params.method === 'nequi' ? params.accountId : undefined,
    metadata: buildMeta(params.tenantId, periodKey, billingPeriod),
    externalId: billingExternalId(params.tenantId, periodKey),
    idempotencyKey: idem,
  })

  const pin: Record<string, unknown> = {
    billingDebitMethod: params.method,
    billingPinnedCardId: params.method === 'card' && params.cardId ? params.cardId : FieldValue.delete(),
    billingPinnedAccountId:
      params.method === 'nequi' && params.accountId ? params.accountId : FieldValue.delete(),
  }
  await params.db.doc(`mc_tenants/${params.tenantId}`).set(pin, { merge: true })

  const subInit = omitUndefined({
    status: 'active' as const,
    billingPeriod: billingPeriod,
    amountCop: pricing.renewalAmountCop ?? pricing.finalPriceCop,
    ...(pricing.discountCodeId ? { discountCodeId: pricing.discountCodeId } : {}),
    ...(pricing.prepaidMonths ? { pendingPrepaidMonths: pricing.prepaidMonths } : {}),
    ...(pricing.renewalAmountCop ? { pendingRenewalAmountCop: pricing.renewalAmountCop } : {}),
    autoRenewEnabled: true,
    lastChargeId: ch.id,
    ...(ch.attemptId ? { lastChargeAttemptId: ch.attemptId } : {}),
    debitMethodKind: params.method === 'nequi' ? ('account' as const) : ('card' as const),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await subRef(params.db, params.tenantId).set(
    {
      ...subInit,
      ...(chargeStatusPaid(ch.status)
        ? { pendingChargeId: FieldValue.delete(), pendingChargeAttemptId: FieldValue.delete() }
        : {
            pendingChargeId: ch.id,
            ...(ch.attemptId ? { pendingChargeAttemptId: ch.attemptId } : {}),
          }),
    },
    { merge: true },
  )

  if (chargeStatusPaid(ch.status)) {
    await mcBillingApplyPaidPeriod({
      db: params.db,
      tenantId: params.tenantId,
      period: billingPeriod,
      amountCop: pricing.finalPriceCop,
      ...(pricing.discountCodeId ? { discountCodeId: pricing.discountCodeId } : {}),
      ...(pricing.prepaidMonths ? { prepaidMonths: pricing.prepaidMonths } : {}),
      ...(pricing.renewalAmountCop ? { renewalAmountCop: pricing.renewalAmountCop } : {}),
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
      params.method === 'nequi'
        ? 'Te enviamos una notificación a Nequi. Abrí la app y aprobá el cobro para activar tu plan.'
        : ch.message ??
          'Pago en proceso. En cuanto OnePay confirme, activamos tu plan (suele tardar segundos).',
  }
}

export async function mcBillingTryFinalizeFromChargeWebhook(params: {
  db: Firestore
  chargeId: string
  platformSk: string
  chargeMeta?: unknown
  chargeDetails?: OnePayChargeDetails | null
}): Promise<McBillingWebhookResult> {
  const { db, chargeId, chargeMeta, chargeDetails } = params
  let details = chargeDetails ?? null
  if (!details) {
    details = await onepayGetCharge(chargeId, params.platformSk)
  }
  if (!details) {
    console.warn('[mcBillingTryFinalizeFromChargeWebhook] charge not found', { chargeId })
    return 'retry'
  }
  if (!chargeStatusPaid(details.status)) {
    return 'not_billing'
  }

  const meta = chargeMeta ?? details.metadata
  const purpose = readBillingMeta(meta, MC_BILLING_METADATA_KEYS.purpose)
  const resolved = await resolveBillingTenantFromCharge(db, meta, details)

  if (purpose && purpose !== MC_BILLING_PURPOSE) return 'not_billing'
  if (!resolved && !isBillingChargeExternalId(details.external_id)) return 'not_billing'
  if (!resolved) {
    console.warn('[mcBillingTryFinalizeFromChargeWebhook] could not resolve tenant', {
      chargeId,
      externalId: details.external_id,
    })
    return 'retry'
  }

  const { tenantId, period } = resolved
  const tenantRef = db.doc(`mc_tenants/${tenantId}`)
  const tenantSnap = await tenantRef.get()
  if (!tenantSnap.exists) {
    console.warn('[mcBillingTryFinalizeFromChargeWebhook] tenant missing', { tenantId, chargeId })
    return 'retry'
  }
  const tenant = tenantSnap.data() as { billingPlan?: string; subscriptionEndsAt?: number }

  const sref = subRef(db, tenantId)
  const snap = await sref.get()
  let sub = snap.exists ? (snap.data() as McBillingSubFirestore) : null

  const incomingIds = [chargeId, details.attemptId, details.id].filter(
    (id): id is string => Boolean(id?.trim()),
  )
  const lastC = sub?.lastChargeId
  const pend = sub?.pendingChargeId
  const storedIds = [lastC, pend, sub?.lastChargeAttemptId, sub?.pendingChargeAttemptId].filter(
    (id): id is string => Boolean(id),
  )
  const match = resolveBillingWebhookChargeMatch({
    incomingIds,
    storedIds,
    lastProcessedChargeId: sub?.lastProcessedChargeId,
    pendingChargeId: pend,
  })
  if (sub && match === 'handled') return 'handled'

  if (!sub) {
    await sref.set(
      omitUndefined({
        status: 'active',
        billingPeriod: period,
        amountCop: Math.max(0, Math.round(Number(details.amount ?? 0))),
        lastChargeId: chargeId,
        pendingChargeId: chargeId,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    )
    sub = {
      status: 'active',
      billingPeriod: period,
      currentPeriodStartMs: 0,
      currentPeriodEndMs: 0,
      amountCop: Math.max(0, Math.round(Number(details.amount ?? 0))),
      lastChargeId: chargeId,
      pendingChargeId: chargeId,
    }
  } else if (match === 'apply' && !storedIds.some((id) => incomingIds.includes(id))) {
    console.warn('[mcBillingTryFinalizeFromChargeWebhook] chargeId mismatch; applying via resolved tenant', {
      tenantId,
      chargeId,
      lastChargeId: lastC,
      pendingChargeId: pend,
    })
  } else if (sub.status !== 'active' && sub.status !== 'past_due') {
    return 'retry'
  }

  const chargedCop = Math.max(0, Math.round(Number(details.amount ?? 0)))
  const amountCop = chargedCop > 0 ? chargedCop : sub.amountCop
  const isRenewal = billingChargeIsRenewal(tenant, sub)

  await mcBillingApplyPaidPeriod({
    db,
    tenantId,
    period: sub.billingPeriod ?? period,
    amountCop,
    ...(sub.discountCodeId ? { discountCodeId: sub.discountCodeId } : {}),
    ...(sub.pendingPrepaidMonths ? { prepaidMonths: sub.pendingPrepaidMonths } : {}),
    ...(sub.pendingRenewalAmountCop ? { renewalAmountCop: sub.pendingRenewalAmountCop } : {}),
    chargeId,
    isRenewal,
  })

  console.info('[mcBillingTryFinalizeFromChargeWebhook] finalized', {
    tenantId,
    chargeId,
    isRenewal,
  })
  return 'handled'
}

/** Recupera activaciones atascadas: cargo pagado en OnePay pero tenant aún en Free. */
export async function mcBillingReconcilePendingActivations(
  db: Firestore,
  platformSk: string,
): Promise<number> {
  let recovered = 0
  const subsSnap = await db.collectionGroup(MC_BILLING_SUB_COLLECTION).where('status', '==', 'active').limit(100).get()

  for (const doc of subsSnap.docs) {
    const tenantId = doc.ref.parent.parent?.id
    if (!tenantId) continue

    const sub = doc.data() as McBillingSubFirestore
    const chargeId = sub.pendingChargeId?.trim() || sub.lastChargeId?.trim()
    const alreadyProcessed =
      Boolean(sub.lastProcessedChargeId) &&
      (sub.lastProcessedChargeId === chargeId ||
        sub.lastProcessedChargeId === sub.lastChargeAttemptId ||
        sub.lastProcessedChargeId === sub.pendingChargeAttemptId)
    if (!chargeId || alreadyProcessed) continue

    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
    if (!tenantSnap.exists) continue
    const tenant = tenantSnap.data() as { billingPlan?: string; subscriptionEndsAt?: number }
    if (tenant.billingPlan === 'expert' && typeof tenant.subscriptionEndsAt === 'number' && tenant.subscriptionEndsAt > Date.now()) {
      continue
    }

    const charge = await onepayGetCharge(chargeId, platformSk)
    if (!charge || !chargeStatusPaid(charge.status)) continue

    const result = await mcBillingTryFinalizeFromChargeWebhook({
      db,
      chargeId,
      platformSk,
      chargeMeta: charge.metadata,
      chargeDetails: charge,
    })
    if (result === 'handled') recovered++
  }

  if (recovered > 0) {
    console.info('[mcBillingReconcilePendingActivations] recovered', { recovered })
  }
  return recovered
}

/** Reintenta webhooks de billing que se marcaron procesados sin activar Expert. */
export async function mcBillingReconcileFailedWebhookEvents(
  db: Firestore,
  platformSk: string,
): Promise<number> {
  let recovered = 0
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000
  const snap = await db.collection('mc_onpay_event_log').where('at', '>=', since).limit(200).get()

  for (const doc of snap.docs) {
    const data = doc.data() as { billingCharge?: boolean; event?: string; at?: number }
    if (data.billingCharge === true) continue

    const event = typeof data.event === 'string' ? data.event : ''
    if (!event.startsWith('charge.')) continue
    if (event !== 'charge.succeeded' && event !== 'charge.paid') continue

    const chargeId = doc.id.split('__')[0]?.trim()
    if (!chargeId) continue

    const charge = await onepayGetCharge(chargeId, platformSk)
    if (!charge || !chargeStatusPaid(charge.status)) continue
    if (!isBillingChargeExternalId(charge.external_id)) continue

    const result = await mcBillingTryFinalizeFromChargeWebhook({
      db,
      chargeId,
      platformSk,
      chargeMeta: charge.metadata,
      chargeDetails: charge,
    })
    if (result !== 'handled') continue

    await doc.ref.set({ billingCharge: true, reconciledAt: Date.now() }, { merge: true })
    recovered++
  }

  if (recovered > 0) {
    console.info('[mcBillingReconcileFailedWebhookEvents] recovered', { recovered })
  }
  return recovered
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
        externalId: billingExternalId(tenantId, `renew-${periodEnd}`),
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
          ...(sub.discountCodeId ? { discountCodeId: sub.discountCodeId } : {}),
          chargeId: ch.id,
          isRenewal: true,
        })
        processed++
      } else {
        await doc.ref.set(
          {
            pendingChargeId: ch.id,
            lastChargeId: ch.id,
            ...(ch.attemptId
              ? { pendingChargeAttemptId: ch.attemptId, lastChargeAttemptId: ch.attemptId }
              : {}),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
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
    ...(pricing.discountCodeId ? { discountCodeId: pricing.discountCodeId } : {}),
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
    ...(pricing.discountCodeId ? { discountCodeId: pricing.discountCodeId } : {}),
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

