import { pasarelaMicatalogoFeePerPaymentCop, pasarelaMicatalogoNetPerPaymentCop, pasarelaMicatalogoNetAfterWithdrawalCop, pasarelaMicatalogoWithdrawalFeeCop, } from './pasarelaFees.js';
import { pasarelaSaldoIsReleased, pasarelaSaldoPaidAtMs, pasarelaSaldoReleaseAtMs, } from './pasarelaSaldoHold.js';
const PAYMENTS_PAGE_SIZE = 500;
const RECENT_PAYMENTS_LIMIT = 120;
function mapPaidMicatalogoOrder(docSnap, nowMs) {
    const data = docSnap.data();
    if (data.pagoOnePay !== true || data.onepayViaMicatalogo !== true)
        return null;
    if (data.estado === 'cancelado')
        return null;
    const grossCop = Math.max(0, Math.round(Number(data.totalCop) || 0));
    const feeCop = pasarelaMicatalogoFeePerPaymentCop(grossCop);
    const paidAt = pasarelaSaldoPaidAtMs(data);
    const releaseAt = pasarelaSaldoReleaseAtMs(paidAt);
    return {
        orderId: docSnap.id,
        createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
        paidAt,
        releaseAt,
        isReleased: pasarelaSaldoIsReleased(paidAt, nowMs),
        numeroReferencia: data.numeroReferencia ?? null,
        clienteNombre: data.clienteNombre ?? null,
        onepayPaymentId: data.onepayPaymentId ?? null,
        grossCop,
        feeCop,
        netCop: pasarelaMicatalogoNetPerPaymentCop(grossCop),
    };
}
async function fetchAllPaidMicatalogoPayments(db, tenantId, nowMs) {
    const col = db.collection(`mc_tenants/${tenantId}/ordenes_catalogo`);
    const rows = [];
    let lastDoc;
    for (;;) {
        let q = col
            .where('pagoOnePay', '==', true)
            .where('onepayViaMicatalogo', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(PAYMENTS_PAGE_SIZE);
        if (lastDoc)
            q = q.startAfter(lastDoc);
        const snap = await q.get();
        if (snap.empty)
            break;
        for (const docSnap of snap.docs) {
            const row = mapPaidMicatalogoOrder(docSnap, nowMs);
            if (row)
                rows.push(row);
        }
        lastDoc = snap.docs[snap.docs.length - 1];
        if (snap.size < PAYMENTS_PAGE_SIZE)
            break;
    }
    return rows;
}
async function fetchWithdrawals(db, tenantId) {
    const snap = await db
        .collection(`mc_tenants/${tenantId}/pasarela_retiros`)
        .where('status', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
    return snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
            id: docSnap.id,
            amountCop: Math.max(0, Math.round(Number(d.amountCop) || 0)),
            feeCop: Math.max(0, Math.round(Number(d.feeCop) || 0)),
            netCop: Math.max(0, Math.round(Number(d.netCop) || 0)),
            createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
        };
    });
}
export async function fetchPasarelaMicatalogoLedger(db, tenantId) {
    const nowMs = Date.now();
    const [payments, withdrawals] = await Promise.all([
        fetchAllPaidMicatalogoPayments(db, tenantId, nowMs),
        fetchWithdrawals(db, tenantId),
    ]);
    const grossTotalCop = payments.reduce((s, p) => s + p.grossCop, 0);
    const feeTotalCop = payments.reduce((s, p) => s + p.feeCop, 0);
    const netTotalCop = payments.reduce((s, p) => s + p.netCop, 0);
    const releasedNetCop = payments.filter((p) => p.isReleased).reduce((s, p) => s + p.netCop, 0);
    const pendingPayments = payments.filter((p) => !p.isReleased);
    const pendingNetCop = pendingPayments.reduce((s, p) => s + p.netCop, 0);
    const withdrawnTotalCop = withdrawals.reduce((s, w) => s + w.amountCop, 0);
    const availableNetCop = Math.max(0, releasedNetCop - withdrawnTotalCop);
    return {
        grossTotalCop,
        feeTotalCop,
        netTotalCop,
        releasedNetCop,
        pendingNetCop,
        pendingPaymentCount: pendingPayments.length,
        withdrawnTotalCop,
        availableNetCop,
        paymentCount: payments.length,
        recentPayments: payments.slice(0, RECENT_PAYMENTS_LIMIT),
        withdrawals,
    };
}
export async function recordPasarelaMicatalogoWithdrawal(db, tenantId, input) {
    const amountCop = Math.max(0, Math.round(input.amountCop));
    const feeCop = pasarelaMicatalogoWithdrawalFeeCop(amountCop);
    const netCop = pasarelaMicatalogoNetAfterWithdrawalCop(amountCop);
    await db.collection(`mc_tenants/${tenantId}/pasarela_retiros`).add({
        amountCop,
        feeCop,
        netCop,
        status: 'completed',
        idempotencyNonce: input.idempotencyNonce,
        createdAt: Date.now(),
    });
}
