import type { Firestore } from 'firebase-admin/firestore'

export type McDiscountCodeDoc = {
  code: string
  codeNormalized: string
  active: boolean
  /** Precio final en COP tras descuento (0 = gratis). */
  priceCop: number
  /** Si aplica solo a monthly | yearly; omitido = ambos. */
  billingPeriod?: 'monthly' | 'yearly'
  /** Duración del beneficio en días cuando priceCop es 0 (trial comercial). */
  freeTrialDays?: number
  maxRedemptions?: number
  redemptionCount?: number
  validFromMs?: number
  validUntilMs?: number
  label?: string
}

export function normalizeDiscountCode(raw: string): string {
  return raw.normalize('NFC').trim().toUpperCase().replace(/\s+/g, '')
}

export async function resolveBillingDiscountCode(
  db: Firestore,
  codeRaw: string,
  period: 'monthly' | 'yearly',
  basePriceCop: number,
): Promise<
  | {
      ok: true
      codeId: string
      finalPriceCop: number
      freeTrialDays?: number
      label?: string
    }
  | { ok: false; error: string }
> {
  const norm = normalizeDiscountCode(codeRaw)
  if (!norm) return { ok: false, error: 'Ingresá un código.' }

  const snap = await db
    .collection('mc_billing_discount_codes')
    .where('codeNormalized', '==', norm)
    .limit(5)
    .get()

  const now = Date.now()
  for (const doc of snap.docs) {
    const d = doc.data() as McDiscountCodeDoc
    if (d.active !== true) continue
    if (d.billingPeriod && d.billingPeriod !== period) continue
    if (typeof d.validFromMs === 'number' && now < d.validFromMs) continue
    if (typeof d.validUntilMs === 'number' && now > d.validUntilMs) continue
    const max = typeof d.maxRedemptions === 'number' ? d.maxRedemptions : null
    const used = typeof d.redemptionCount === 'number' ? d.redemptionCount : 0
    if (max != null && used >= max) continue

    let finalPriceCop = Math.round(Number(d.priceCop ?? basePriceCop))
    if (!Number.isFinite(finalPriceCop) || finalPriceCop < 0) {
      finalPriceCop = basePriceCop
    }
    if (finalPriceCop > basePriceCop) finalPriceCop = basePriceCop

    return {
      ok: true,
      codeId: doc.id,
      finalPriceCop,
      freeTrialDays: d.freeTrialDays,
      label: d.label,
    }
  }
  return { ok: false, error: 'Código no válido o vencido.' }
}
