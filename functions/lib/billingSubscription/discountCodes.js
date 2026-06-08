export function normalizeDiscountCode(raw) {
    return raw.normalize('NFC').trim().toUpperCase().replace(/\s+/g, '');
}
function discountRequiresPaymentMethod(d) {
    if (d.requiresPaymentMethod === false)
        return false;
    if (typeof d.freeMonths === 'number' && d.freeMonths > 0)
        return true;
    if (d.requiresPaymentMethod === true)
        return true;
    return false;
}
export async function resolveBillingDiscountCode(db, codeRaw, period, basePriceCop, tenantId) {
    const norm = normalizeDiscountCode(codeRaw);
    if (!norm)
        return { ok: false, error: 'Ingresá un código.' };
    const snap = await db
        .collection('mc_billing_discount_codes')
        .where('codeNormalized', '==', norm)
        .limit(5)
        .get();
    const now = Date.now();
    for (const doc of snap.docs) {
        const d = doc.data();
        if (d.active !== true)
            continue;
        if (d.billingPeriod && d.billingPeriod !== period)
            continue;
        if (typeof d.validFromMs === 'number' && now < d.validFromMs)
            continue;
        if (typeof d.validUntilMs === 'number' && now > d.validUntilMs)
            continue;
        const max = typeof d.maxRedemptions === 'number' ? d.maxRedemptions : null;
        const used = typeof d.redemptionCount === 'number' ? d.redemptionCount : 0;
        if (max != null && used >= max)
            continue;
        if (d.restrictedTenantId?.trim()) {
            if (!tenantId || d.restrictedTenantId.trim() !== tenantId) {
                continue;
            }
        }
        let finalPriceCop = Math.round(Number(d.priceCop ?? basePriceCop));
        if (!Number.isFinite(finalPriceCop) || finalPriceCop < 0) {
            finalPriceCop = basePriceCop;
        }
        if (finalPriceCop > basePriceCop)
            finalPriceCop = basePriceCop;
        const freeMonths = typeof d.freeMonths === 'number' && d.freeMonths > 0
            ? Math.min(3, Math.max(1, Math.round(d.freeMonths)))
            : undefined;
        return {
            ok: true,
            codeId: doc.id,
            finalPriceCop,
            basePriceCop,
            freeMonths,
            freeTrialDays: d.freeTrialDays,
            requiresPaymentMethod: discountRequiresPaymentMethod(d),
            label: d.label,
        };
    }
    return { ok: false, error: 'Código no válido o vencido.' };
}
