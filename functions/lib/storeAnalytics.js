import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from './firebaseAdmin.js';
import { isTenantMembershipActive } from './tenantMembership.js';
const VALID_EVENTS = new Set([
    'catalog_visit',
    'product_view',
    'checkout_start',
    'checkout_complete',
]);
export function mcAnalyticsDateKeyBogota(ms = Date.now()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(ms));
}
function sanitizeSessionId(raw) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s || s.length > 128)
        return 'anon';
    return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'anon';
}
function sanitizeProductId(raw) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s || s.length > 128)
        return null;
    return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || null;
}
function sanitizeProductTitle(raw) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    return s.slice(0, 120) || 'Producto';
}
function sanitizeImageUrl(raw) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s || !/^https?:\/\//i.test(s))
        return undefined;
    return s.slice(0, 2048);
}
async function resolveActiveTenantBySlug(slug) {
    const slugSnap = await db.doc(`mc_slugs/${slug}`).get();
    if (!slugSnap.exists || slugSnap.data()?.active !== true) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenantId = String(slugSnap.data()?.tenantId ?? '');
    if (!tenantId) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenant = tenantSnap.data();
    if (!isTenantMembershipActive(tenant)) {
        throw new HttpsError('failed-precondition', 'Tienda inactiva.');
    }
    return { tenantId };
}
export async function recordStoreAnalyticsEvent(opts) {
    const { tenantId } = await resolveActiveTenantBySlug(opts.slug);
    const dateKey = mcAnalyticsDateKeyBogota();
    const dailyRef = db.doc(`mc_tenants/${tenantId}/analytics_daily/${dateKey}`);
    const sessionRef = db.doc(`mc_tenants/${tenantId}/analytics_sessions/${dateKey}_${opts.sessionId}`);
    const productId = opts.event === 'product_view' ? sanitizeProductId(opts.productId) : null;
    const productTitle = sanitizeProductTitle(opts.productTitle);
    const productImageUrl = sanitizeImageUrl(opts.productImageUrl);
    await db.runTransaction(async (tx) => {
        let productDailyRef = null;
        let productAggRef = null;
        if (productId) {
            productDailyRef = db.doc(`mc_tenants/${tenantId}/analytics_product_daily/${dateKey}__${productId}`);
            productAggRef = db.doc(`mc_tenants/${tenantId}/analytics_products/${productId}`);
        }
        const dailySnap = await tx.get(dailyRef);
        const sessionSnap = await tx.get(sessionRef);
        const productDailySnap = productDailyRef ? await tx.get(productDailyRef) : null;
        const productAggSnap = productAggRef ? await tx.get(productAggRef) : null;
        const daily = {
            dateKey,
            visits: Number(dailySnap.data()?.visits ?? 0),
            pageViews: Number(dailySnap.data()?.pageViews ?? 0),
            productViews: Number(dailySnap.data()?.productViews ?? 0),
            checkoutStarts: Number(dailySnap.data()?.checkoutStarts ?? 0),
            checkoutCompletes: Number(dailySnap.data()?.checkoutCompletes ?? 0),
        };
        if (opts.event === 'catalog_visit') {
            daily.pageViews += 1;
            if (!sessionSnap.exists) {
                tx.set(sessionRef, {
                    dateKey,
                    firstSeenAt: FieldValue.serverTimestamp(),
                });
                daily.visits += 1;
            }
        }
        else if (opts.event === 'product_view') {
            daily.productViews += 1;
        }
        else if (opts.event === 'checkout_start') {
            daily.checkoutStarts += 1;
        }
        else if (opts.event === 'checkout_complete') {
            daily.checkoutCompletes += 1;
        }
        tx.set(dailyRef, {
            ...daily,
            updatedAt: Date.now(),
        }, { merge: true });
        if (productId && productDailyRef && productAggRef) {
            const now = Date.now();
            const dailyViews = Number(productDailySnap?.data()?.views ?? 0) + 1;
            tx.set(productDailyRef, {
                dateKey,
                productId,
                productTitle,
                ...(productImageUrl ? { imageUrl: productImageUrl } : {}),
                views: dailyViews,
                updatedAt: now,
            }, { merge: true });
            const aggPatch = {
                productId,
                productTitle,
                viewsTotal: Number(productAggSnap?.data()?.viewsTotal ?? 0) + 1,
                lastViewedAt: now,
            };
            if (productImageUrl)
                aggPatch.imageUrl = productImageUrl;
            tx.set(productAggRef, aggPatch, { merge: true });
        }
    });
}
/** Registra visitas y eventos del catálogo público (sin auth). */
export const mcRecordStoreAnalytics = onCall({ invoker: 'public' }, async (request) => {
    const slug = typeof request.data?.slug === 'string' ? request.data.slug.trim().toLowerCase() : '';
    const event = request.data?.event;
    const sessionId = sanitizeSessionId(request.data?.sessionId);
    const productId = sanitizeProductId(request.data?.productId);
    const productTitle = sanitizeProductTitle(request.data?.productTitle);
    const productImageUrl = sanitizeImageUrl(request.data?.productImageUrl);
    if (!slug) {
        throw new HttpsError('invalid-argument', 'slug requerido.');
    }
    if (!VALID_EVENTS.has(event)) {
        throw new HttpsError('invalid-argument', 'evento inválido.');
    }
    if (event === 'product_view' && !productId) {
        throw new HttpsError('invalid-argument', 'productId requerido para product_view.');
    }
    await recordStoreAnalyticsEvent({
        slug,
        event,
        sessionId,
        productId,
        productTitle,
        productImageUrl,
    });
    return { ok: true };
});
