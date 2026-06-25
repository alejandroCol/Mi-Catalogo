import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';
import { MC_IMPERSONATE_TENANT_CLAIM } from '../storeImpersonation.js';
import { isMasterBillingPlan } from '../billingPlan.js';
import { isTenantMembershipActive } from '../tenantMembership.js';
export async function resolveLiveTenantForOwner(auth) {
    const uid = auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const impersonateTenantId = typeof auth?.token?.[MC_IMPERSONATE_TENANT_CLAIM] === 'string'
        ? auth.token[MC_IMPERSONATE_TENANT_CLAIM].trim()
        : '';
    if (impersonateTenantId) {
        const userSnap = await db.doc(`mc_users/${uid}`).get();
        if (!userSnap.exists || userSnap.data().isSuperAdmin !== true) {
            throw new HttpsError('permission-denied', 'Solo súper admin puede usar modo soporte.');
        }
        const tenantSnap = await db.doc(`mc_tenants/${impersonateTenantId}`).get();
        if (!tenantSnap.exists)
            throw new HttpsError('not-found', 'Tienda no encontrada.');
        return { tenantId: impersonateTenantId, tenant: tenantSnap.data(), uid };
    }
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists)
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
    const user = userSnap.data();
    const tenantId = user.tenantId?.trim();
    if (!tenantId)
        throw new HttpsError('failed-precondition', 'Sin tienda asociada.');
    if (user.role === 'sales_rep' || user.role === 'pos_vendor') {
        throw new HttpsError('permission-denied', 'Solo el dueño puede administrar lives.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists)
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    return { tenantId, tenant: tenantSnap.data(), uid };
}
export function assertMasterLiveAccess(tenant) {
    if (!isMasterBillingPlan(tenant.billingPlan)) {
        throw new HttpsError('failed-precondition', 'Live shopping requiere plan Master.');
    }
    if (!isTenantMembershipActive(tenant)) {
        throw new HttpsError('failed-precondition', 'Tu suscripción Master no está activa.');
    }
}
/** @deprecated Use assertMasterLiveAccess */
export const assertExpertLiveAccess = assertMasterLiveAccess;
export async function resolvePublicTenantBySlug(slug) {
    const normalized = slug.trim().toLowerCase();
    if (!normalized)
        throw new HttpsError('invalid-argument', 'Slug inválido.');
    const slugSnap = await db.doc(`mc_slugs/${normalized}`).get();
    if (!slugSnap.exists || slugSnap.data()?.active !== true) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenantId = String(slugSnap.data()?.tenantId ?? '');
    if (!tenantId)
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    return { tenantId, slug: normalized };
}
