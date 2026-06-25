import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from './firebaseAdmin.js';
async function assertStoreOwner(uid, tenantId) {
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
    }
    const user = userSnap.data();
    if (user.isSuperAdmin === true)
        return;
    if (user.role === 'pos_vendor' || user.role === 'sales_rep') {
        throw new HttpsError('permission-denied', 'Solo el dueño de la tienda puede gestionar vendedores POS.');
    }
    if (user.tenantId !== tenantId) {
        throw new HttpsError('permission-denied', 'No tenés acceso a esta tienda.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenant = tenantSnap.data();
    if (tenant.ownerUid !== uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño de la tienda puede gestionar vendedores POS.');
    }
}
export const mcCreatePosVendor = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const data = (request.data && typeof request.data === 'object' ? request.data : {});
    const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = typeof data.password === 'string' ? data.password : '';
    const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
    const posSedeId = typeof data.posSedeId === 'string' ? data.posSedeId.trim() : '';
    if (!tenantId)
        throw new HttpsError('invalid-argument', 'Falta la tienda.');
    await assertStoreOwner(uid, tenantId);
    if (!email || !email.includes('@')) {
        throw new HttpsError('invalid-argument', 'Correo inválido.');
    }
    if (password.length < 8) {
        throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 8 caracteres.');
    }
    if (!displayName || displayName.length < 2) {
        throw new HttpsError('invalid-argument', 'Nombre del vendedor requerido.');
    }
    if (!posSedeId) {
        throw new HttpsError('invalid-argument', 'Seleccioná una sede.');
    }
    const sedeSnap = await db.doc(`mc_tenants/${tenantId}/pos_sedes/${posSedeId}`).get();
    if (!sedeSnap.exists) {
        throw new HttpsError('not-found', 'Sede no encontrada.');
    }
    const auth = getAuth();
    let newUid;
    try {
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
            emailVerified: true,
        });
        newUid = userRecord.uid;
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo crear el usuario.';
        if (msg.includes('email-already-exists') || msg.includes('already in use')) {
            throw new HttpsError('already-exists', 'Ya existe una cuenta con ese correo.');
        }
        throw new HttpsError('internal', msg);
    }
    await db.doc(`mc_users/${newUid}`).set({
        email,
        displayName,
        tenantId,
        isSuperAdmin: false,
        role: 'pos_vendor',
        posSedeId,
        active: true,
        createdAt: Date.now(),
    });
    return { ok: true, uid: newUid, email, displayName, posSedeId };
});
export const mcSetPosVendorActive = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const data = (request.data && typeof request.data === 'object' ? request.data : {});
    const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : '';
    const vendorUid = typeof data.vendorUid === 'string' ? data.vendorUid.trim() : '';
    const active = data.active === true;
    const posSedeId = typeof data.posSedeId === 'string' ? data.posSedeId.trim() : undefined;
    if (!tenantId || !vendorUid) {
        throw new HttpsError('invalid-argument', 'Faltan datos.');
    }
    await assertStoreOwner(uid, tenantId);
    const vendorRef = db.doc(`mc_users/${vendorUid}`);
    const vendorSnap = await vendorRef.get();
    if (!vendorSnap.exists) {
        throw new HttpsError('not-found', 'Vendedor no encontrado.');
    }
    const vendor = vendorSnap.data();
    if (vendor.role !== 'pos_vendor' || vendor.tenantId !== tenantId) {
        throw new HttpsError('failed-precondition', 'El usuario no es vendedor POS de esta tienda.');
    }
    const patch = { active, updatedAt: FieldValue.serverTimestamp() };
    if (posSedeId) {
        const sedeSnap = await db.doc(`mc_tenants/${tenantId}/pos_sedes/${posSedeId}`).get();
        if (!sedeSnap.exists)
            throw new HttpsError('not-found', 'Sede no encontrada.');
        patch.posSedeId = posSedeId;
    }
    await vendorRef.update(patch);
    return { ok: true, vendorUid, active, posSedeId: posSedeId ?? vendorSnap.data()?.posSedeId };
});
