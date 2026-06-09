import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from './firebaseAdmin.js';
import { hasActiveExpertForPublish, isCatalogPublishedFlag } from './catalogPublish.js';
import { MC_IMPERSONATE_TENANT_CLAIM } from './storeImpersonation.js';
function isEnvioCotizacionAutomaticaConfigured(tenant) {
    if (tenant.envioCotizarAutomatico !== true)
        return false;
    const dept = tenant.envioOrigenDepartamento?.trim();
    const city = tenant.envioOrigenCiudad?.trim();
    const addr = tenant.envioOrigenDireccion?.trim();
    const phone = tenant.envioOrigenTelefono?.trim();
    const weight = tenant.envioEmpaquePesoKg;
    return Boolean(dept && city && addr && phone && typeof weight === 'number' && weight > 0);
}
function isCheckoutVentasConfigured(tenant, platform) {
    const modo = tenant.checkoutVentasModo;
    if (modo === 'whatsapp') {
        const wa = tenant.whatsappNumero?.replace(/\D/g, '') ?? '';
        return wa.length >= 10 && wa.length <= 15;
    }
    if (modo === 'pasarela')
        return tenant.onepayPaymentsEnabled === true;
    if (modo === 'pasarela_micatalogo')
        return platform?.pasarelaMicatalogoActiva === true;
    return false;
}
function isEnvioCheckoutConfigured(tenant) {
    if (isEnvioCotizacionAutomaticaConfigured(tenant))
        return true;
    if (tenant.envioCotizarAutomatico !== true) {
        return (tenant.envioPorCiudad ?? []).some((x) => Boolean(x?.ciudad?.trim()));
    }
    return false;
}
async function resolveTenantForPublish(auth) {
    const uid = auth.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const impersonateTenantId = typeof auth.token?.[MC_IMPERSONATE_TENANT_CLAIM] === 'string'
        ? auth.token[MC_IMPERSONATE_TENANT_CLAIM].trim()
        : '';
    if (impersonateTenantId) {
        const userSnap = await db.doc(`mc_users/${uid}`).get();
        if (!userSnap.exists)
            throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
        if (userSnap.data().isSuperAdmin !== true) {
            throw new HttpsError('permission-denied', 'Solo súper admin puede usar modo soporte.');
        }
        const tenantSnap = await db.doc(`mc_tenants/${impersonateTenantId}`).get();
        if (!tenantSnap.exists)
            throw new HttpsError('not-found', 'Tienda no encontrada.');
        return { tenantId: impersonateTenantId, tenant: tenantSnap.data() };
    }
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists)
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
    const tenantId = userSnap.data().tenantId;
    if (!tenantId)
        throw new HttpsError('failed-precondition', 'Sin tienda asociada.');
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists)
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    const tenant = tenantSnap.data();
    if (tenant.ownerUid !== uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño puede publicar la tienda.');
    }
    return { tenantId, tenant };
}
async function loadPlatformSettings() {
    const snap = await db.doc('mc_platform/settings').get();
    return snap.exists ? snap.data() : {};
}
function assertCanPublish(tenant, platform) {
    if (isCatalogPublishedFlag(tenant)) {
        throw new HttpsError('failed-precondition', 'Tu tienda ya está publicada.');
    }
    if (!hasActiveExpertForPublish(tenant)) {
        throw new HttpsError('failed-precondition', 'Activá el plan Expert para publicar tu tienda.');
    }
    if (!isCheckoutVentasConfigured(tenant, platform)) {
        throw new HttpsError('failed-precondition', 'Configurá cómo cobrás antes de publicar.');
    }
    if (!isEnvioCheckoutConfigured(tenant)) {
        throw new HttpsError('failed-precondition', 'Configurá el envío antes de publicar.');
    }
}
/** Publica el catálogo (requiere Expert activo + checkout + envío). */
export const mcCatalogPublish = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId, tenant } = await resolveTenantForPublish(request.auth ?? {});
    const platform = await loadPlatformSettings();
    assertCanPublish(tenant, platform);
    const now = Date.now();
    await db.doc(`mc_tenants/${tenantId}`).set({
        catalogPublished: true,
        catalogPublishedAt: now,
        updatedAt: now,
    }, { merge: true });
    return { ok: true, publishedAt: now };
});
/** Despublica el catálogo (solo dueño; no aplica a tiendas grandfathered). */
export const mcCatalogUnpublish = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId, tenant } = await resolveTenantForPublish(request.auth ?? {});
    if (tenant.catalogPublishGrandfathered === true) {
        throw new HttpsError('failed-precondition', 'Esta tienda no puede despublicarse.');
    }
    if (!isCatalogPublishedFlag(tenant)) {
        return { ok: true, alreadyUnpublished: true };
    }
    const now = Date.now();
    await db.doc(`mc_tenants/${tenantId}`).set({
        catalogPublished: false,
        updatedAt: now,
    }, { merge: true });
    return { ok: true };
});
/** Backfill: marca tiendas con slug activo como grandfathered + publicadas. Solo súper admin. */
export const mcBackfillCatalogPublishGrandfather = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists || userSnap.data().isSuperAdmin !== true) {
        throw new HttpsError('permission-denied', 'Solo súper admin.');
    }
    const slugsSnap = await db.collection('mc_slugs').where('active', '==', true).get();
    const now = Date.now();
    let updated = 0;
    const batchSize = 400;
    let batch = db.batch();
    let inBatch = 0;
    for (const slugDoc of slugsSnap.docs) {
        const tenantId = slugDoc.data().tenantId;
        if (!tenantId)
            continue;
        const tenantRef = db.doc(`mc_tenants/${tenantId}`);
        batch.set(tenantRef, {
            catalogPublishGrandfathered: true,
            catalogPublished: true,
            catalogPublishedAt: now,
            updatedAt: now,
        }, { merge: true });
        updated++;
        inBatch++;
        if (inBatch >= batchSize) {
            await batch.commit();
            batch = db.batch();
            inBatch = 0;
        }
    }
    if (inBatch > 0)
        await batch.commit();
    return { ok: true, updated };
});
