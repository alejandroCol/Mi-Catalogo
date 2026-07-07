import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin.js';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { accountReadyForDebit, onepayCreateNequiAccount, onepayCreateTokenizedCard, onepayGetAccount, onepayListAccounts, onepayListCards, onepayListNequiBanks, onepayValidateAccount, } from './onepayBillingApi.js';
import { mcBillingActivateWithCharge, mcBillingCancelAutoRenew, mcBillingEnsureCustomerV2, mcBillingListPaymentHistory, mcBillingProcessGraceExpiries, mcBillingReconcilePendingActivations, mcBillingReconcileFailedWebhookEvents, mcBillingResolvePrice, mcBillingRunDueRenewals, } from './service.js';
import { MC_BILLING_SUB_COLLECTION, MC_BILLING_SUB_DOC } from './constants.js';
const DEFAULT_CAPTURE_ROUTE_ID = 'ggMoeO2K3G';
async function resolveTenantOwner(uid) {
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists)
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
    const tenantId = userSnap.data().tenantId;
    if (!tenantId)
        throw new HttpsError('failed-precondition', 'Sin tienda asociada.');
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists)
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    const ownerUid = tenantSnap.data().ownerUid;
    if (ownerUid !== uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño puede gestionar el plan.');
    }
    return { tenantId };
}
async function resolveNequiAccountReady(params) {
    let acc = await onepayGetAccount(params.accountId, params.secretKey);
    if (!acc) {
        const accounts = await onepayListAccounts(params.customerId, params.secretKey);
        acc = accounts.find((a) => a.id === params.accountId) ?? null;
    }
    return { acc, ready: acc ? accountReadyForDebit(acc) : false };
}
async function pinNequiIfReady(tenantId, accountId, ready) {
    if (!ready)
        return;
    await db.doc(`mc_tenants/${tenantId}`).set({
        billingPinnedAccountId: accountId,
        billingDebitMethod: 'nequi',
    }, { merge: true });
}
async function getPlatformBillingCreds() {
    const pc = await db.doc('mc_platform/credentials_onepay').get();
    const cred = pc.data();
    const sk = cred?.secretKey?.trim();
    if (!sk) {
        throw new HttpsError('failed-precondition', 'Configurá la pasarela Mi Catálogo en súper admin.');
    }
    const settings = (await db.doc('mc_platform/settings').get()).data();
    if (settings?.pasarelaMicatalogoActiva !== true) {
        throw new HttpsError('failed-precondition', 'Los pagos de planes no están habilitados.');
    }
    const publicKey = cred?.publicKey?.trim() ?? '';
    if (!publicKey) {
        throw new HttpsError('failed-precondition', 'Falta la clave pública OnePay (pk_) en la pasarela.');
    }
    const captureRouteId = settings?.onepayCaptureRouteId?.trim() ||
        process.env.MC_ONEPAY_CAPTURE_ROUTE_ID?.trim() ||
        DEFAULT_CAPTURE_ROUTE_ID;
    return { secretKey: sk, publicKey, captureRouteId };
}
function parsePayer(data, fallbackEmail, fallbackName) {
    const firstFromForm = typeof data.firstName === 'string' && data.firstName.trim() ? data.firstName.trim() : '';
    const lastFromForm = typeof data.lastName === 'string' && data.lastName.trim() ? data.lastName.trim() : '';
    const { first, last } = (() => {
        if (firstFromForm && lastFromForm) {
            return { first: firstFromForm, last: lastFromForm };
        }
        const raw = firstFromForm ||
            (typeof data.displayName === 'string' && data.displayName.trim()) ||
            fallbackName;
        const p = raw.trim().split(/\s+/);
        if (lastFromForm)
            return { first: p[0] || 'Titular', last: lastFromForm };
        if (p.length <= 1)
            return { first: p[0] || 'Titular', last: 'Mi Catalogo' };
        return { first: p[0], last: p.slice(1).join(' ') };
    })();
    const docType = typeof data.documentType === 'string' && data.documentType.trim()
        ? data.documentType.trim().toUpperCase()
        : 'CC';
    const docNum = typeof data.documentNumber === 'string' && data.documentNumber.trim()
        ? data.documentNumber.trim()
        : '';
    if (!docNum || docNum.length < 5) {
        throw new HttpsError('invalid-argument', 'Ingresá tu número de documento.');
    }
    const phone = typeof data.phone === 'string' && data.phone.replace(/\D/g, '').length >= 10
        ? data.phone.replace(/\D/g, '')
        : '';
    if (!phone) {
        throw new HttpsError('invalid-argument', 'Ingresá tu celular (mínimo 10 dígitos).');
    }
    const email = typeof data.email === 'string' && data.email.includes('@') ? data.email.trim() : fallbackEmail;
    if (!email.includes('@')) {
        throw new HttpsError('invalid-argument', 'Email inválido.');
    }
    return {
        firstName: first.slice(0, 80),
        lastName: last.slice(0, 80),
        email,
        phone,
        documentType: docType.slice(0, 12),
        documentNumber: docNum.slice(0, 32),
    };
}
export const mcBillingGetSdkContext = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    await resolveTenantOwner(uid);
    const { publicKey, captureRouteId } = await getPlatformBillingCreds();
    return {
        publicKey,
        captureRouteId,
        isLive: publicKey.startsWith('pk_live'),
    };
});
export const mcBillingValidateDiscountCode = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const data = request.data;
    const period = data.period === 'yearly' ? 'yearly' : 'monthly';
    const code = typeof data.code === 'string' ? data.code.trim() : '';
    if (!code)
        throw new HttpsError('invalid-argument', 'Ingresá un código.');
    try {
        const { tenantId } = await resolveTenantOwner(uid);
        const pricing = await mcBillingResolvePrice(db, period, code, tenantId);
        return {
            ok: true,
            basePriceCop: pricing.basePriceCop,
            finalPriceCop: pricing.finalPriceCop,
            freeMonths: pricing.freeMonths,
            freeTrialDays: pricing.freeTrialDays,
            requiresPaymentMethod: pricing.requiresPaymentMethod ?? false,
        };
    }
    catch (e) {
        throw new HttpsError('failed-precondition', e instanceof Error ? e.message : 'Código inválido.');
    }
});
export const mcBillingEnsureCustomer = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    try {
        const { tenantId } = await resolveTenantOwner(uid);
        const data = (request.data && typeof request.data === 'object' ? request.data : {});
        const userSnap = await db.doc(`mc_users/${uid}`).get();
        const u = userSnap.data();
        const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
        const nombreTienda = tenantSnap.data().nombreTienda ?? 'Tienda';
        const payer = parsePayer(data, u.email ?? '', u.displayName ?? nombreTienda);
        const { secretKey } = await getPlatformBillingCreds();
        const customerId = await mcBillingEnsureCustomerV2(db, tenantId, payer, secretKey);
        return { ok: true, customerId };
    }
    catch (e) {
        if (e instanceof HttpsError)
            throw e;
        const msg = e instanceof Error ? e.message : 'No se pudo crear el cliente de pagos.';
        console.error('[mcBillingEnsureCustomer]', msg, e);
        throw new HttpsError('failed-precondition', msg);
    }
});
export const mcBillingAddCard = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    const cardToken = typeof request.data?.cardToken === 'string'
        ? request.data.cardToken.trim()
        : '';
    if (!cardToken)
        throw new HttpsError('invalid-argument', 'Falta el token de tarjeta.');
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    const customerId = tenantSnap.data().billingOnePayCustomerId?.trim();
    if (!customerId) {
        throw new HttpsError('failed-precondition', 'Completá primero tus datos de facturación.');
    }
    const { secretKey } = await getPlatformBillingCreds();
    const card = await onepayCreateTokenizedCard({ secretKey, customerId, cardToken });
    await db.doc(`mc_tenants/${tenantId}`).set({
        billingPinnedCardId: card.id,
        billingPinnedAccountId: FieldValue.delete(),
        billingDebitMethod: 'card',
    }, { merge: true });
    return { ok: true, cardId: card.id, brand: card.brand, lastFour: card.last_four };
});
export const mcBillingListNequiBanks = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    await resolveTenantOwner(uid);
    const { secretKey } = await getPlatformBillingCreds();
    const banks = await onepayListNequiBanks(secretKey);
    if (banks.length === 0) {
        throw new HttpsError('failed-precondition', 'No se encontró Nequi en el catálogo OnePay.');
    }
    return { banks };
});
export const mcBillingAddNequi = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    const data = request.data;
    const phone = typeof data.phone === 'string' ? data.phone.replace(/\D/g, '') : '';
    const bankId = typeof data.bankId === 'string' ? data.bankId.trim() : '';
    if (!phone || phone.length < 10) {
        throw new HttpsError('invalid-argument', 'Ingresá tu número de celular Nequi.');
    }
    if (!bankId)
        throw new HttpsError('invalid-argument', 'Seleccioná Nequi.');
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    const customerId = tenantSnap.data().billingOnePayCustomerId?.trim();
    if (!customerId) {
        throw new HttpsError('failed-precondition', 'Completá primero tus datos de facturación.');
    }
    const { secretKey } = await getPlatformBillingCreds();
    const acct = await onepayCreateNequiAccount({
        secretKey,
        customerId,
        accountNumber: phone,
        bankId,
    });
    await db.doc(`mc_tenants/${tenantId}`).set({
        billingPinnedAccountId: acct.id,
        billingPinnedCardId: FieldValue.delete(),
        billingDebitMethod: 'nequi',
    }, { merge: true });
    const st = (acct.status ?? '').toUpperCase();
    const needsWait = st === 'PENDING' ||
        st === 'VALIDATING' ||
        st === 'WAITING' ||
        acct.authorization !== true;
    return {
        ok: true,
        accountId: acct.id,
        status: acct.status,
        awaitingApproval: needsWait,
    };
});
export const mcBillingValidateNequi = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    const accountId = typeof request.data?.accountId === 'string'
        ? request.data.accountId.trim()
        : '';
    const otp = typeof request.data?.otp === 'string'
        ? request.data.otp.trim()
        : undefined;
    if (!accountId)
        throw new HttpsError('invalid-argument', 'accountId requerido.');
    const { secretKey } = await getPlatformBillingCreds();
    let validateStatus;
    let validateMessage;
    if (otp) {
        try {
            const out = await onepayValidateAccount(accountId, secretKey, otp);
            validateStatus = out.status;
            validateMessage = out.message;
        }
        catch (e) {
            validateMessage = e instanceof Error ? e.message : 'No se pudo validar Nequi';
        }
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    const customerId = tenantSnap.data().billingOnePayCustomerId?.trim();
    if (!customerId) {
        return {
            ok: true,
            ready: false,
            status: validateStatus,
            message: validateMessage ?? 'Completá primero tus datos de facturación.',
        };
    }
    const { acc, ready } = await resolveNequiAccountReady({ customerId, accountId, secretKey });
    await pinNequiIfReady(tenantId, accountId, ready);
    return {
        ok: true,
        ready,
        status: acc?.status ?? validateStatus,
        authorization: acc?.authorization,
        message: validateMessage,
    };
});
/** Consulta estado Nequi sin forzar validate (evita 500 si ya fue aprobado). */
export const mcBillingCheckNequiReady = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    const accountId = typeof request.data?.accountId === 'string'
        ? request.data.accountId.trim()
        : '';
    if (!accountId)
        throw new HttpsError('invalid-argument', 'accountId requerido.');
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    const customerId = tenantSnap.data().billingOnePayCustomerId?.trim();
    if (!customerId) {
        throw new HttpsError('failed-precondition', 'Completá primero tus datos de facturación.');
    }
    const { secretKey } = await getPlatformBillingCreds();
    const { acc, ready } = await resolveNequiAccountReady({ customerId, accountId, secretKey });
    await pinNequiIfReady(tenantId, accountId, ready);
    return {
        ok: true,
        ready,
        status: acc?.status,
        authorization: acc?.authorization,
    };
});
export const mcBillingCompleteActivation = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    const data = request.data;
    const period = data.period === 'yearly' ? 'yearly' : 'monthly';
    const methodRaw = data.method === 'nequi' ? 'nequi' : 'card';
    const method = methodRaw;
    const cardId = typeof data.cardId === 'string' ? data.cardId.trim() : '';
    const accountId = typeof data.accountId === 'string' ? data.accountId.trim() : '';
    const discountCode = typeof data.discountCode === 'string' ? data.discountCode.trim() : '';
    const pricing = await mcBillingResolvePrice(db, period, discountCode || undefined, tenantId);
    const requiresPaymentMethod = pricing.finalPriceCop > 0 || pricing.requiresPaymentMethod === true;
    if (requiresPaymentMethod && method === 'card' && !cardId) {
        throw new HttpsError('invalid-argument', 'Registrá tu tarjeta antes de activar.');
    }
    if (requiresPaymentMethod && method === 'nequi' && !accountId) {
        throw new HttpsError('invalid-argument', 'Vinculá Nequi antes de activar.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    const nombreTienda = tenantSnap.data().nombreTienda ?? 'Tienda';
    const { secretKey } = await getPlatformBillingCreds();
    if (method === 'nequi' && accountId) {
        const customerId = tenantSnap.data().billingOnePayCustomerId?.trim();
        if (customerId) {
            const accounts = await onepayListAccounts(customerId, secretKey);
            const acc = accounts.find((a) => a.id === accountId);
            if (acc && !accountReadyForDebit(acc)) {
                throw new HttpsError('failed-precondition', 'Tu Nequi aún no está listo. Aprobá la vinculación en la app Nequi e intentá de nuevo.');
            }
        }
    }
    try {
        const result = await mcBillingActivateWithCharge({
            db,
            tenantId,
            period,
            method,
            cardId: method === 'card' ? cardId : undefined,
            accountId: method === 'nequi' ? accountId : undefined,
            discountCodeRaw: discountCode || undefined,
            platformSk: secretKey,
            nombreTienda,
        });
        return {
            ok: true,
            chargeId: result.chargeId,
            status: result.status,
            pending: result.pending,
            message: result.message,
        };
    }
    catch (e) {
        if (e instanceof HttpsError)
            throw e;
        console.error('[mcBillingCompleteActivation]', e);
        throw new HttpsError('failed-precondition', e instanceof Error ? e.message : 'No se pudo activar el plan.');
    }
});
export const mcBillingPaymentMethods = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    const customerId = tenantSnap.data().billingOnePayCustomerId?.trim();
    if (!customerId)
        return { cards: [], nequiAccounts: [] };
    const { secretKey } = await getPlatformBillingCreds();
    const [cards, accounts] = await Promise.all([
        onepayListCards(customerId, secretKey),
        onepayListAccounts(customerId, secretKey),
    ]);
    const nequiAccounts = accounts.filter((a) => (a.subtype ?? '').toUpperCase() === 'ELECTRONIC_DEPOSIT');
    return { cards, nequiAccounts };
});
export const mcBillingGetSubscriptionState = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists)
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    const tenant = tenantSnap.data();
    const subSnap = await db.doc(`mc_tenants/${tenantId}/${MC_BILLING_SUB_COLLECTION}/${MC_BILLING_SUB_DOC}`).get();
    const sub = subSnap.exists ? subSnap.data() : null;
    const autoRenewEnabled = tenant.billingAutoRenewEnabled !== false && sub?.autoRenewEnabled !== false;
    return {
        subscriptionEndsAt: tenant.subscriptionEndsAt ?? 0,
        billingPeriod: sub?.billingPeriod ?? 'monthly',
        amountCop: sub?.amountCop ?? 0,
        autoRenewEnabled,
        billingSubStatus: tenant.billingSubStatus ?? 'none',
        pinnedCardId: tenant.billingPinnedCardId ?? null,
        pinnedAccountId: tenant.billingPinnedAccountId ?? null,
        debitMethod: tenant.billingDebitMethod ?? null,
    };
});
export const mcBillingListPaymentHistoryCallable = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    const payments = await mcBillingListPaymentHistory(db, tenantId);
    return { payments };
});
export const mcBillingCancelAutoRenewCallable = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    try {
        await mcBillingCancelAutoRenew(db, tenantId);
        return {
            ok: true,
            message: 'Débito automático cancelado. Tu plan sigue vigente hasta la fecha de vencimiento.',
        };
    }
    catch (e) {
        throw new HttpsError('failed-precondition', e instanceof Error ? e.message : 'No se pudo cancelar.');
    }
});
export const mcBillingSetDefaultPaymentMethod = onCall({ invoker: 'public' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    const { tenantId } = await resolveTenantOwner(uid);
    const data = request.data;
    const cardId = typeof data.cardId === 'string' ? data.cardId.trim() : '';
    const accountId = typeof data.accountId === 'string' ? data.accountId.trim() : '';
    if (Boolean(cardId) === Boolean(accountId)) {
        throw new HttpsError('invalid-argument', 'Indicá tarjeta o Nequi (uno solo).');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    const customerId = tenantSnap.data().billingOnePayCustomerId?.trim();
    if (!customerId) {
        throw new HttpsError('failed-precondition', 'Completá primero tus datos de facturación.');
    }
    const { secretKey } = await getPlatformBillingCreds();
    if (cardId) {
        const cards = await onepayListCards(customerId, secretKey);
        if (!cards.some((c) => c.id === cardId)) {
            throw new HttpsError('not-found', 'Tarjeta no encontrada en tu cuenta.');
        }
        await db.doc(`mc_tenants/${tenantId}`).set({
            billingPinnedCardId: cardId,
            billingPinnedAccountId: FieldValue.delete(),
            billingDebitMethod: 'card',
            billingAutoRenewEnabled: true,
        }, { merge: true });
        await db.doc(`mc_tenants/${tenantId}/${MC_BILLING_SUB_COLLECTION}/${MC_BILLING_SUB_DOC}`).set({ autoRenewEnabled: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return { ok: true, method: 'card' };
    }
    const accounts = await onepayListAccounts(customerId, secretKey);
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc || !accountReadyForDebit(acc)) {
        throw new HttpsError('failed-precondition', 'Nequi no está listo para débito.');
    }
    await db.doc(`mc_tenants/${tenantId}`).set({
        billingPinnedAccountId: accountId,
        billingPinnedCardId: FieldValue.delete(),
        billingDebitMethod: 'nequi',
        billingAutoRenewEnabled: true,
    }, { merge: true });
    await db.doc(`mc_tenants/${tenantId}/${MC_BILLING_SUB_COLLECTION}/${MC_BILLING_SUB_DOC}`).set({ autoRenewEnabled: true, debitMethodKind: 'account', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true, method: 'nequi' };
});
export const mcBillingCron = onSchedule({ schedule: 'every 6 hours', timeZone: 'America/Bogota' }, async () => {
    const pc = await db.doc('mc_platform/credentials_onepay').get();
    const sk = pc.data()?.secretKey?.trim();
    if (!sk)
        return;
    await mcBillingReconcileFailedWebhookEvents(db, sk);
    await mcBillingReconcilePendingActivations(db, sk);
    await mcBillingRunDueRenewals(db, sk);
    await mcBillingProcessGraceExpiries(db);
});
export { mcBillingTryFinalizeFromChargeWebhook } from './service.js';
