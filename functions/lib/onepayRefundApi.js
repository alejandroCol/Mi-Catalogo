/**
 * Adaptador OnePay para devoluciones de cobros de catálogo.
 * @see https://docs.onepay.la/client/charges/refund
 * @see https://docs.onepay.la/client/payments/intents
 * @see https://docs.onepay.la/client/payments/delete
 */
const ONEPAY_PAYMENTS_API = 'https://api.onepay.la/v1/payments';
const ONEPAY_CHARGES_API = 'https://api.onepay.la/v1/charges';
const PAID_PAYMENT_STATUSES = new Set([
    'approved',
    'succeeded',
    'completed',
    'paid',
    'partially_paid',
]);
const REFUNDED_PAYMENT_STATUSES = new Set(['refunded']);
const UNPAID_PAYMENT_STATUSES = new Set([
    'pending',
    'in_progress',
    'expired',
    'declined',
    'cancelled',
    'canceled',
]);
const REFUNDABLE_INTENT_STATUSES = new Set([
    'succeeded',
    'approved',
    'paid',
    'completed',
    'captured',
]);
export function normalizeOnePayStatus(status) {
    return String(status || '').trim().toLowerCase();
}
export function isOnePayPaymentPaid(status) {
    return PAID_PAYMENT_STATUSES.has(normalizeOnePayStatus(status));
}
export function isOnePayPaymentRefunded(status) {
    return REFUNDED_PAYMENT_STATUSES.has(normalizeOnePayStatus(status));
}
export function isOnePayPaymentUnpaid(status) {
    return UNPAID_PAYMENT_STATUSES.has(normalizeOnePayStatus(status));
}
export function isRefundableIntentStatus(status) {
    return REFUNDABLE_INTENT_STATUSES.has(normalizeOnePayStatus(status));
}
export function collectRefundableChargeIds(intents, extraIds) {
    const ids = new Set();
    for (const intent of intents) {
        if (!intent.id || !isRefundableIntentStatus(intent.status))
            continue;
        ids.add(intent.id);
    }
    for (const id of extraIds) {
        if (id)
            ids.add(id);
    }
    return [...ids];
}
function authHeaders(secretKey, extra) {
    return { Authorization: `Bearer ${secretKey}`, ...extra };
}
async function readJson(res) {
    const text = await res.text();
    if (!text.trim())
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return { message: text.slice(0, 400) };
    }
}
function errorMessage(body, fallback) {
    if (!body || typeof body !== 'object')
        return fallback;
    const msg = body.message;
    return typeof msg === 'string' && msg.trim() ? msg.trim() : fallback;
}
function errorCodeName(body) {
    if (!body || typeof body !== 'object')
        return '';
    const name = body.code_name;
    return typeof name === 'string' ? name.trim().toLowerCase() : '';
}
export async function onepayGetPaymentSnapshot(paymentId, secretKey) {
    let res;
    try {
        res = await fetch(`${ONEPAY_PAYMENTS_API}/${encodeURIComponent(paymentId)}`, {
            method: 'GET',
            headers: authHeaders(secretKey),
        });
    }
    catch {
        throw new Error('No se pudo contactar a OnePay.');
    }
    if (res.status === 404)
        return null;
    const body = await readJson(res);
    if (!res.ok) {
        throw new Error(errorMessage(body, `OnePay no devolvió el cobro (${res.status}).`));
    }
    const rec = body && typeof body === 'object' ? body : {};
    const id = typeof rec.id === 'string' ? rec.id : paymentId;
    const status = typeof rec.status === 'string' ? rec.status : '';
    const partial = rec.partial_payment && typeof rec.partial_payment === 'object'
        ? rec.partial_payment
        : null;
    const partialChargeIds = [];
    if (Array.isArray(partial?.charges)) {
        for (const row of partial.charges) {
            if (row && typeof row === 'object' && typeof row.id === 'string') {
                partialChargeIds.push(row.id);
            }
        }
    }
    return {
        id,
        status,
        amount: typeof rec.amount === 'number' ? rec.amount : undefined,
        isTest: rec.is_test === true,
        metadata: rec.metadata,
        externalId: typeof rec.external_id === 'string'
            ? rec.external_id
            : typeof rec.externalId === 'string'
                ? rec.externalId
                : '',
        partialChargeIds,
    };
}
export async function onepayListPaymentIntents(paymentId, secretKey) {
    let res;
    try {
        res = await fetch(`${ONEPAY_PAYMENTS_API}/${encodeURIComponent(paymentId)}/intents`, {
            method: 'GET',
            headers: authHeaders(secretKey),
        });
    }
    catch {
        throw new Error('No se pudo consultar los intentos de pago en OnePay.');
    }
    if (res.status === 404)
        return [];
    const body = await readJson(res);
    if (!res.ok) {
        throw new Error(errorMessage(body, `OnePay no listó los intentos (${res.status}).`));
    }
    const rows = Array.isArray(body)
        ? body
        : body && typeof body === 'object' && Array.isArray(body.data)
            ? (body.data)
            : [];
    const out = [];
    for (const row of rows) {
        if (!row || typeof row !== 'object')
            continue;
        const id = row.id;
        const status = row.status;
        if (typeof id !== 'string' || !id)
            continue;
        out.push({ id, status: typeof status === 'string' ? status : '' });
    }
    return out;
}
export async function onepayDeleteUnpaidPayment(paymentId, secretKey) {
    let res;
    try {
        res = await fetch(`${ONEPAY_PAYMENTS_API}/${encodeURIComponent(paymentId)}`, {
            method: 'DELETE',
            headers: authHeaders(secretKey),
        });
    }
    catch {
        throw new Error('No se pudo cancelar el cobro pendiente en OnePay.');
    }
    if (res.status === 204 || res.status === 200 || res.status === 404)
        return;
    const body = await readJson(res);
    const code = errorCodeName(body);
    if (code === 'payment_cancelled' || code === 'payment_already_paid')
        return;
    throw new Error(errorMessage(body, `OnePay no canceló el cobro (${res.status}).`));
}
export async function onepayRefundCharge(chargeId, secretKey, idempotencyKey) {
    let res;
    try {
        res = await fetch(`${ONEPAY_CHARGES_API}/${encodeURIComponent(chargeId)}/refund`, {
            method: 'POST',
            headers: authHeaders(secretKey, { 'x-idempotency': idempotencyKey }),
        });
    }
    catch {
        throw new Error('No se pudo contactar a OnePay para devolver el dinero.');
    }
    if (res.status === 204 || res.status === 200)
        return 'refunded';
    const body = await readJson(res);
    const code = errorCodeName(body);
    if (code === 'charge_refunded')
        return 'already_refunded';
    if (code === 'charge_is_test')
        return 'test_skipped';
    if (code === 'charge_is_not_paid')
        return 'not_paid';
    if (res.status === 404) {
        throw new Error('OnePay no encontró el cargo para reembolsar.');
    }
    throw new Error(errorMessage(body, `OnePay no pudo reembolsar el cargo (${res.status}).`));
}
export async function refundOnePayCatalogPayment(params) {
    const payment = await onepayGetPaymentSnapshot(params.paymentId, params.secretKey);
    if (!payment) {
        throw new Error('OnePay no encontró el cobro de esta venta.');
    }
    if (isOnePayPaymentRefunded(payment.status)) {
        return { kind: 'already_refunded', chargeIds: [] };
    }
    if (isOnePayPaymentUnpaid(payment.status)) {
        await onepayDeleteUnpaidPayment(payment.id, params.secretKey);
        return { kind: 'unpaid_cancelled', chargeIds: [] };
    }
    if (!isOnePayPaymentPaid(payment.status)) {
        throw new Error(`El cobro OnePay está en estado «${payment.status || 'desconocido'}» y no se puede devolver.`);
    }
    const intents = await onepayListPaymentIntents(payment.id, params.secretKey);
    const chargeIds = collectRefundableChargeIds(intents, payment.partialChargeIds);
    const idsToTry = chargeIds.length > 0 ? chargeIds : [payment.id];
    const refundedIds = [];
    let sawTestSkip = false;
    let sawNotPaid = 0;
    for (const chargeId of idsToTry) {
        const outcome = await onepayRefundCharge(chargeId, params.secretKey, `mc-ord-refund-${params.orderId}-${chargeId}`.slice(0, 120));
        if (outcome === 'refunded' || outcome === 'already_refunded') {
            refundedIds.push(chargeId);
            continue;
        }
        if (outcome === 'test_skipped') {
            sawTestSkip = true;
            continue;
        }
        if (outcome === 'not_paid') {
            sawNotPaid += 1;
        }
    }
    if (refundedIds.length > 0) {
        return { kind: 'full_refund', chargeIds: refundedIds };
    }
    if (sawTestSkip) {
        return { kind: 'test_skipped', chargeIds: [] };
    }
    if (sawNotPaid === idsToTry.length) {
        await onepayDeleteUnpaidPayment(payment.id, params.secretKey);
        return { kind: 'unpaid_cancelled', chargeIds: [] };
    }
    throw new Error('No encontramos un cargo pagado en OnePay para devolver el dinero de esta venta.');
}
