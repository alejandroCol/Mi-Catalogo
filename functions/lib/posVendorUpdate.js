import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from './firebaseAdmin.js';
async function assertStoreOwner(uid, tenantId) {
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists)
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
    const user = userSnap.data();
    if (user.isSuperAdmin === true)
        return;
    if (user.role === 'pos_vendor' || user.role === 'sales_rep') {
        throw new HttpsError('permission-denied', 'Solo el dueño de la tienda.');
    }
    if (user.tenantId !== tenantId)
        throw new HttpsError('permission-denied', 'Sin acceso.');
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists)
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    const tenant = tenantSnap.data();
    if (tenant.ownerUid !== uid)
        throw new HttpsError('permission-denied', 'Solo el dueño.');
}
export const mcUpdatePosVendor = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const data = (request.data && typeof request.data === 'object' ? request.data : {});
    const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
    const vendorUid = typeof data.vendorUid === 'string' ? data.vendorUid.trim() : '';
    const posSedeId = typeof data.posSedeId === 'string' ? data.posSedeId.trim() : '';
    const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
    if (!tenantId || !vendorUid)
        throw new HttpsError('invalid-argument', 'Faltan datos.');
    await assertStoreOwner(uid, tenantId);
    const vendorRef = db.doc(`mc_users/${vendorUid}`);
    const vendorSnap = await vendorRef.get();
    if (!vendorSnap.exists)
        throw new HttpsError('not-found', 'Vendedor no encontrado.');
    const vendor = vendorSnap.data();
    if (vendor.role !== 'pos_vendor' || vendor.tenantId !== tenantId) {
        throw new HttpsError('failed-precondition', 'No es vendedor POS de esta tienda.');
    }
    const patch = { updatedAt: FieldValue.serverTimestamp() };
    if (posSedeId) {
        const sedeSnap = await db.doc(`mc_tenants/${tenantId}/pos_sedes/${posSedeId}`).get();
        if (!sedeSnap.exists)
            throw new HttpsError('not-found', 'Sede no encontrada.');
        patch.posSedeId = posSedeId;
    }
    if (displayName && displayName.length >= 2) {
        patch.displayName = displayName;
        await getAuth().updateUser(vendorUid, { displayName });
    }
    await vendorRef.update(patch);
    return { ok: true, vendorUid };
});
export const mcResetPosVendorPassword = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const data = (request.data && typeof request.data === 'object' ? request.data : {});
    const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
    const vendorUid = typeof data.vendorUid === 'string' ? data.vendorUid.trim() : '';
    const password = typeof data.password === 'string' ? data.password : '';
    if (!tenantId || !vendorUid || password.length < 8) {
        throw new HttpsError('invalid-argument', 'Datos inválidos.');
    }
    await assertStoreOwner(uid, tenantId);
    const vendorSnap = await db.doc(`mc_users/${vendorUid}`).get();
    if (!vendorSnap.exists)
        throw new HttpsError('not-found', 'Vendedor no encontrado.');
    const vendor = vendorSnap.data();
    if (vendor.role !== 'pos_vendor' || vendor.tenantId !== tenantId) {
        throw new HttpsError('failed-precondition', 'No es vendedor POS.');
    }
    await getAuth().updateUser(vendorUid, { password });
    return { ok: true };
});
