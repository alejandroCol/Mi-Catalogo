import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from './firebaseAdmin.js';
import { restockCatalogOrderInventory } from './catalogInventoryFulfill.js';
import { mcOrderIdFromOnePayMetadata, mcStoreIdFromOnePayMetadata, } from './onepayCatalogHelpers.js';
import { onepayGetPaymentSnapshot, refundOnePayCatalogPayment, } from './onepayRefundApi.js';
import { MC_IMPERSONATE_TENANT_CLAIM } from './storeImpersonation.js';
const PLATFORM_ONEPAY_CRED_REF = db.doc('mc_platform/credentials_onepay');
async function resolveTenantForCatalogCancel(auth) {
    const uid = auth.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const impersonateTenantId = typeof auth.token?.[MC_IMPERSONATE_TENANT_CLAIM] === 'string'
        ? String(auth.token[MC_IMPERSONATE_TENANT_CLAIM]).trim()
        : '';
    if (impersonateTenantId) {
        const userSnap = await db.doc(`mc_users/${uid}`).get();
        if (!userSnap.exists || userSnap.data().isSuperAdmin !== true) {
            throw new HttpsError('permission-denied', 'Solo súper admin puede usar modo soporte.');
        }
        const tenantSnap = await db.doc(`mc_tenants/${impersonateTenantId}`).get();
        if (!tenantSnap.exists)
            throw new HttpsError('not-found', 'Tienda no encontrada.');
        return { tenantId: impersonateTenantId, uid };
    }
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists)
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
    const user = userSnap.data();
    const tenantId = user.tenantId?.trim();
    if (!tenantId)
        throw new HttpsError('failed-precondition', 'Sin tienda asociada.');
    if (user.role === 'sales_rep' || user.role === 'pos_vendor') {
        throw new HttpsError('permission-denied', 'No tenés permiso para cancelar ventas del catálogo.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists)
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    return { tenantId, uid };
}
async function readOnePaySecretForOrder(tenantId, order) {
    const credRef = order.onepayViaMicatalogo === true
        ? PLATFORM_ONEPAY_CRED_REF
        : db.doc(`mc_tenants/${tenantId}/private_onepay/credentials`);
    const snap = await credRef.get();
    const sk = snap.data()?.secretKey;
    if (!sk || typeof sk !== 'string' || sk.trim().length < 8) {
        throw new HttpsError('failed-precondition', order.onepayViaMicatalogo === true
            ? 'Falta la clave de la pasarela Mi Catálogo para devolver el pago.'
            : 'Falta la clave API de OnePay de esta tienda para devolver el pago.');
    }
    return sk.trim();
}
function orderNeedsOnePayAction(order) {
    if (typeof order.onepayRefundedAt === 'number')
        return false;
    const paymentId = typeof order.onepayPaymentId === 'string' ? order.onepayPaymentId.trim() : '';
    return paymentId.length > 0;
}
/** El cobro OnePay tiene que ser el de esta tienda y este pedido (no un id plantado). */
function assertPaymentBoundToOrder(params) {
    const storeId = mcStoreIdFromOnePayMetadata(params.payment.metadata);
    const orderFromMeta = mcOrderIdFromOnePayMetadata(params.payment.metadata);
    const externalId = typeof params.payment.externalId === 'string' ? params.payment.externalId.trim() : '';
    const boundOrderId = orderFromMeta || externalId;
    if (!storeId || storeId !== params.tenantId) {
        throw new HttpsError('permission-denied', 'Ese cobro OnePay no pertenece a esta tienda. No se puede devolver con la pasarela de Mi Catálogo.');
    }
    if (!boundOrderId || boundOrderId !== params.orderId) {
        throw new HttpsError('permission-denied', 'Ese cobro OnePay no corresponde a este pedido.');
    }
    if (params.viaMicatalogo && typeof params.payment.amount === 'number' && typeof params.totalCop === 'number') {
        if (Math.round(params.payment.amount) !== Math.round(params.totalCop)) {
            throw new HttpsError('failed-precondition', 'El monto del cobro OnePay no coincide con el pedido.');
        }
    }
}
export const mcCancelCatalogOrder = onCall({ invoker: 'public' }, async (request) => {
    const { tenantId } = await resolveTenantForCatalogCancel(request.auth ?? {});
    const d = request.data;
    const orderId = typeof d.orderId === 'string' ? d.orderId.trim() : '';
    if (!orderId)
        throw new HttpsError('invalid-argument', 'Falta el pedido.');
    const orderRef = db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderId}`);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists)
        throw new HttpsError('not-found', 'Pedido no encontrado.');
    const order = orderSnap.data();
    let refundKind = null;
    let chargeIds = [];
    if (orderNeedsOnePayAction(order)) {
        const secretKey = await readOnePaySecretForOrder(tenantId, order);
        const paymentId = String(order.onepayPaymentId).trim();
        const payment = await onepayGetPaymentSnapshot(paymentId, secretKey);
        if (!payment) {
            throw new HttpsError('not-found', 'OnePay no encontró el cobro de esta venta.');
        }
        assertPaymentBoundToOrder({
            tenantId,
            orderId,
            totalCop: order.totalCop,
            viaMicatalogo: order.onepayViaMicatalogo === true,
            payment,
        });
        try {
            const refund = await refundOnePayCatalogPayment({ paymentId, secretKey, orderId });
            refundKind = refund.kind;
            chargeIds = refund.chargeIds;
        }
        catch (err) {
            const msg = err instanceof Error && err.message.trim() ? err.message.trim() : 'No se pudo devolver el pago en OnePay.';
            throw new HttpsError('failed-precondition', msg);
        }
    }
    const now = Date.now();
    const patch = {
        estado: 'cancelado',
        updatedAt: now,
    };
    if (refundKind) {
        patch.onepayRefundedAt = now;
        patch.onepayRefundKind = refundKind;
        if (chargeIds.length > 0)
            patch.onepayRefundChargeIds = chargeIds;
    }
    await orderRef.update(patch);
    let restocked = false;
    try {
        restocked = await restockCatalogOrderInventory(db, tenantId, orderId);
    }
    catch (err) {
        console.error('[mcCancelCatalogOrder] restock', err);
    }
    return {
        ok: true,
        orderId,
        estado: 'cancelado',
        refundKind,
        restocked,
    };
});
