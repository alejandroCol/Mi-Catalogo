import { randomBytes } from 'node:crypto';
import { db } from './firebaseAdmin.js';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret, defineString } from 'firebase-functions/params';
import express from 'express';
import { markCarritoIniciadoAfterOrderPaid } from './carritoIniciado.js';
import { resolveCheckoutEnvioCop } from './shipping/resolveCheckoutEnvio.js';
import { catalogSaleOrderSliceFromData, resolveEmailCatalogThemeColors, sendCatalogCustomerPurchaseConfirmationEmail, sendCatalogSalePaidEmail, } from './catalogSaleEmail.js';
import { AUTH_VERIFY_COOLDOWN_MS, sendVerificationEmailWithResend } from './authVerificationEmail.js';
import { mcSendCarritoRecuperacionEmailHandler } from './carritoRecuperacionEmail.js';
import { buildStorePublicUrl, isReservedStoreSlug } from './storePublicUrl.js';
import { MC_RESEND_FROM } from './mcResend.js';
import { authenticateOnePayWebhook, extractPaymentIdAndEvent, mcOrderIdFromOnePayMetadata, mcStoreIdFromOnePayMetadata, normalizeOnePayWebhookEnvelope, onepayMetadataForApi, onepayPickExternalId, } from './onepayCatalogHelpers.js';
import { productoPrecioVentaFromData } from './productoDescuento.js';
import { enrichLineasWithComboCost, fulfillCatalogOrderInventory, validateCatalogLineStock, } from './catalogInventoryFulfill.js';
import { assertKybGeoCaller, fetchOnePayCities, fetchOnePayStates, } from './onepayKybGeo.js';
import { isTenantMembershipActive } from './tenantMembership.js';
import { mcBillingTryFinalizeFromChargeWebhook } from './billingSubscription/service.js';
import { onepayGetCharge } from './billingSubscription/onepayBillingApi.js';
import { fetchPasarelaMicatalogoLedger, recordPasarelaMicatalogoWithdrawal, } from './pasarelaMicatalogoLedger.js';
import { mcBillingAddCard, mcBillingAddNequi, mcBillingCancelAutoRenewCallable, mcBillingCompleteActivation, mcBillingCron, mcBillingEnsureCustomer, mcBillingGetSdkContext, mcBillingGetSubscriptionState, mcBillingListNequiBanks, mcBillingListPaymentHistoryCallable, mcBillingPaymentMethods, mcBillingSetDefaultPaymentMethod, mcBillingValidateDiscountCode, mcBillingValidateNequi, mcBillingCheckNequiReady, } from './billingSubscription/handlers.js';
const REGION = process.env.MC_FUNCTIONS_REGION || 'us-central1';
setGlobalOptions({ region: REGION });
/** Resolver tienda para callables OnePay: dueño de su tienda o súper admin con `targetTenantId`. */
async function resolveOnepayTenantId(req, dataRaw) {
    const uid = req.auth?.uid;
    if (!uid || typeof uid !== 'string') {
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    }
    const data = (dataRaw && typeof dataRaw === 'object' ? dataRaw : {});
    const target = typeof data.targetTenantId === 'string' && data.targetTenantId.trim().length > 0
        ? data.targetTenantId.trim()
        : '';
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
    }
    const u = userSnap.data();
    if (target) {
        if (u.isSuperAdmin !== true) {
            throw new HttpsError('permission-denied', 'Solo súper admin puede configurar OnePay para otra tienda.');
        }
        const tenantSnap = await db.doc(`mc_tenants/${target}`).get();
        if (!tenantSnap.exists) {
            throw new HttpsError('not-found', 'Tienda no encontrada.');
        }
        return { tenantId: target, superAdminBypass: true };
    }
    const tenantId = u.tenantId;
    if (!tenantId || typeof tenantId !== 'string') {
        throw new HttpsError('failed-precondition', 'No tenés tienda asociada.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const ownerUid = tenantSnap.data().ownerUid;
    if (ownerUid !== uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño puede vincular pagos.');
    }
    return { tenantId, superAdminBypass: false };
}
async function assertMcSuperAdmin(request) {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    }
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
    }
    if (userSnap.data().isSuperAdmin !== true) {
        throw new HttpsError('permission-denied', 'Solo súper admin.');
    }
}
const PLATFORM_SETTINGS_REF = db.doc('mc_platform/settings');
/** Credenciales plataforma (par collection/document válido para `doc()`). */
const PLATFORM_ONEPAY_CRED_REF = db.doc('mc_platform/credentials_onepay');
const ONEPAY_API = 'https://api.onepay.la/v1/payments';
const ONEPAY_BALANCE_URLS = ['https://api.onepay.la/v1/balances', 'https://api.onepay.la/v1/balance'];
const ONEPAY_BALANCE_CASHOUT_URL = 'https://api.onepay.la/v1/balances';
const ONEPAY_COMPANIES_API = 'https://api.onepay.la/v1/companies';
const ONEPAY_CUSTOMERS_API = 'https://api.onepay.la/v1/customers';
const ONEPAY_ACCOUNTS_API = 'https://api.onepay.la/v1/accounts';
const ONEPAY_CASHOUTS_API = 'https://api.onepay.la/v1/cashouts';
const ONEPAY_FUND_WITHDRAWAL_PERIODS = new Set(['daily', 'weekly', 'biweekly', 'monthly']);
/** Docs: https://docs.onepay.la/client/accounts/list-banks — primario `GET /v1/accounts/banks`; fallback `GET /v1/banks` (como G-PRO `onepayListBanks`). */
const ONEPAY_ACCOUNTS_BANKS_API = 'https://api.onepay.la/v1/accounts/banks';
const ONEPAY_BANKS_LEGACY_API = 'https://api.onepay.la/v1/banks';
const onePayPlatformSk = defineSecret('ONEPAY_PLATFORM_SK');
const resendApiKey = defineSecret('RESEND_API_KEY');
const enviaApiToken = defineSecret('ENVIA_API_TOKEN');
/** Mismo host que en la app (`VITE_MC_PUBLIC_ORIGIN`): debe estar en Dominios autorizados de Firebase Auth. */
const mcPublicOrigin = defineString('MC_PUBLIC_ORIGIN', { default: 'https://micatalogo.io' });
function readResendApiKey() {
    try {
        const v = resendApiKey.value();
        return typeof v === 'string' ? v.trim() : '';
    }
    catch {
        return '';
    }
}
/** Correo de verificación de cuenta (Resend + enlace generado por Admin SDK). */
export const mcSendEmailVerification = onCall({ invoker: 'public', secrets: [resendApiKey] }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    }
    const uid = request.auth.uid;
    const key = readResendApiKey();
    if (!key) {
        throw new HttpsError('failed-precondition', 'Falta configurar RESEND_API_KEY en Cloud Functions para enviar el correo de verificación.');
    }
    /** Colección/doc (2 segmentos). `mc_internal/.../uid` rompe Firestore (3 segmentos → 500 INTERNAL). */
    const throttleRef = db.doc(`mc_auth_verify_throttle/${uid}`);
    const throttleSnap = await throttleRef.get();
    const lastSent = throttleSnap.data()?.lastSentAt ?? 0;
    const now = Date.now();
    if (lastSent > 0 && now - lastSent < AUTH_VERIFY_COOLDOWN_MS) {
        throw new HttpsError('resource-exhausted', 'Esperá un momento antes de pedir otro correo.');
    }
    let userRecord;
    try {
        userRecord = await getAuth().getUser(uid);
    }
    catch {
        throw new HttpsError('not-found', 'Usuario no encontrado.');
    }
    const email = userRecord.email?.trim();
    if (!email) {
        throw new HttpsError('failed-precondition', 'Tu cuenta no tiene correo.');
    }
    if (userRecord.emailVerified) {
        throw new HttpsError('failed-precondition', 'Tu correo ya está verificado.');
    }
    const origin = mcPublicOrigin.value().trim();
    const sent = await sendVerificationEmailWithResend({
        email,
        publicOrigin: origin,
        resendApiKey: key,
    });
    if (!sent.ok) {
        console.error('[mcSendEmailVerification]', sent.error, sent.firebaseCode);
        const blob = `${sent.error} ${sent.firebaseCode ?? ''}`.toLowerCase();
        if (blob.includes('unauthorized') &&
            (blob.includes('continue') || blob.includes('domain'))) {
            throw new HttpsError('failed-precondition', 'El dominio del enlace de verificación no está autorizado en Firebase (Authentication → Dominios autorizados). Revisá también MC_PUBLIC_ORIGIN en la función.');
        }
        throw new HttpsError('internal', 'No pudimos enviar el correo. Probá en unos minutos.');
    }
    await throttleRef.set({ lastSentAt: now, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
});
/** Recordatorio de carrito abandonado al correo del comprador (Resend). */
export const mcSendCarritoRecuperacionEmail = onCall({ invoker: 'public', secrets: [resendApiKey] }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    }
    const key = readResendApiKey();
    if (!key) {
        throw new HttpsError('failed-precondition', 'Falta configurar RESEND_API_KEY en Cloud Functions para enviar correos de recuperación.');
    }
    const origin = mcPublicOrigin.value().trim();
    return mcSendCarritoRecuperacionEmailHandler(db, request.auth.uid, request.data, key, origin);
});
const ONEPAY_KYB_TERMS_VERSION = 'mc-2026-05';
const ONEPAY_SALES_ALLOWED = new Set([10, 35, 110, 240, 500]);
function assertSk(key) {
    if (typeof key !== 'string' || !key.trim()) {
        throw new HttpsError('invalid-argument', 'Clave inválida.');
    }
    const k = key.trim();
    if (!/^sk_(test|live)_[a-zA-Z0-9]+$/.test(k)) {
        throw new HttpsError('invalid-argument', 'La clave debe empezar con sk_test_ o sk_live_ (API secret de OnePay).');
    }
    return k;
}
function optionalSk(key) {
    if (typeof key !== 'string' || !key.trim())
        return null;
    return assertSk(key);
}
function resolveSecretKeyForLink(dataIn, prev) {
    const fromInput = optionalSk(dataIn?.secretKey);
    if (fromInput)
        return fromInput;
    const prevSk = typeof prev?.secretKey === 'string' ? prev.secretKey.trim() : '';
    if (prevSk)
        return prevSk;
    throw new HttpsError('invalid-argument', 'Clave inválida.');
}
function hasOnepayCredentialInput(dataIn) {
    return ((typeof dataIn?.secretKey === 'string' && dataIn.secretKey.trim().length >= 8) ||
        (typeof dataIn?.webhookSecret === 'string' && dataIn.webhookSecret.trim().length >= 8) ||
        (typeof dataIn?.webhookToken === 'string' && dataIn.webhookToken.trim().length >= 8) ||
        (typeof dataIn?.publicKey === 'string' && dataIn.publicKey.trim().length >= 8));
}
function assertAtLeastOneCredentialField(dataIn, isUpdate) {
    if (isUpdate && !hasOnepayCredentialInput(dataIn)) {
        throw new HttpsError('invalid-argument', 'Completá al menos un campo para actualizar las credenciales.');
    }
}
function assertWebhookSecret(s) {
    if (typeof s !== 'string' || s.trim().length < 8) {
        throw new HttpsError('invalid-argument', 'Necesitás el Secreto del webhook de OnePay (whsec_… al crear el webhook en el panel; mín. 8 caracteres).');
    }
    const t = s.trim();
    if (t.startsWith('wh_hdr_')) {
        throw new HttpsError('invalid-argument', 'Ese valor es el token de cabecera (wh_hdr_). Usá el Secreto del webhook (whsec_…) para la firma HMAC, o guardalo en el campo Token del webhook.');
    }
    return t;
}
function optionalWebhookToken(s) {
    if (typeof s !== 'string' || !s.trim())
        return null;
    const t = s.trim();
    if (t.length < 8) {
        throw new HttpsError('invalid-argument', 'Token del webhook inválido (mín. 8 caracteres).');
    }
    if (t.startsWith('whsec_') || t.startsWith('wh_tok_')) {
        throw new HttpsError('invalid-argument', 'Ese valor es el secreto HMAC (whsec_…). Guardalo en «Secreto del webhook», no en el token de cabecera.');
    }
    return t;
}
/** Clave pública OnePay (pk_test_ / pk_live_) — opcional; útil si integrás widgets o SDK en el front. */
function optionalPublicKey(s) {
    if (typeof s !== 'string' || !s.trim())
        return null;
    const k = s.trim();
    if (!/^pk_(test|live)_[a-zA-Z0-9]+$/.test(k)) {
        throw new HttpsError('invalid-argument', 'La clave pública debe ser pk_test_… o pk_live_… (panel OnePay → API keys).');
    }
    return k;
}
function mergeOnepayCredentials(prev, next) {
    const out = { secretKey: next.secretKey };
    const wh = (typeof next.webhookSecret === 'string' && next.webhookSecret.length >= 8
        ? next.webhookSecret
        : null) ??
        (typeof prev?.webhookSecret === 'string' && prev.webhookSecret.length >= 8 ? prev.webhookSecret.trim() : null);
    const wt = (typeof next.webhookToken === 'string' && next.webhookToken.length >= 8
        ? next.webhookToken
        : null) ??
        (typeof prev?.webhookToken === 'string' && prev.webhookToken.length >= 8 ? prev.webhookToken.trim() : null);
    const pk = (typeof next.publicKey === 'string' && next.publicKey.trim() ? next.publicKey.trim() : null) ??
        (typeof prev?.publicKey === 'string' && prev.publicKey.trim() ? prev.publicKey.trim() : null);
    if (wh)
        out.webhookSecret = wh;
    if (wt)
        out.webhookToken = wt;
    if (pk)
        out.publicKey = pk;
    return out;
}
function onepayCredentialHints(cred) {
    return {
        ...(cred.secretKey ? { onepayKeyHint: keyHint(cred.secretKey) } : {}),
        ...(cred.webhookSecret
            ? { onepayWebhookHint: keyHint(cred.webhookSecret) }
            : { onepayWebhookHint: FieldValue.delete() }),
        ...(cred.webhookToken
            ? { onepayWebhookTokenHint: keyHint(cred.webhookToken) }
            : { onepayWebhookTokenHint: FieldValue.delete() }),
        ...(cred.publicKey
            ? { onepayPublicKeyHint: keyHint(cred.publicKey) }
            : { onepayPublicKeyHint: FieldValue.delete() }),
    };
}
function keyHint(sk) {
    const t = sk.replace(/\s/g, '');
    return t.length >= 4 ? t.slice(-4) : '****';
}
function normalizeCuponCodigo(raw) {
    return raw.trim().toUpperCase().replace(/\s+/g, '');
}
function descuentoDesdeCupon(subtotalCop, cupon) {
    const sub = Math.max(0, Math.round(subtotalCop));
    if (sub <= 0)
        return 0;
    if (cupon.tipo === 'porcentaje') {
        const p = Math.min(100, Math.max(0, cupon.valor));
        return Math.min(sub, Math.round((sub * p) / 100));
    }
    const fijo = Math.max(0, Math.round(cupon.valor));
    return Math.min(sub, fijo);
}
function buscarCuponActivo(codigoIngresado, cupones) {
    const key = normalizeCuponCodigo(codigoIngresado);
    if (!key || !cupones?.length)
        return null;
    const found = cupones.find((c) => c.activo && normalizeCuponCodigo(c.codigo) === key);
    return found ?? null;
}
function totalCheckoutCop(subtotalCop, envioCop, descuentoCop) {
    const s = Math.max(0, Math.round(subtotalCop));
    const e = Math.max(0, Math.round(envioCop));
    const d = Math.min(s, Math.max(0, Math.round(descuentoCop)));
    return Math.max(0, s - d + e);
}
/** E.164 aproximado para Colombia. */
function formatCoPhone(raw) {
    const d = raw.replace(/\D/g, '');
    if (d.length >= 10 && d.length <= 12) {
        if (d.startsWith('57') && d.length >= 12)
            return `+${d.slice(0, 12)}`;
        if (d.length === 10 && d.startsWith('3'))
            return `+57${d}`;
    }
    return undefined;
}
function phoneE164Co(raw) {
    const t = raw.trim().replace(/\s/g, '');
    if (!t) {
        throw new HttpsError('invalid-argument', 'El teléfono es obligatorio.');
    }
    const digits = (t.startsWith('+') ? t.slice(1) : t).replace(/\D/g, '');
    if (digits.startsWith('57') && digits.length >= 12) {
        return `+${digits.slice(0, 12)}`;
    }
    if (digits.length === 10 && digits.startsWith('3')) {
        return `+57${digits}`;
    }
    if (t.startsWith('+') && /^\+[1-9]\d{7,14}$/.test(t.replace(/\s/g, ''))) {
        return t.replace(/\s/g, '');
    }
    const co = formatCoPhone(raw);
    if (co)
        return co;
    throw new HttpsError('invalid-argument', 'Teléfono inválido. Usá un móvil colombiano (ej. 3001234567).');
}
function onepayApiErrorMessage(json, fallback) {
    if (!json || typeof json !== 'object')
        return fallback;
    const o = json;
    const parts = [];
    if (typeof o.message === 'string' && o.message.trim())
        parts.push(o.message.trim());
    if (o.errors && typeof o.errors === 'object') {
        for (const [k, v] of Object.entries(o.errors)) {
            if (Array.isArray(v)) {
                for (const x of v) {
                    if (typeof x === 'string' && x.trim())
                        parts.push(`${k}: ${x}`);
                }
            }
            else if (typeof v === 'string' && v.trim()) {
                parts.push(`${k}: ${v}`);
            }
        }
    }
    const msg = [...new Set(parts)].join(' · ');
    return msg || fallback;
}
function trimField(v, min, max, label) {
    if (typeof v !== 'string') {
        throw new HttpsError('invalid-argument', `${label} inválido.`);
    }
    const t = v.trim();
    if (t.length < min || t.length > max) {
        throw new HttpsError('invalid-argument', `${label}: entre ${min} y ${max} caracteres.`);
    }
    return t;
}
function assertHttpsUrl(v, label) {
    if (typeof v !== 'string') {
        throw new HttpsError('invalid-argument', `${label} inválido.`);
    }
    const t = v.trim();
    if (!t.startsWith('https://')) {
        throw new HttpsError('invalid-argument', `${label}: debe ser una URL https:// pública.`);
    }
    try {
        void new URL(t);
    }
    catch {
        throw new HttpsError('invalid-argument', `${label}: URL no válida.`);
    }
    if (t.length > 2048) {
        throw new HttpsError('invalid-argument', `${label} demasiado largo.`);
    }
    return t;
}
function optionalHttpsUrl(v) {
    if (v == null || (typeof v === 'string' && !v.trim()))
        return undefined;
    return assertHttpsUrl(v, 'URL');
}
function digitsField(v, len, label) {
    const t = trimField(v, len, len, label);
    if (!/^\d+$/.test(t)) {
        throw new HttpsError('invalid-argument', `${label}: solo dígitos (${len}).`);
    }
    return t;
}
function optionalDigits4(v, label) {
    if (v == null || (typeof v === 'string' && !v.trim()))
        return undefined;
    return digitsField(v, 4, label);
}
function newHookRouteKey() {
    return randomBytes(16).toString('hex');
}
function buildNumeroReferencia(orderId) {
    const tail = orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
    return `MC-${tail.length >= 4 ? tail : orderId.slice(0, 8).toUpperCase()}`;
}
function normalizeOrderIdInput(raw) {
    return raw.trim();
}
function newViewToken() {
    return randomBytes(20).toString('hex');
}
async function onepayGetMerchantBalance(secretKey) {
    let lastStatus = 404;
    let lastBody = '';
    for (const url of ONEPAY_BALANCE_URLS) {
        let res;
        try {
            res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${secretKey}` } });
        }
        catch {
            return { error: 'No se pudo contactar a OnePay.', status: 503 };
        }
        const text = await res.text();
        lastStatus = res.status;
        lastBody = text.slice(0, 500);
        if (!res.ok)
            continue;
        try {
            const j = JSON.parse(text);
            if (typeof j.balance === 'number') {
                const label = typeof j.balance_label === 'string' && j.balance_label
                    ? j.balance_label
                    : typeof j.label === 'string'
                        ? j.label
                        : '';
                return { id: String(j.id || ''), balance: j.balance, balance_label: label };
            }
        }
        catch {
            /* try next url */
        }
    }
    try {
        const j = JSON.parse(lastBody);
        const msg = typeof j.message === 'string' && j.message ? j.message : 'No se pudo leer el balance en OnePay.';
        return { error: msg, status: lastStatus };
    }
    catch {
        return { error: 'No se pudo leer el balance en OnePay.', status: lastStatus };
    }
}
async function onepayListPaymentsPage(secretKey, page) {
    const u = new URL(ONEPAY_API);
    u.searchParams.set('sort', '-created_at');
    u.searchParams.set('page', String(page));
    let res;
    try {
        res = await fetch(u.toString(), { method: 'GET', headers: { Authorization: `Bearer ${secretKey}` } });
    }
    catch {
        throw new HttpsError('unavailable', 'No se pudo contactar a OnePay.');
    }
    const text = await res.text();
    if (!res.ok) {
        let msg = 'OnePay rechazó el listado de cobros.';
        try {
            const j = JSON.parse(text);
            if (typeof j.message === 'string' && j.message)
                msg = j.message;
        }
        catch {
            /* */
        }
        throw new HttpsError('internal', msg);
    }
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        throw new HttpsError('internal', 'Respuesta inválida de OnePay.');
    }
    const rawList = Array.isArray(json.data) ? json.data : [];
    const payments = [];
    for (const row of rawList) {
        if (!row || typeof row !== 'object')
            continue;
        const r = row;
        const id = typeof r.id === 'string' ? r.id : '';
        if (!id)
            continue;
        payments.push({
            id,
            status: typeof r.status === 'string' ? r.status : '',
            currency: typeof r.currency === 'string' ? r.currency : 'COP',
            amount: typeof r.amount === 'number' ? r.amount : Math.round(Number(r.amount) || 0),
            amount_label: typeof r.amount_label === 'string' ? r.amount_label : undefined,
            title: typeof r.title === 'string' ? r.title : null,
            created_at: typeof r.created_at === 'string' ? r.created_at : null,
            paid_at: typeof r.paid_at === 'string' ? r.paid_at : null,
            payment_link: typeof r.payment_link === 'string' ? r.payment_link : null,
            reference: typeof r.reference === 'string' ? r.reference : null,
        });
    }
    return {
        payments,
        currentPage: typeof json.current_page === 'number' ? json.current_page : page,
        lastPage: typeof json.last_page === 'number' ? json.last_page : 1,
        perPage: typeof json.per_page === 'number' ? json.per_page : payments.length || 20,
    };
}
async function assertOnepayOwnerMerchantReady(request, dataRaw) {
    const { tenantId, superAdminBypass } = await resolveOnepayTenantId(request, dataRaw);
    const tenantRef = db.doc(`mc_tenants/${tenantId}`);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const td = tenantSnap.data();
    if (!superAdminBypass && td?.ownerUid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño.');
    }
    if (!superAdminBypass && !isTenantMembershipActive(td)) {
        throw new HttpsError('failed-precondition', 'Membresía inactiva.');
    }
    if (td.onepayPaymentsEnabled !== true) {
        throw new HttpsError('failed-precondition', 'La pasarela OnePay no está activa para esta tienda.');
    }
    const credSnap = await db.doc(`mc_tenants/${tenantId}/private_onepay/credentials`).get();
    const sk = credSnap.data()?.secretKey;
    if (!sk || typeof sk !== 'string') {
        throw new HttpsError('failed-precondition', 'Falta la clave API de OnePay.');
    }
    return { tenantId, secretKey: sk };
}
export const mcOnepayMerchantBalance = onCall({ invoker: 'public' }, async (request) => {
    const { secretKey } = await assertOnepayOwnerMerchantReady(request, request.data);
    const r = await onepayGetMerchantBalance(secretKey);
    if ('error' in r) {
        throw new HttpsError(r.status === 401 ? 'unauthenticated' : 'internal', r.error);
    }
    return r;
});
export const mcOnepayMerchantPayments = onCall({ invoker: 'public' }, async (request) => {
    const d = request.data;
    const pageRaw = typeof d?.page === 'number' ? d.page : Number(d?.page);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const { secretKey } = await assertOnepayOwnerMerchantReady(request, request.data);
    return onepayListPaymentsPage(secretKey, page);
});
async function readPlatformOnePaySecretKey() {
    const pc = await PLATFORM_ONEPAY_CRED_REF.get();
    const sk = pc.data()?.secretKey;
    if (!sk || typeof sk !== 'string' || sk.trim().length < 8) {
        throw new HttpsError('failed-precondition', 'La pasarela Mi Catálogo no está configurada.');
    }
    return sk.trim();
}
async function assertSellerSaldoAccess(request) {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Iniciá sesión.');
    }
    const userSnap = await db.doc(`mc_users/${request.auth.uid}`).get();
    const tenantId = userSnap.data()?.tenantId;
    if (!tenantId) {
        throw new HttpsError('failed-precondition', 'Sin tienda asociada.');
    }
    const tenantRef = db.doc(`mc_tenants/${tenantId}`);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenant = tenantSnap.data();
    if (tenant.ownerUid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño de la tienda.');
    }
    if (!isTenantMembershipActive(tenant)) {
        throw new HttpsError('failed-precondition', 'Membresía inactiva.');
    }
    const modo = tenant.checkoutVentasModo;
    if (modo !== 'pasarela' && modo !== 'pasarela_micatalogo') {
        throw new HttpsError('failed-precondition', 'Tu método de pago no usa pasarela. Configuralo en Cuenta.');
    }
    if (modo === 'pasarela' && tenant.onepayPaymentsEnabled !== true) {
        throw new HttpsError('failed-precondition', 'La pasarela OnePay no está activa para tu tienda.');
    }
    if (modo === 'pasarela_micatalogo') {
        const ps = await PLATFORM_SETTINGS_REF.get();
        const pasarelaOk = ps.data()?.pasarelaMicatalogoActiva ===
            true;
        if (!pasarelaOk) {
            throw new HttpsError('failed-precondition', 'La pasarela Mi Catálogo no está activa.');
        }
    }
    return { tenantId, tenant };
}
function mapPasarelaPaymentRow(o) {
    const gross = Math.max(0, Math.round(Number(o.totalCop) || 0));
    return {
        orderId: o.id,
        createdAt: typeof o.createdAt === 'number' ? o.createdAt : 0,
        numeroReferencia: o.numeroReferencia ?? null,
        clienteNombre: o.clienteNombre ?? null,
        onepayPaymentId: o.onepayPaymentId ?? null,
        grossCop: gross,
    };
}
export const mcOnepaySellerSaldoSummary = onCall({ invoker: 'public' }, async (request) => {
    const { tenantId, tenant } = await assertSellerSaldoAccess(request);
    const modo = tenant.checkoutVentasModo === 'pasarela_micatalogo' ? 'pasarela_micatalogo' : 'pasarela';
    if (modo === 'pasarela_micatalogo') {
        const ledger = await fetchPasarelaMicatalogoLedger(db, tenantId);
        const payments = ledger.recentPayments.map((p) => ({
            orderId: p.orderId,
            createdAt: p.createdAt,
            paidAt: p.paidAt,
            releaseAt: p.releaseAt,
            isReleased: p.isReleased,
            numeroReferencia: p.numeroReferencia,
            clienteNombre: p.clienteNombre,
            onepayPaymentId: p.onepayPaymentId,
            grossCop: p.grossCop,
            feeCop: p.feeCop,
            netCop: p.netCop,
        }));
        return {
            modo,
            balance: null,
            ledger: {
                grossTotalCop: ledger.grossTotalCop,
                feeTotalCop: ledger.feeTotalCop,
                netTotalCop: ledger.netTotalCop,
                releasedNetCop: ledger.releasedNetCop,
                pendingNetCop: ledger.pendingNetCop,
                pendingPaymentCount: ledger.pendingPaymentCount,
                withdrawnTotalCop: ledger.withdrawnTotalCop,
                availableNetCop: ledger.availableNetCop,
                paymentCount: ledger.paymentCount,
                withdrawals: ledger.withdrawals,
            },
            grossTotalCop: ledger.grossTotalCop,
            payments,
            payoutConfigured: Boolean(tenant.onepayPayoutCustomerId && tenant.onepayPayoutAccountId),
            payoutAccountHint: tenant.onepayPayoutAccountHint ?? null,
            fundWithdrawalPeriod: null,
        };
    }
    const ordersSnap = await db
        .collection(`mc_tenants/${tenantId}/ordenes_catalogo`)
        .orderBy('createdAt', 'desc')
        .limit(120)
        .get();
    const payments = ordersSnap.docs
        .map((docSnap) => {
        const data = docSnap.data();
        if (data.pagoOnePay !== true)
            return null;
        if (data.estado === 'cancelado')
            return null;
        if (data.onepayViaMicatalogo === true)
            return null;
        return mapPasarelaPaymentRow({ id: docSnap.id, ...data });
    })
        .filter((x) => x !== null);
    const grossTotalCop = payments.reduce((s, p) => s + p.grossCop, 0);
    let balance = null;
    try {
        const { secretKey } = await assertOnepayOwnerMerchantReady(request, request.data);
        const r = await onepayGetMerchantBalance(secretKey);
        if (!('error' in r)) {
            balance = { balance: r.balance, balance_label: r.balance_label };
        }
    }
    catch {
        balance = null;
    }
    return {
        modo,
        balance,
        ledger: null,
        grossTotalCop,
        payments,
        payoutConfigured: Boolean(tenant.onepayPayoutCustomerId && tenant.onepayPayoutAccountId),
        payoutAccountHint: tenant.onepayPayoutAccountHint ?? null,
        fundWithdrawalPeriod: tenant.onepayFundWithdrawalPeriod ?? null,
    };
});
function kybAccountSubtypeToOnepay(subtype) {
    const s = subtype.trim().toLowerCase();
    if (s === 'checking')
        return 'CHECKING';
    if (s === 'electronic_deposit')
        return 'ELECTRONIC_DEPOSIT';
    return 'SAVINGS';
}
const ONEPAY_KYB_ACCOUNT_TYPES = new Set(['savings', 'checking', 'electronic_deposit']);
function normalizeKybBankSupportedType(raw) {
    const s = raw.trim().toLowerCase().replace(/\s+/g, '_');
    if (s === 'savings' || s === 'checking' || s === 'electronic_deposit')
        return s;
    if (s === 'electronicdeposit')
        return 'electronic_deposit';
    return null;
}
function buildOnepayNaturalCustomerBody(input) {
    return {
        user_type: 'natural',
        first_name: input.firstName.slice(0, 80),
        last_name: input.lastName.slice(0, 80),
        email: input.email.slice(0, 120),
        phone: input.phone.slice(0, 20),
        document_type: input.documentType,
        document_number: input.documentNumber.slice(0, 30),
        enable_notifications: false,
        nationality: 'CO',
        birthdate: '1990-01-01',
    };
}
function buildOnepayPayoutAccountBody(input) {
    const subtype = kybAccountSubtypeToOnepay(input.accountSubtype);
    return {
        subtype,
        authorization: true,
        're-enrollment': false,
        account_number: input.accountNumber,
        customer_id: input.customerId,
        bank_id: input.bankId,
    };
}
export const mcOnepayMicatalogoSetupPayout = onCall({ invoker: 'public', secrets: [onePayPlatformSk] }, async (request) => {
    const { tenantId, tenant } = await assertSellerSaldoAccess(request);
    if (tenant.checkoutVentasModo !== 'pasarela_micatalogo') {
        throw new HttpsError('failed-precondition', 'El retiro manual solo aplica con pasarela sin registro OnePay.');
    }
    const d = request.data;
    const firstName = typeof d.first_name === 'string' ? d.first_name.trim() : '';
    const lastName = typeof d.last_name === 'string' ? d.last_name.trim() : '';
    const email = typeof d.email === 'string' ? d.email.trim().toLowerCase() : '';
    const phone = phoneE164Co(typeof d.phone === 'string' ? d.phone : '');
    const documentType = typeof d.document_type === 'string' ? d.document_type.trim().toUpperCase() : 'CC';
    const documentNumber = typeof d.document_number === 'string' ? d.document_number.trim().replace(/\s+/g, '') : '';
    const bankId = typeof d.bank_id === 'string' ? d.bank_id.trim() : '';
    const accountSubtype = typeof d.account_subtype === 'string' ? d.account_subtype.trim().toLowerCase() : 'savings';
    const accountNumber = typeof d.account_number === 'string' ? d.account_number.trim().replace(/\s+/g, '') : '';
    const idemNonce = typeof d.idempotencyNonce === 'string' ? d.idempotencyNonce.trim() : '';
    if (firstName.length < 2 || lastName.length < 2) {
        throw new HttpsError('invalid-argument', 'Nombre y apellido son obligatorios.');
    }
    if (!email.includes('@')) {
        throw new HttpsError('invalid-argument', 'Correo no válido.');
    }
    if (documentNumber.length < 5) {
        throw new HttpsError('invalid-argument', 'Número de documento inválido.');
    }
    if (!['CC', 'CE', 'PASSPORT'].includes(documentType)) {
        throw new HttpsError('invalid-argument', 'Para retiros usá cédula de ciudadanía, extranjería o pasaporte.');
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bankId)) {
        throw new HttpsError('invalid-argument', 'Elegí un banco de la lista.');
    }
    if (!ONEPAY_KYB_ACCOUNT_TYPES.has(accountSubtype)) {
        throw new HttpsError('invalid-argument', 'Tipo de cuenta no válido. Elegí ahorros, corriente o depósito electrónico según el banco.');
    }
    if (accountNumber.length < 5 || accountNumber.length > 40) {
        throw new HttpsError('invalid-argument', 'Número de cuenta: entre 5 y 40 caracteres.');
    }
    if (!/^[0-9A-Za-z@]+$/.test(accountNumber)) {
        throw new HttpsError('invalid-argument', 'Número de cuenta: solo letras, números o @ (Bre-B).');
    }
    if (idemNonce.length < 8) {
        throw new HttpsError('invalid-argument', 'Recargá la página e intentá de nuevo.');
    }
    const platformSk = onePayPlatformSk.value().trim() || (await readPlatformOnePaySecretKey());
    if (!platformSk) {
        throw new HttpsError('failed-precondition', 'La pasarela Mi Catálogo no está configurada.');
    }
    const tenantRef = db.doc(`mc_tenants/${tenantId}`);
    let customerId = tenant.onepayPayoutCustomerId;
    if (!customerId) {
        const custRes = await fetch(ONEPAY_CUSTOMERS_API, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${platformSk}`,
                'Content-Type': 'application/json',
                'x-idempotency': `mc-payout-cust-${tenantId}-${idemNonce}`.slice(0, 120),
            },
            body: JSON.stringify(buildOnepayNaturalCustomerBody({
                firstName,
                lastName,
                email,
                phone,
                documentType,
                documentNumber,
            })),
        });
        const custText = await custRes.text();
        let custJson;
        try {
            custJson = JSON.parse(custText);
        }
        catch {
            throw new HttpsError('internal', `OnePay respondió ${custRes.status} al crear cliente.`);
        }
        if (!custRes.ok || !custJson.id) {
            console.error('[mcOnepayMicatalogoSetupPayout] customer', custRes.status, custText.slice(0, 500));
            throw new HttpsError('invalid-argument', onepayApiErrorMessage(custJson, 'No se pudo crear el cliente en OnePay.'));
        }
        customerId = custJson.id;
        await tenantRef.update({
            onepayPayoutCustomerId: customerId,
            updatedAt: Date.now(),
        });
    }
    const accRes = await fetch(ONEPAY_ACCOUNTS_API, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${platformSk}`,
            'Content-Type': 'application/json',
            'x-idempotency': `mc-payout-acc-${tenantId}-${idemNonce}`.slice(0, 120),
        },
        body: JSON.stringify(buildOnepayPayoutAccountBody({
            accountSubtype,
            accountNumber,
            customerId,
            bankId,
        })),
    });
    const accText = await accRes.text();
    let accJson;
    try {
        accJson = JSON.parse(accText);
    }
    catch {
        throw new HttpsError('internal', `OnePay respondió ${accRes.status} al crear cuenta.`);
    }
    if (!accRes.ok || !accJson.id) {
        console.error('[mcOnepayMicatalogoSetupPayout] account', accRes.status, accText.slice(0, 500));
        throw new HttpsError('invalid-argument', onepayApiErrorMessage(accJson, 'No se pudo registrar la cuenta bancaria.'));
    }
    const hint = accountNumber.length >= 4 ? `···${accountNumber.slice(-4)}` : '···';
    const now = Date.now();
    await tenantRef.update({
        onepayPayoutCustomerId: customerId,
        onepayPayoutAccountId: accJson.id,
        onepayPayoutAccountHint: hint,
        onepayPayoutSetupAt: now,
    });
    return {
        ok: true,
        customerId,
        accountId: accJson.id,
        accountHint: hint,
    };
});
export const mcOnepayMicatalogoRequestCashout = onCall({ invoker: 'public', secrets: [onePayPlatformSk] }, async (request) => {
    const { tenantId, tenant } = await assertSellerSaldoAccess(request);
    if (tenant.checkoutVentasModo !== 'pasarela_micatalogo') {
        throw new HttpsError('failed-precondition', 'El retiro manual solo aplica con pasarela sin registro OnePay.');
    }
    if (!tenant.onepayPayoutCustomerId || !tenant.onepayPayoutAccountId) {
        throw new HttpsError('failed-precondition', 'Primero registrá tu cuenta bancaria para retirar fondos.');
    }
    const d = request.data;
    const idemNonce = typeof d.idempotencyNonce === 'string' && d.idempotencyNonce.trim().length >= 8
        ? d.idempotencyNonce.trim()
        : randomBytes(12).toString('hex');
    const platformSk = onePayPlatformSk.value().trim() || (await readPlatformOnePaySecretKey());
    let amountCop;
    if (d.amount !== undefined && d.amount !== null && d.amount !== '') {
        const raw = typeof d.amount === 'number' ? d.amount : Number(d.amount);
        if (!Number.isFinite(raw) || raw < 10_000) {
            throw new HttpsError('invalid-argument', 'El monto mínimo de retiro es $10.000 COP.');
        }
        amountCop = Math.round(raw);
    }
    const ledger = await fetchPasarelaMicatalogoLedger(db, tenantId);
    const available = ledger.availableNetCop;
    const withdrawAmount = amountCop ?? available;
    if (withdrawAmount < 10_000) {
        throw new HttpsError('failed-precondition', 'El saldo disponible es menor al mínimo de retiro ($10.000).');
    }
    if (withdrawAmount > available) {
        throw new HttpsError('failed-precondition', 'El monto supera tu saldo disponible según tus ventas registradas.');
    }
    const body = {
        amount: withdrawAmount,
        account_id: tenant.onepayPayoutAccountId,
    };
    let cashoutRes = await fetch(ONEPAY_BALANCE_CASHOUT_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${platformSk}`,
            'Content-Type': 'application/json',
            'x-idempotency': `mc-bal-out-${tenantId}-${idemNonce}`.slice(0, 120),
        },
        body: JSON.stringify(body),
    });
    if (cashoutRes.status === 422) {
        cashoutRes = await fetch(ONEPAY_CASHOUTS_API, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${platformSk}`,
                'Content-Type': 'application/json',
                'x-idempotency': `mc-cashout-${tenantId}-${idemNonce}`.slice(0, 120),
            },
            body: JSON.stringify({
                amount: withdrawAmount,
                currency: 'COP',
                customer_id: tenant.onepayPayoutCustomerId,
                account_id: tenant.onepayPayoutAccountId,
                description: `Retiro Mi Catálogo · tienda ${tenantId}`.slice(0, 120),
                method: 'ACH',
                external_id: `mc-withdraw-${tenantId}-${Date.now()}`.slice(0, 64),
            }),
        });
    }
    if (cashoutRes.status === 204) {
        await recordPasarelaMicatalogoWithdrawal(db, tenantId, {
            amountCop: withdrawAmount,
            idempotencyNonce: idemNonce,
        });
        return { ok: true, amountCop: withdrawAmount, via: 'balance' };
    }
    const text = await cashoutRes.text();
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        throw new HttpsError('internal', `OnePay respondió ${cashoutRes.status}.`);
    }
    if (!cashoutRes.ok) {
        const msg = json.message || `No se pudo solicitar el retiro (${cashoutRes.status}).`;
        throw new HttpsError(json.code_name === 'balance_is_empty' || json.code_name === 'insufficient_funds'
            ? 'failed-precondition'
            : 'internal', msg);
    }
    await recordPasarelaMicatalogoWithdrawal(db, tenantId, {
        amountCop: withdrawAmount,
        idempotencyNonce: idemNonce,
    });
    return { ok: true, amountCop: withdrawAmount, via: 'cashout' };
});
async function onepayGetPayment(paymentId, secretKey) {
    let res;
    try {
        res = await fetch(`${ONEPAY_API}/${encodeURIComponent(paymentId)}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${secretKey}` },
        });
    }
    catch {
        return null;
    }
    const text = await res.text();
    if (!res.ok)
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
function paymentIsApproved(s, partial) {
    if (!s)
        return false;
    const x = s.toLowerCase();
    if (x === 'approved' || x === 'succeeded' || x === 'completed' || x === 'paid')
        return true;
    if (x === 'partially_paid' && partial?.is_fully_paid === true)
        return true;
    return false;
}
// --- Link / Unlink
export const mcOnepaySetWebhookSecret = onCall({ invoker: 'public' }, async (request) => {
    const dataIn = request.data;
    const { tenantId, superAdminBypass } = await resolveOnepayTenantId(request, request.data);
    const tenantRef = db.doc(`mc_tenants/${tenantId}`);
    const tenantSnap = await tenantRef.get();
    const td0 = tenantSnap.data();
    if (!superAdminBypass && td0?.ownerUid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño.');
    }
    const tdSub0 = tenantSnap.data();
    if (!superAdminBypass && !isTenantMembershipActive(tdSub0)) {
        throw new HttpsError('failed-precondition', 'Membresía inactiva.');
    }
    const credRef0 = db.doc(`mc_tenants/${tenantId}/private_onepay/credentials`);
    const c0 = await credRef0.get();
    const prev = c0.data();
    const sk0 = prev?.secretKey;
    if (!sk0) {
        throw new HttpsError('failed-precondition', 'Primero guardá la clave API de OnePay.');
    }
    const hasNewWh = typeof dataIn?.webhookSecret === 'string' && dataIn.webhookSecret.trim().length >= 8;
    const webhookSecret = hasNewWh
        ? assertWebhookSecret(dataIn.webhookSecret)
        : typeof prev?.webhookSecret === 'string' && prev.webhookSecret.length >= 8
            ? prev.webhookSecret.trim()
            : null;
    if (!webhookSecret) {
        throw new HttpsError('invalid-argument', 'Falta el Secreto del webhook (whsec_…).');
    }
    const cred = mergeOnepayCredentials(prev, {
        secretKey: sk0,
        webhookSecret,
        webhookToken: optionalWebhookToken(dataIn?.webhookToken),
        publicKey: optionalPublicKey(dataIn?.publicKey),
    });
    await credRef0.set({ ...cred, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await tenantRef.update({
        onepayPaymentsEnabled: true,
        onepayLinkedAt: Date.now(),
        ...onepayCredentialHints(cred),
    });
    return { ok: true };
});
export const mcOnepayLinkMerchant = onCall({ invoker: 'public' }, async (request) => {
    const dataIn = request.data;
    const hasWh = typeof dataIn?.webhookSecret === 'string' && dataIn.webhookSecret.trim().length >= 8;
    const webhookSecret = hasWh ? assertWebhookSecret(dataIn?.webhookSecret) : null;
    const webhookToken = optionalWebhookToken(dataIn?.webhookToken);
    const publicKey = optionalPublicKey(dataIn?.publicKey);
    const { tenantId, superAdminBypass } = await resolveOnepayTenantId(request, request.data);
    const tenantRef = db.doc(`mc_tenants/${tenantId}`);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const td = tenantSnap.data();
    if (!superAdminBypass && td.ownerUid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño puede vincular pagos.');
    }
    const tdSub = tenantSnap.data();
    if (!superAdminBypass && !isTenantMembershipActive(tdSub)) {
        throw new HttpsError('failed-precondition', 'Membresía inactiva.');
    }
    const hookK = typeof td.onpayWebHookK === 'string' && td.onpayWebHookK.length >= 16
        ? td.onpayWebHookK
        : newHookRouteKey();
    const credRef = db.doc(`mc_tenants/${tenantId}/private_onepay/credentials`);
    const existingCred = await credRef.get();
    const prev = existingCred.data();
    const isUpdate = Boolean(prev?.secretKey);
    assertAtLeastOneCredentialField(dataIn, isUpdate);
    const secretKey = resolveSecretKeyForLink(dataIn, prev);
    const whFinal = webhookSecret ||
        (typeof prev?.webhookSecret === 'string' && prev.webhookSecret.length >= 8 ? prev.webhookSecret.trim() : null);
    const cred = mergeOnepayCredentials(prev, {
        secretKey,
        webhookSecret: whFinal,
        webhookToken,
        publicKey,
    });
    await credRef.set({ ...cred, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await tenantRef.update({
        onepayPaymentsEnabled: Boolean(whFinal),
        onepayLinkedAt: Date.now(),
        onpayWebHookK: hookK,
        ...onepayCredentialHints(cred),
    });
    await db.doc(`mc_onpay_webhook_routes/${hookK}`).set({
        tenantId,
        updatedAt: Date.now(),
    });
    return { ok: true, onpayWebHookK: hookK, needWebhookSecret: !whFinal };
});
export const mcOnepayUnlinkMerchant = onCall({ invoker: 'public' }, async (request) => {
    const { tenantId, superAdminBypass } = await resolveOnepayTenantId(request, request.data);
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    const ownerUid = tenantSnap.data()?.ownerUid;
    if (!superAdminBypass && ownerUid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño.');
    }
    const tRef = db.doc(`mc_tenants/${tenantId}`);
    const tBefore = (await tRef.get()).data();
    const kRemove = tBefore?.onpayWebHookK;
    if (typeof kRemove === 'string' && kRemove) {
        await db.doc(`mc_onpay_webhook_routes/${kRemove}`).delete();
    }
    const credRef = db.doc(`mc_tenants/${tenantId}/private_onepay/credentials`);
    const credSnap = await credRef.get();
    if (credSnap.exists) {
        await credRef.delete();
    }
    await tRef.update({
        onepayPaymentsEnabled: false,
        onepayLinkedAt: FieldValue.delete(),
        onepayKeyHint: FieldValue.delete(),
        onpayWebHookK: FieldValue.delete(),
        onepayWebhookHint: FieldValue.delete(),
        onepayWebhookTokenHint: FieldValue.delete(),
        onepayPublicKeyHint: FieldValue.delete(),
    });
    return { ok: true };
});
// --- Pasarela Mi Catálogo (OnePay del comercio plataforma; tiendas sin cuenta propia)
export const mcOnepayLinkPlatformPasarela = onCall({ invoker: 'public' }, async (request) => {
    await assertMcSuperAdmin(request);
    const dataIn = request.data;
    const hasWh = typeof dataIn?.webhookSecret === 'string' && dataIn.webhookSecret.trim().length >= 8;
    const webhookSecret = hasWh ? assertWebhookSecret(dataIn?.webhookSecret) : null;
    const webhookToken = optionalWebhookToken(dataIn?.webhookToken);
    const publicKey = optionalPublicKey(dataIn?.publicKey);
    const settingsSnap = await PLATFORM_SETTINGS_REF.get();
    const prevSettings = settingsSnap.data();
    const hookK = typeof prevSettings?.onpayWebHookK === 'string' && prevSettings.onpayWebHookK.length >= 16
        ? prevSettings.onpayWebHookK
        : newHookRouteKey();
    const existingCred = await PLATFORM_ONEPAY_CRED_REF.get();
    const prevCred = existingCred.data();
    const isUpdate = Boolean(prevCred?.secretKey);
    assertAtLeastOneCredentialField(dataIn, isUpdate);
    const secretKey = resolveSecretKeyForLink(dataIn, prevCred);
    const whFinal = webhookSecret ||
        (typeof prevCred?.webhookSecret === 'string' && prevCred.webhookSecret.length >= 8
            ? prevCred.webhookSecret.trim()
            : null);
    const cred = mergeOnepayCredentials(prevCred, {
        secretKey,
        webhookSecret: whFinal,
        webhookToken,
        publicKey,
    });
    await PLATFORM_ONEPAY_CRED_REF.set({ ...cred, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await db.doc(`mc_onpay_webhook_routes/${hookK}`).set({ platformPasarela: true, updatedAt: Date.now() });
    await PLATFORM_SETTINGS_REF.set({
        onpayWebHookK: hookK,
        pasarelaMicatalogoActiva: Boolean(whFinal),
        ...onepayCredentialHints(cred),
        updatedAt: Date.now(),
    }, { merge: true });
    return { ok: true, onpayWebHookK: hookK, needWebhookSecret: !whFinal };
});
export const mcOnepaySetPlatformWebhookSecret = onCall({ invoker: 'public' }, async (request) => {
    await assertMcSuperAdmin(request);
    const dataIn = request.data;
    const c0 = await PLATFORM_ONEPAY_CRED_REF.get();
    const prev = c0.data();
    const sk0 = prev?.secretKey;
    if (!sk0) {
        throw new HttpsError('failed-precondition', 'Primero guardá la clave API de OnePay para la pasarela Mi Catálogo.');
    }
    const hasNewWh = typeof dataIn?.webhookSecret === 'string' && dataIn.webhookSecret.trim().length >= 8;
    const webhookSecret = hasNewWh
        ? assertWebhookSecret(dataIn.webhookSecret)
        : typeof prev?.webhookSecret === 'string' && prev.webhookSecret.length >= 8
            ? prev.webhookSecret.trim()
            : null;
    if (!webhookSecret) {
        throw new HttpsError('invalid-argument', 'Falta el Secreto del webhook (whsec_…).');
    }
    const cred = mergeOnepayCredentials(prev, {
        secretKey: sk0,
        webhookSecret,
        webhookToken: optionalWebhookToken(dataIn?.webhookToken),
        publicKey: optionalPublicKey(dataIn?.publicKey),
    });
    await PLATFORM_ONEPAY_CRED_REF.set({ ...cred, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await PLATFORM_SETTINGS_REF.set({
        pasarelaMicatalogoActiva: true,
        ...onepayCredentialHints(cred),
        updatedAt: Date.now(),
    }, { merge: true });
    return { ok: true };
});
export const mcOnepayUnlinkPlatformPasarela = onCall({ invoker: 'public' }, async (request) => {
    await assertMcSuperAdmin(request);
    const s = (await PLATFORM_SETTINGS_REF.get()).data();
    const kRemove = s?.onpayWebHookK;
    if (typeof kRemove === 'string' && kRemove) {
        await db.doc(`mc_onpay_webhook_routes/${kRemove}`).delete();
    }
    const credSnap = await PLATFORM_ONEPAY_CRED_REF.get();
    if (credSnap.exists) {
        await PLATFORM_ONEPAY_CRED_REF.delete();
    }
    await PLATFORM_SETTINGS_REF.set({
        pasarelaMicatalogoActiva: false,
        onpayWebHookK: FieldValue.delete(),
        onepayKeyHint: FieldValue.delete(),
        onepayWebhookHint: FieldValue.delete(),
        onepayWebhookTokenHint: FieldValue.delete(),
        onepayPublicKeyHint: FieldValue.delete(),
        updatedAt: Date.now(),
    }, { merge: true });
    return { ok: true };
});
async function onepayFetchBanksJson(platformSk) {
    const headers = {
        Authorization: `Bearer ${platformSk.trim()}`,
        Accept: 'application/json',
    };
    /** Misma base que G-PRO `onepayListBanks`: `/accounts/banks` y fallback `/banks` con paginación. */
    const primary = `${ONEPAY_ACCOUNTS_BANKS_API}?page=1&per_page=200`;
    const fallback = `${ONEPAY_BANKS_LEGACY_API}?page=1&per_page=200`;
    async function fetchOne(url) {
        try {
            return await fetch(url, { headers });
        }
        catch {
            throw new HttpsError('unavailable', 'No se pudo contactar a OnePay para el listado de bancos.');
        }
    }
    let res = await fetchOne(primary);
    if (!res.ok && res.status !== 401 && res.status !== 403) {
        const res2 = await fetchOne(fallback);
        res = res2;
    }
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        throw new HttpsError('internal', `OnePay (listado de bancos) respondió ${res.status} sin JSON válido.`);
    }
    if (!res.ok) {
        const msg = json && typeof json === 'object' && 'message' in json && typeof json.message === 'string'
            ? json.message
            : `No se pudo obtener bancos (${res.status}).`;
        throw new HttpsError(res.status === 401 || res.status === 403 ? 'permission-denied' : 'internal', msg);
    }
    return json;
}
function normalizeOnePayBanksPayload(raw) {
    const arr = Array.isArray(raw)
        ? raw
        : raw &&
            typeof raw === 'object' &&
            'data' in raw &&
            Array.isArray(raw.data)
            ? raw.data
            : raw &&
                typeof raw === 'object' &&
                'banks' in raw &&
                Array.isArray(raw.banks)
                ? raw.banks
                : [];
    const out = [];
    for (const row of arr) {
        if (!row || typeof row !== 'object')
            continue;
        const o = row;
        const id = typeof o.id === 'string' ? o.id.trim() : '';
        const name = typeof o.name === 'string' ? o.name.trim() : '';
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
            continue;
        if (name.length < 2)
            continue;
        if ('available' in o && o.available === false)
            continue;
        const st = Array.isArray(o.supported_types)
            ? o.supported_types
                .filter((x) => typeof x === 'string' && x.trim().length > 0)
                .map((x) => normalizeKybBankSupportedType(x))
                .filter((x) => x !== null)
            : [];
        out.push({ id, name, supported_types: st });
    }
    return out;
}
/** Dueño de tienda con membresía activa: devuelve bancos para completar KYB (sin exponer la clave de plataforma). */
export const mcOnepayListBanksForKyb = onCall({ invoker: 'public', secrets: [onePayPlatformSk] }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Iniciá sesión para continuar.');
    }
    const platformSk = onePayPlatformSk.value().trim();
    if (!platformSk) {
        throw new HttpsError('failed-precondition', 'Falta configurar el secreto ONEPAY_PLATFORM_SK en Cloud Functions.');
    }
    const userSnap = await db.doc(`mc_users/${request.auth.uid}`).get();
    const tenantId = userSnap.data()?.tenantId;
    if (!tenantId) {
        throw new HttpsError('failed-precondition', 'Sin tienda asociada.');
    }
    const tenantRef = db.doc(`mc_tenants/${tenantId}`);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const td = tenantSnap.data();
    if (td.ownerUid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño de la tienda puede solicitar la pasarela.');
    }
    if (!isTenantMembershipActive(td)) {
        throw new HttpsError('failed-precondition', 'Tu membresía está vencida.');
    }
    const raw = await onepayFetchBanksJson(platformSk);
    const banks = normalizeOnePayBanksPayload(raw);
    return { banks };
});
/** Departamentos OnePay para KYB — GET /v1/states (IDs para filter[state_id] en ciudades). */
export const mcOnepayListStatesForKyb = onCall({ invoker: 'public', secrets: [onePayPlatformSk] }, async (request) => {
    await assertKybGeoCaller(request);
    const platformSk = onePayPlatformSk.value().trim();
    if (!platformSk) {
        throw new HttpsError('failed-precondition', 'Falta configurar el secreto ONEPAY_PLATFORM_SK en Cloud Functions.');
    }
    const d = request.data;
    const filterName = typeof d.filterName === 'string' ? d.filterName : undefined;
    const states = await fetchOnePayStates(platformSk, filterName);
    return { states };
});
/** Ciudades OnePay para KYB — GET /v1/cities (city_id al crear empresa). */
export const mcOnepayListCitiesForKyb = onCall({ invoker: 'public', secrets: [onePayPlatformSk] }, async (request) => {
    await assertKybGeoCaller(request);
    const platformSk = onePayPlatformSk.value().trim();
    if (!platformSk) {
        throw new HttpsError('failed-precondition', 'Falta configurar el secreto ONEPAY_PLATFORM_SK en Cloud Functions.');
    }
    const d = request.data;
    const filterName = typeof d.filterName === 'string' ? d.filterName : undefined;
    let stateId;
    if (typeof d.stateId === 'number' && Number.isFinite(d.stateId) && d.stateId > 0) {
        stateId = Math.floor(d.stateId);
    }
    else if (typeof d.stateId === 'string' && /^\d+$/.test(d.stateId.trim())) {
        stateId = parseInt(d.stateId.trim(), 10);
    }
    let page = 1;
    if (typeof d.page === 'number' && Number.isFinite(d.page) && d.page > 0) {
        page = Math.floor(d.page);
    }
    let perPage = 20;
    if (typeof d.perPage === 'number' && Number.isFinite(d.perPage) && d.perPage > 0) {
        perPage = Math.min(50, Math.floor(d.perPage));
    }
    const pageResult = await fetchOnePayCities(platformSk, { stateId, filterName, page, perPage });
    return pageResult;
});
// --- Alta empresa OnePay (KYB): POST /v1/companies con clave de plataforma
export const mcOnepaySubmitCompanyKyb = onCall({ invoker: 'public', secrets: [onePayPlatformSk] }, async (request) => {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Iniciá sesión para continuar.');
    }
    const platformSk = onePayPlatformSk.value().trim();
    if (!platformSk) {
        throw new HttpsError('failed-precondition', 'Falta configurar el secreto ONEPAY_PLATFORM_SK en Cloud Functions.');
    }
    const d = request.data;
    const termsAccepted = d.termsAccepted === true;
    const termsVersion = typeof d.termsVersion === 'string' ? d.termsVersion.trim() : '';
    if (!termsAccepted || termsVersion !== ONEPAY_KYB_TERMS_VERSION) {
        throw new HttpsError('invalid-argument', 'Debés aceptar los términos y condiciones actualizados para enviar la solicitud.');
    }
    const idemNonce = typeof d.idempotencyNonce === 'string' ? d.idempotencyNonce.trim() : '';
    if (idemNonce.length < 8 || idemNonce.length > 120) {
        throw new HttpsError('invalid-argument', 'Token de envío inválido. Recargá la página e intentá de nuevo.');
    }
    const userSnap = await db.doc(`mc_users/${request.auth.uid}`).get();
    const tenantId = userSnap.data()?.tenantId;
    if (!tenantId) {
        throw new HttpsError('failed-precondition', 'Sin tienda asociada.');
    }
    const tenantRef = db.doc(`mc_tenants/${tenantId}`);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const td = tenantSnap.data();
    if (td.ownerUid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño de la tienda puede solicitar la pasarela.');
    }
    if (!isTenantMembershipActive(td)) {
        throw new HttpsError('failed-precondition', 'Tu membresía está vencida. Renová para solicitar pagos.');
    }
    if (td.onepayKybStatus === 'pending') {
        throw new HttpsError('failed-precondition', 'Tu solicitud ya está en revisión. Te avisamos cuando OnePay la apruebe.');
    }
    if (td.onepayKybStatus === 'approved') {
        throw new HttpsError('failed-precondition', 'Tu empresa ya fue aprobada. Completá la vinculación con tu clave API en Cuenta.');
    }
    const companyType = d.companyType === 'individual' ? 'individual' : 'organization';
    const name = trimField(d.name, 2, 255, 'Nombre comercial');
    const legal_name = typeof d.legal_name === 'string' && d.legal_name.trim().length >= 2
        ? d.legal_name.trim().slice(0, 255)
        : name;
    const docTypeRaw = trimField(d.document_type, 2, 20, 'Tipo de documento').toUpperCase();
    const orgDocs = new Set(['NIT', 'RUT']);
    const indDocs = new Set(['CC', 'CE', 'PPT', 'PEP', 'PASSPORT']);
    const document_type = companyType === 'organization'
        ? orgDocs.has(docTypeRaw)
            ? docTypeRaw
            : (() => {
                throw new HttpsError('invalid-argument', 'Para persona jurídica el documento debe ser NIT o RUT.');
            })()
        : indDocs.has(docTypeRaw)
            ? docTypeRaw
            : (() => {
                throw new HttpsError('invalid-argument', 'Tipo de documento no válido para persona natural.');
            })();
    const document_number = trimField(d.document_number, 5, 30, 'Número de documento');
    const phone = phoneE164Co(typeof d.phone === 'string' ? d.phone : '');
    const email = trimField(d.email, 3, 120, 'Correo').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new HttpsError('invalid-argument', 'Correo electrónico no válido.');
    }
    const website = assertHttpsUrl(d.website, 'Sitio web');
    const economic_activity = digitsField(d.economic_activity, 4, 'Actividad económica (CIIU)');
    const industry = optionalDigits4(d.industry, 'Industria');
    const salesRaw = d.sales;
    const sales = typeof salesRaw === 'number' && ONEPAY_SALES_ALLOWED.has(salesRaw)
        ? salesRaw
        : typeof salesRaw === 'string' && ONEPAY_SALES_ALLOWED.has(Number(salesRaw))
            ? Number(salesRaw)
            : (() => {
                throw new HttpsError('invalid-argument', 'Rango de ventas: elegí 10, 35, 110, 240 o 500 (millones COP).');
            })();
    const fiscalIn = d.fiscal_responsibilities;
    if (!Array.isArray(fiscalIn) || fiscalIn.length === 0) {
        throw new HttpsError('invalid-argument', 'Indicá la responsabilidad fiscal que figura en tu RUT.');
    }
    /** Validado contra api.onepay.la: solo O_13, O_15, O_23, O_47 (no acepta R_99_PN). */
    const ONEPAY_FISCAL_ALLOWED = new Set(['O_13', 'O_15', 'O_23', 'O_47']);
    const normalizeOnePayFiscalCode = (raw) => raw.trim().replace(/\s+/g, '').replace(/-/g, '_').toUpperCase();
    const fiscal_responsibilities = [];
    for (const x of fiscalIn) {
        if (typeof x !== 'string')
            continue;
        const f = normalizeOnePayFiscalCode(x);
        if (!ONEPAY_FISCAL_ALLOWED.has(f)) {
            throw new HttpsError('invalid-argument', 'Código fiscal no válido para OnePay. Elegí O_47 (régimen simple), O_23, O_15 u O_13 según tu RUT. OnePay no acepta R-99-PN.');
        }
        if (!fiscal_responsibilities.includes(f))
            fiscal_responsibilities.push(f);
    }
    if (fiscal_responsibilities.length === 0) {
        throw new HttpsError('invalid-argument', 'Responsabilidad fiscal no válida.');
    }
    const ret = {};
    if (d.retention_iva === true)
        ret.iva = true;
    if (d.retention_ica === true)
        ret.ica = true;
    if (d.retention_fuente === true)
        ret.fuente = true;
    const cityRaw = d.city_id;
    let city_id;
    if (typeof cityRaw === 'number' && Number.isInteger(cityRaw) && cityRaw > 0) {
        city_id = cityRaw;
    }
    else if (typeof cityRaw === 'string' && /^\d+$/.test(cityRaw.trim())) {
        city_id = parseInt(cityRaw.trim(), 10);
    }
    else {
        throw new HttpsError('invalid-argument', 'ID de ciudad inválido (número entero de OnePay).');
    }
    const addrLine = trimField(d.address, 2, 255, 'Dirección');
    const hint = trimField(d.address_hint, 1, 255, 'Complemento dirección');
    const zipcode = trimField(d.zipcode, 5, 9, 'Código postal');
    if (!/^\d{5,9}$/.test(zipcode)) {
        throw new HttpsError('invalid-argument', 'Código postal: 5 a 9 dígitos.');
    }
    const docRut = assertHttpsUrl(d.doc_rut_url, 'URL del RUT');
    const docDni = assertHttpsUrl(d.doc_dni_url, 'URL del documento del representante');
    const docCcc = optionalHttpsUrl(d.doc_ccc_url);
    const docBank = optionalHttpsUrl(d.doc_bank_url);
    const docSimple = optionalHttpsUrl(d.doc_simple_url);
    const needSimple = fiscal_responsibilities.includes('O_47');
    if (needSimple && !docSimple) {
        throw new HttpsError('invalid-argument', 'Con responsabilidad O_47 (régimen simple) debés adjuntar la URL del certificado de régimen simple.');
    }
    const documents = { rut: docRut, dni: docDni };
    if (docSimple)
        documents.simple = docSimple;
    let company_owner;
    if (companyType === 'organization') {
        if (!docCcc || !docBank) {
            throw new HttpsError('invalid-argument', 'Persona jurídica: adjuntá URL de cámara de comercio (ccc) y certificación bancaria.');
        }
        documents.ccc = docCcc;
        documents.bank = docBank;
        const on = typeof d.owner_name === 'string' ? d.owner_name.trim() : '';
        const ol = typeof d.owner_last_name === 'string' ? d.owner_last_name.trim() : '';
        if (on.length < 2 || ol.length < 2) {
            throw new HttpsError('invalid-argument', 'Completá nombre y apellido del representante legal.');
        }
        const odoc = d.owner_document_type === 'ce' || d.owner_document_type === 'CE' ? 'ce' : 'cc';
        const odni = trimField(d.owner_dni, 5, 20, 'Documento del representante');
        const ophone = phoneE164Co(typeof d.owner_phone === 'string' ? d.owner_phone : '');
        const oemail = trimField(d.owner_email, 3, 120, 'Correo del representante').toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(oemail)) {
            throw new HttpsError('invalid-argument', 'Correo del representante no válido.');
        }
        company_owner = {
            name: on.slice(0, 120),
            last_name: ol.slice(0, 120),
            phone: ophone,
            email: oemail,
            document_type: odoc,
            dni: odni,
        };
    }
    let kybAccount;
    if (companyType === 'individual') {
        const bankIdRaw = typeof d.account_bank_id === 'string' ? d.account_bank_id.trim() : '';
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bankIdRaw)) {
            throw new HttpsError('invalid-argument', 'Elegí un banco válido de la lista.');
        }
        const accTypeRaw = typeof d.account_type === 'string' ? d.account_type.trim().toLowerCase() : '';
        if (!ONEPAY_KYB_ACCOUNT_TYPES.has(accTypeRaw)) {
            throw new HttpsError('invalid-argument', 'Tipo de cuenta no válido. Usá ahorros, corriente o depósito electrónico según el banco.');
        }
        const accNumRaw = typeof d.account_number === 'string' ? d.account_number.trim().replace(/\s+/g, '') : '';
        if (accNumRaw.length < 5 || accNumRaw.length > 40) {
            throw new HttpsError('invalid-argument', 'Número de cuenta: entre 5 y 40 caracteres (sin espacios).');
        }
        if (!/^[0-9A-Za-z]+$/.test(accNumRaw)) {
            throw new HttpsError('invalid-argument', 'Número de cuenta: solo letras y números (sin espacios).');
        }
        if (d.account_terms !== true) {
            throw new HttpsError('invalid-argument', 'Marcá la casilla de aceptación de términos de dispersiones a la cuenta.');
        }
        kybAccount = { type: accTypeRaw, bank_id: bankIdRaw, number: accNumRaw, terms: true };
    }
    const body = {
        type: companyType,
        name,
        legal_name,
        document_type,
        document_number,
        phone,
        email,
        website,
        economic_activity,
        sales,
        fiscal_responsibilities,
        city_id,
        address: {
            address: addrLine,
            hint,
            zipcode,
        },
        documents,
    };
    if (industry)
        body.industry = industry;
    if (Object.keys(ret).length > 0)
        body.retention_rules = ret;
    if (company_owner)
        body.company_owner = company_owner;
    if (kybAccount)
        body.account = kybAccount;
    const idempotencyKey = `mc-kyb-${tenantId}-${idemNonce}`.slice(0, 120);
    let res;
    try {
        res = await fetch(ONEPAY_COMPANIES_API, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${platformSk}`,
                'Content-Type': 'application/json',
                'x-idempotency': idempotencyKey,
            },
            body: JSON.stringify(body),
        });
    }
    catch {
        throw new HttpsError('unavailable', 'No se pudo contactar a OnePay. Intentá en unos minutos.');
    }
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        throw new HttpsError('internal', `OnePay respondió ${res.status}.`);
    }
    if (res.status === 409 || json.code_name === 'idempotency_error') {
        throw new HttpsError('already-exists', 'Esta operación ya fue enviada. Si necesitás corregir datos, pedí asistencia o reintentá con otro navegador tras unos minutos.');
    }
    if (!res.ok) {
        const errParts = json.errors ? Object.values(json.errors).flat().filter(Boolean) : [];
        const msg = errParts.length > 0
            ? errParts.slice(0, 4).join(' ')
            : json.message || `OnePay rechazó la solicitud (${res.status}).`;
        throw new HttpsError(res.status === 422 ? 'invalid-argument' : 'internal', msg);
    }
    const companyId = json.id;
    if (!companyId || typeof companyId !== 'string') {
        throw new HttpsError('internal', 'OnePay no devolvió el ID de la empresa.');
    }
    const fundPeriodRaw = typeof d.fundWithdrawalPeriod === 'string' ? d.fundWithdrawalPeriod.trim() : '';
    const fundWithdrawalPeriod = ONEPAY_FUND_WITHDRAWAL_PERIODS.has(fundPeriodRaw)
        ? fundPeriodRaw
        : null;
    if (!fundWithdrawalPeriod) {
        throw new HttpsError('invalid-argument', 'Elegí cada cuánto querés recibir los fondos en tu cuenta.');
    }
    const now = Date.now();
    await tenantRef.update({
        onepayKybStatus: 'pending',
        onepayCompanyId: companyId,
        onepayKybSubmittedAt: now,
        onepayKybTermsAcceptedAt: now,
        onepayKybTermsVersion: ONEPAY_KYB_TERMS_VERSION,
        onepayFundWithdrawalPeriod: fundWithdrawalPeriod,
    });
    return { ok: true, companyId, status: 'pending' };
});
export const mcOnepayStartCatalogCheckout = onCall({ invoker: 'public', secrets: [enviaApiToken] }, async (request) => {
    const data = request.data;
    const slug = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : '';
    if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug) || isReservedStoreSlug(slug)) {
        throw new HttpsError('invalid-argument', 'Slug inválido.');
    }
    const idem = typeof data.idempotencyKey === 'string' && data.idempotencyKey.length >= 8
        ? data.idempotencyKey.slice(0, 120)
        : null;
    if (!idem) {
        throw new HttpsError('invalid-argument', 'Falta idempotencyKey.');
    }
    const lineas = Array.isArray(data.lineas) ? data.lineas : [];
    if (lineas.length === 0 || lineas.length > 100) {
        throw new HttpsError('invalid-argument', 'Carrito inválido.');
    }
    const nombre = typeof data.nombre === 'string' ? data.nombre.trim() : '';
    const telefono = typeof data.telefono === 'string' ? data.telefono.trim() : '';
    if (!nombre || !telefono) {
        throw new HttpsError('invalid-argument', 'Nombre y teléfono son obligatorios.');
    }
    const tipoDocRaw = typeof data.clienteTipoDocumento === 'string' ? data.clienteTipoDocumento.trim().toUpperCase() : '';
    const numDocRaw = typeof data.clienteDocumentoNumero === 'string' ? data.clienteDocumentoNumero.trim() : '';
    const docTiposOk = new Set(['CC', 'CE', 'TI', 'PA', 'NIT', 'PEP', 'OTRO']);
    if (!tipoDocRaw || !docTiposOk.has(tipoDocRaw)) {
        throw new HttpsError('invalid-argument', 'Seleccioná un tipo de documento válido.');
    }
    if (!numDocRaw || numDocRaw.length < 5) {
        throw new HttpsError('invalid-argument', 'Ingresá el número de documento.');
    }
    const clienteTipoDocumento = tipoDocRaw.slice(0, 12);
    const clienteDocumentoNumero = numDocRaw.slice(0, 32);
    const envioCiudad = typeof data.envioCiudad === 'string' ? data.envioCiudad.trim() : '';
    const envioDepartamento = typeof data.envioDepartamento === 'string' ? data.envioDepartamento.trim() : '';
    const envioDireccion = typeof data.envioDireccion === 'string' ? data.envioDireccion.trim() : '';
    if (!envioDepartamento || !envioCiudad || !envioDireccion) {
        throw new HttpsError('invalid-argument', 'Departamento, ciudad y dirección de envío son obligatorias.');
    }
    const redirectOrigin = typeof data.redirectOrigin === 'string' ? data.redirectOrigin.trim() : '';
    if (!redirectOrigin.startsWith('https://') && !redirectOrigin.startsWith('http://localhost')) {
        throw new HttpsError('invalid-argument', 'Origen de retorno inválido.');
    }
    const slugSnap = await db.doc(`mc_slugs/${slug}`).get();
    if (!slugSnap.exists || slugSnap.data().active !== true) {
        throw new HttpsError('not-found', 'Tienda no disponible.');
    }
    const tenantId = slugSnap.data().tenantId;
    if (!tenantId) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenant = tenantSnap.data();
    if (!isTenantMembershipActive(tenant)) {
        throw new HttpsError('failed-precondition', 'Catálogo pausado.');
    }
    const platformSettingsSnap = await PLATFORM_SETTINGS_REF.get();
    const platformSettings = platformSettingsSnap.data();
    const rawModo = tenant.checkoutVentasModo;
    let modoEfectivo;
    if (rawModo === 'pasarela_micatalogo') {
        modoEfectivo = 'pasarela_micatalogo';
    }
    else if (rawModo === 'pasarela' || rawModo === 'whatsapp') {
        modoEfectivo = rawModo;
    }
    else {
        throw new HttpsError('failed-precondition', 'La tienda debe elegir cómo cobra en Cuenta («Checkout · cómo cerrás ventas») antes de aceptar pagos OnePay.');
    }
    if (modoEfectivo === 'whatsapp') {
        throw new HttpsError('failed-precondition', 'Esta tienda no acepta OnePay en el checkout con la opción actual.');
    }
    let secretKey;
    let viaMicatalogo = false;
    if (modoEfectivo === 'pasarela_micatalogo') {
        if (platformSettings?.pasarelaMicatalogoActiva !== true) {
            throw new HttpsError('failed-precondition', 'La pasarela Mi Catálogo no está disponible. Elegí otro modo de venta o contactá soporte.');
        }
        const pc = await PLATFORM_ONEPAY_CRED_REF.get();
        const pdata = pc.data();
        const sk = pdata?.secretKey;
        const wv = pdata?.webhookSecret;
        if (!sk || !wv) {
            throw new HttpsError('failed-precondition', 'Pasarela Mi Catálogo incompleta (clave o webhook).');
        }
        secretKey = sk;
        viaMicatalogo = true;
    }
    else {
        if (tenant.onepayPaymentsEnabled !== true) {
            throw new HttpsError('failed-precondition', 'Esta tienda no acepta OnePay todavía.');
        }
        const credSnap = await db.doc(`mc_tenants/${tenantId}/private_onepay/credentials`).get();
        const creds = credSnap.data();
        const sk = creds?.secretKey;
        if (!sk || !creds?.webhookSecret) {
            throw new HttpsError('failed-precondition', 'Completá la clave API y el secreto del webhook en Cuenta.');
        }
        secretKey = sk;
    }
    const idemRef = db.doc(`mc_tenants/${tenantId}/onpay_idem/${idem}`);
    const idemExists = await idemRef.get();
    if (idemExists.exists) {
        const d = idemExists.data();
        if (d?.paymentLink && d?.orderId) {
            return {
                orderId: d.orderId,
                onepayViewToken: d.onepayViewToken,
                paymentLink: d.paymentLink,
                paymentId: d.paymentId,
            };
        }
        if (d?.orderId) {
            await db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${d.orderId}`).delete();
            await idemRef.delete();
        }
    }
    const lineasRes = [];
    for (const raw of lineas) {
        const productId = typeof raw?.productId === 'string' ? raw.productId.trim() : '';
        const cant = typeof raw?.cantidad === 'number' && raw.cantidad > 0 ? Math.floor(raw.cantidad) : 0;
        if (!productId || cant < 1) {
            throw new HttpsError('invalid-argument', 'Línea de carrito inválida.');
        }
        const varianteId = typeof raw?.varianteId === 'string' ? raw.varianteId.trim() : undefined;
        const tallaId = typeof raw?.tallaId === 'string' ? raw.tallaId.trim() : undefined;
        const comboColorSeleccion = Array.isArray(raw?.comboColorSeleccion)
            ? raw.comboColorSeleccion
                .map((x) => {
                if (!x || typeof x !== 'object')
                    return null;
                const o = x;
                const componenteIndex = typeof o.componenteIndex === 'number' ? Math.floor(o.componenteIndex) : -1;
                const slotIndex = typeof o.slotIndex === 'number' ? Math.floor(o.slotIndex) : -1;
                const vid = typeof o.varianteId === 'string' ? o.varianteId.trim() : '';
                if (componenteIndex < 0 || slotIndex < 0 || !vid)
                    return null;
                return {
                    componenteIndex,
                    slotIndex,
                    varianteId: vid,
                    ...(typeof o.varianteNombre === 'string' && o.varianteNombre.trim()
                        ? { varianteNombre: o.varianteNombre.trim().slice(0, 120) }
                        : {}),
                };
            })
                .filter((x) => x != null)
            : undefined;
        try {
            await validateCatalogLineStock(db, tenantId, { productId, cantidad: cant, varianteId, tallaId });
        }
        catch (e) {
            throw new HttpsError('failed-precondition', e instanceof Error ? e.message : 'Stock insuficiente.');
        }
        const pSnap = await db.doc(`mc_tenants/${tenantId}/productos/${productId}`).get();
        if (!pSnap.exists) {
            throw new HttpsError('invalid-argument', 'Producto no disponible.');
        }
        const p = pSnap.data();
        if (p.activo !== true || p.enCatalogo !== true) {
            throw new HttpsError('invalid-argument', 'Un producto no está a la venta.');
        }
        const precio = Math.round(productoPrecioVentaFromData(p));
        if (precio < 1) {
            throw new HttpsError('invalid-argument', 'Precio faltante en un producto.');
        }
        lineasRes.push({
            productId,
            nombre: (p.nombre ?? 'Producto').slice(0, 200),
            cantidad: cant,
            precioUnitarioCop: precio,
            ...(varianteId ? { varianteId } : {}),
            ...(tallaId ? { tallaId } : {}),
            ...(p.tipoProducto === 'combo' ? { esCombo: true } : {}),
            ...(comboColorSeleccion?.length ? { comboColorSeleccion } : {}),
            ...(p.tipoProducto !== 'combo' && p.precioCostoCop != null && p.precioCostoCop >= 0
                ? { costoUnitarioCop: Math.round(p.precioCostoCop) }
                : {}),
        });
    }
    const lineasEnriched = await enrichLineasWithComboCost(db, tenantId, lineasRes);
    lineasRes.length = 0;
    lineasRes.push(...lineasEnriched);
    const subtotalCop = lineasRes.reduce((s, l) => s + l.precioUnitarioCop * l.cantidad, 0);
    if (subtotalCop < 1) {
        throw new HttpsError('invalid-argument', 'Subtotal inválido.');
    }
    const totalPiezas = lineasRes.reduce((s, l) => {
        if (l.esCombo && l.componentesExpandidos?.length) {
            return s + l.componentesExpandidos.reduce((x, c) => x + c.cantidad, 0);
        }
        return s + l.cantidad;
    }, 0);
    const envioResolution = await resolveCheckoutEnvioCop({
        tenant,
        platform: platformSettings,
        enviaToken: enviaApiToken.value(),
        destinoDepartamento: envioDepartamento,
        destinoCiudad: envioCiudad,
        destinoDireccion: envioDireccion,
        destinoNombre: nombre,
        destinoTelefono: telefono,
        subtotalCop,
        totalPiezas,
    });
    const envioCop = envioResolution.envioCop;
    const cuponIn = typeof data.cuponCodigo === 'string' ? data.cuponCodigo : '';
    const cuponV = cuponIn.trim() ? buscarCuponActivo(cuponIn, tenant.cuponesCatalogo) : null;
    if (cuponIn.trim() && !cuponV) {
        throw new HttpsError('failed-precondition', 'Cupón no válido o inactivo.');
    }
    const descFinal = cuponV ? descuentoDesdeCupon(subtotalCop, cuponV) : 0;
    const totalFinal = totalCheckoutCop(subtotalCop, envioCop, descFinal);
    if (totalFinal < 1_000) {
        throw new HttpsError('invalid-argument', 'Monto mínimo de cobro no alcanzado.');
    }
    if (totalFinal > 80_000_000) {
        throw new HttpsError('invalid-argument', 'Monto fuera de rango permitido.');
    }
    const now = Date.now();
    const viewToken = newViewToken();
    const orderRef = db.collection(`mc_tenants/${tenantId}/ordenes_catalogo`).doc();
    const orderId = orderRef.id;
    const numeroReferencia = buildNumeroReferencia(orderId);
    const orderDoc = {
        createdAt: now,
        updatedAt: now,
        estado: 'esperando_pago',
        numeroReferencia,
        lineas: lineasRes,
        subtotalCop,
        envioCop,
        envioCotizacionFuente: envioResolution.fuente,
        descuentoCop: descFinal,
        totalCop: totalFinal,
        pagoSimulado: false,
        pagoOnePay: false,
        onepayViewToken: viewToken,
        onepayPaymentId: null,
        clienteNombre: nombre.slice(0, 200),
        clienteTelefono: telefono.slice(0, 50),
        clienteTipoDocumento,
        clienteDocumentoNumero,
    };
    if (viaMicatalogo) {
        orderDoc.onepayViaMicatalogo = true;
        orderDoc.micatalogoStoreId = tenantId;
    }
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new HttpsError('invalid-argument', 'Correo electrónico obligatorio y válido.');
    }
    orderDoc.clienteEmail = email.slice(0, 120);
    const nota = typeof data.nota === 'string' ? data.nota.trim() : '';
    if (nota)
        orderDoc.notaCliente = nota.slice(0, 2000);
    if (envioCiudad)
        orderDoc.envioCiudad = envioCiudad.slice(0, 120);
    if (envioDepartamento)
        orderDoc.envioDepartamento = envioDepartamento.slice(0, 120);
    if (envioDireccion)
        orderDoc.envioDireccion = envioDireccion.slice(0, 500);
    const eref = typeof data.envioReferencia === 'string' ? data.envioReferencia.trim() : '';
    if (eref)
        orderDoc.envioReferencia = eref.slice(0, 300);
    if (envioResolution.seleccionada) {
        orderDoc.envioCotizacionCarrier = envioResolution.seleccionada.carrier;
        orderDoc.envioCotizacionServicio = envioResolution.seleccionada.service;
        if (envioResolution.seleccionada.deliveryEstimate) {
            orderDoc.envioCotizacionEntrega = envioResolution.seleccionada.deliveryEstimate;
        }
    }
    if (cuponV)
        orderDoc.cuponCodigo = normalizeCuponCodigo(cuponV.codigo);
    const carritoIniciadoId = typeof data.carritoIniciadoId === 'string' ? data.carritoIniciadoId.trim().slice(0, 128) : '';
    if (carritoIniciadoId)
        orderDoc.carritoIniciadoId = carritoIniciadoId;
    const wishlistId = typeof data.wishlistId === 'string' ? data.wishlistId.trim().slice(0, 128) : '';
    const destinatarioNombre = typeof data.destinatarioNombre === 'string' ? data.destinatarioNombre.trim().slice(0, 80) : '';
    if (data.esRegalo === true && wishlistId) {
        orderDoc.esRegalo = true;
        orderDoc.wishlistId = wishlistId;
        if (destinatarioNombre)
            orderDoc.destinatarioNombre = destinatarioNombre;
        const giftNote = destinatarioNombre ? `Regalo para ${destinatarioNombre}` : 'Regalo (lista de deseos)';
        const prevNota = typeof orderDoc.notaCliente === 'string' ? orderDoc.notaCliente : '';
        orderDoc.notaCliente = prevNota ? `${giftNote}. ${prevNota}`.slice(0, 2000) : giftNote;
    }
    await orderRef.set(orderDoc);
    /** Límites del POST /v1/payments de OnePay (p. ej. reference ≤ 30). external_id conserva el id de orden. */
    const ONEPAY_REF_MAX = 30;
    const ONEPAY_TITLE_MAX = 60;
    const ONEPAY_EXTERNAL_ID_MAX = 64;
    const ONEPAY_REDIRECT_URL_MAX = 2000;
    const ONEPAY_IDEMPOTENCY_MAX = 64;
    const refStr = `mc-${orderId}`.slice(0, ONEPAY_REF_MAX);
    const title = `Pedido · ${(tenant.nombreTienda ?? 'Catálogo').trim()}`.slice(0, ONEPAY_TITLE_MAX);
    const returnUrl = buildStorePublicUrl(mcPublicOrigin.value(), slug, `/checkout/pago-validando?onepay=1&o=${encodeURIComponent(orderId)}&ov=${encodeURIComponent(viewToken)}`, { requestOrigin: redirectOrigin }).slice(0, ONEPAY_REDIRECT_URL_MAX);
    const onePayBody = {
        amount: totalFinal,
        currency: 'COP',
        title,
        reference: refStr,
        external_id: orderId.slice(0, ONEPAY_EXTERNAL_ID_MAX),
        redirect_url: returnUrl,
        allows: {
            cards: true,
            accounts: true,
            pse: true,
            /** Transferencia inmediata / medios adicionales según cuenta OnePay (opcional en API). */
            transfiya: true,
        },
        metadata: onepayMetadataForApi([
            { key: 'mi_catalogo_tenant', value: tenantId },
            { key: 'mi_catalogo_store_id', value: tenantId },
            { key: 'mi_catalogo_slug', value: slug.slice(0, 80) },
            { key: 'mi_catalogo_order_id', value: orderId },
            { key: 'cliente', value: nombre.trim().slice(0, 80) },
        ]),
    };
    const ph = formatCoPhone(telefono);
    if (ph)
        onePayBody.phone = ph;
    if (email && email.includes('@'))
        onePayBody.email = email.slice(0, 100);
    let res;
    try {
        res = await fetch(ONEPAY_API, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
                'x-idempotency': `chk-${idem}`.slice(0, ONEPAY_IDEMPOTENCY_MAX),
            },
            body: JSON.stringify(onePayBody),
        });
    }
    catch {
        await orderRef.delete();
        throw new HttpsError('unavailable', 'No se pudo contactar a OnePay.');
    }
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        await orderRef.delete();
        throw new HttpsError('internal', `OnePay respondió ${res.status}. Revisá la clave.`);
    }
    if (!res.ok) {
        await orderRef.delete();
        const msg = json.message || json.error || `HTTP ${res.status}`;
        throw new HttpsError('internal', msg);
    }
    const paymentLink = json.payment_link;
    const paymentId = json.id;
    if (!paymentLink || typeof paymentLink !== 'string' || !paymentId) {
        await orderRef.delete();
        throw new HttpsError('internal', 'OnePay no devolvió el link de pago.');
    }
    await orderRef.update({ onepayPaymentId: paymentId, updatedAt: Date.now() });
    await idemRef.set({
        orderId,
        onepayViewToken: viewToken,
        paymentId,
        paymentLink,
        createdAt: now,
    });
    return { orderId, onepayViewToken: viewToken, paymentLink, paymentId };
});
export const mcFulfillCatalogOrder = onCall({ invoker: 'public' }, async (request) => {
    const d = request.data;
    const tenantId = typeof d.tenantId === 'string' ? d.tenantId.trim() : '';
    const orderId = typeof d.orderId === 'string' ? d.orderId.trim() : '';
    if (!tenantId || !orderId) {
        throw new HttpsError('invalid-argument', 'Datos incompletos.');
    }
    const orderSnap = await db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderId}`).get();
    if (!orderSnap.exists) {
        throw new HttpsError('not-found', 'Pedido no encontrado.');
    }
    const order = orderSnap.data();
    const estadoOk = order.estado === 'pagado' ||
        order.estado === 'en_preparacion' ||
        order.estado === 'listo_envio';
    if (!estadoOk) {
        throw new HttpsError('failed-precondition', 'El pedido aún no está pagado.');
    }
    const ok = await fulfillCatalogOrderInventory(db, tenantId, orderId);
    return { ok };
});
export const mcOnepayCheckoutStatus = onCall({ invoker: 'public' }, async (request) => {
    const d = request.data;
    const slug = typeof d.slug === 'string' ? d.slug.trim().toLowerCase() : '';
    const orderId = typeof d.orderId === 'string' ? d.orderId.trim() : '';
    const token = typeof d.onepayViewToken === 'string' ? d.onepayViewToken.trim() : '';
    if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug) || !orderId || !token) {
        throw new HttpsError('invalid-argument', 'Datos incompletos.');
    }
    const slugSnap = await db.doc(`mc_slugs/${slug}`).get();
    if (!slugSnap.exists) {
        throw new HttpsError('not-found', 'Catálogo no encontrado.');
    }
    const tenantId = slugSnap.data().tenantId;
    const ref = db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderId}`);
    const oSnap = await ref.get();
    if (!oSnap.exists) {
        return { notFound: true };
    }
    const o = oSnap.data();
    if (o.onepayViewToken !== token) {
        throw new HttpsError('permission-denied', 'Enlace de consulta inválido.');
    }
    return {
        notFound: false,
        estado: o.estado,
        totalCop: o.totalCop,
        updatedAt: o.updatedAt,
        orderId,
    };
});
function mapOrderToTrackingPublic(orderSnap, nombreTienda) {
    const o = orderSnap.data();
    const lineas = Array.isArray(o.lineas)
        ? o.lineas.map((ln) => ({
            nombre: String(ln.nombre ?? 'Producto').slice(0, 200),
            cantidad: Math.max(1, Math.round(Number(ln.cantidad) || 1)),
            precioUnitarioCop: Math.max(0, Math.round(Number(ln.precioUnitarioCop) || 0)),
        }))
        : [];
    const numeroReferencia = typeof o.numeroReferencia === 'string' && o.numeroReferencia.trim()
        ? o.numeroReferencia.trim()
        : buildNumeroReferencia(orderSnap.id);
    return {
        orderId: orderSnap.id,
        numeroReferencia,
        estado: typeof o.estado === 'string' ? o.estado : 'pagado',
        totalCop: typeof o.totalCop === 'number' ? o.totalCop : 0,
        createdAt: typeof o.createdAt === 'number' ? o.createdAt : Date.now(),
        updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : Date.now(),
        nombreTienda,
        lineas,
        trackingImageUrl: typeof o.trackingImageUrl === 'string' ? o.trackingImageUrl : undefined,
        trackingNumber: typeof o.trackingNumber === 'string' ? o.trackingNumber : undefined,
        envioCiudad: typeof o.envioCiudad === 'string' ? o.envioCiudad : undefined,
        seguimientoCompraAt: o.seguimientoCompraAt,
        seguimientoPreparacionAt: o.seguimientoPreparacionAt,
        seguimientoDespachoAt: o.seguimientoDespachoAt,
        seguimientoEntregaAt: o.seguimientoEntregaAt,
    };
}
/** Seguimiento público: basta con el N.º de pedido del email (orderId). */
export const mcCatalogOrderTracking = onCall({ invoker: 'public' }, async (request) => {
    const d = request.data;
    const slug = typeof d.slug === 'string' ? d.slug.trim().toLowerCase() : '';
    const orderIdIn = typeof d.orderId === 'string' ? normalizeOrderIdInput(d.orderId) : '';
    if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) {
        throw new HttpsError('invalid-argument', 'Datos incompletos.');
    }
    if (!orderIdIn || orderIdIn.length > 128) {
        throw new HttpsError('invalid-argument', 'Indicá el número de pedido.');
    }
    const slugSnap = await db.doc(`mc_slugs/${slug}`).get();
    if (!slugSnap.exists) {
        throw new HttpsError('not-found', 'Catálogo no encontrado.');
    }
    const tenantId = slugSnap.data().tenantId;
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    const nombreTienda = typeof tenantSnap.data()?.nombreTienda === 'string'
        ? String(tenantSnap.data().nombreTienda).trim()
        : 'Tu tienda';
    const snap = await db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderIdIn}`).get();
    const orderSnap = snap.exists ? snap : null;
    if (!orderSnap || !orderSnap.exists) {
        return { notFound: true };
    }
    return {
        notFound: false,
        order: mapOrderToTrackingPublic(orderSnap, nombreTienda),
    };
});
// --- Webhook (una URL; ?k= ruta de tienda; secreto HMAC en privado)
const webhookApp = express();
webhookApp.disable('x-powered-by');
webhookApp.post('/', express.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}), async (req, res) => {
    res.set('content-type', 'text/plain; charset=utf-8');
    const k = req.query['k'];
    const routeKey = typeof k === 'string' && k.length >= 16 ? k : '';
    if (!routeKey) {
        res.status(400).send('missing k');
        return;
    }
    const rSnap = await db.doc(`mc_onpay_webhook_routes/${routeKey}`).get();
    if (!rSnap.exists) {
        res.status(404).send('tienda no encontrada');
        return;
    }
    const rData = rSnap.data();
    const isPlatform = rData?.platformPasarela === true;
    const routeTenantId = typeof rData.tenantId === 'string' && rData.tenantId ? rData.tenantId : null;
    if (!isPlatform && !routeTenantId) {
        res.status(404).send('tienda no encontrada');
        return;
    }
    const credRef = isPlatform
        ? PLATFORM_ONEPAY_CRED_REF
        : db.doc(`mc_tenants/${routeTenantId}/private_onepay/credentials`);
    const credS = await credRef.get();
    const credData = credS.data();
    const webhookSecret = credData?.webhookSecret;
    const webhookToken = credData?.webhookToken;
    const secretKey = credData?.secretKey;
    if ((!webhookSecret && !webhookToken) || !secretKey) {
        res.status(500).send('config incompleta');
        return;
    }
    const reqWithRaw = req;
    const rawBuf = reqWithRaw.rawBody && Buffer.isBuffer(reqWithRaw.rawBody) && reqWithRaw.rawBody.length > 0
        ? reqWithRaw.rawBody
        : null;
    if (!rawBuf) {
        console.error('[mcOnepayCatalogWebhook] req.rawBody ausente; la firma HMAC puede fallar');
        res.status(400).send('raw body faltante');
        return;
    }
    const rawStr = rawBuf.toString('utf8');
    let parsedBody;
    try {
        parsedBody = JSON.parse(rawStr);
    }
    catch {
        res.status(400).send('json');
        return;
    }
    const headersNorm = {};
    for (const [hk, hv] of Object.entries(req.headers)) {
        if (hv === undefined || hv === null)
            continue;
        headersNorm[hk.toLowerCase()] = Array.isArray(hv) ? String(hv[0]) : String(hv);
    }
    const auth = authenticateOnePayWebhook({
        rawBody: rawStr,
        parsedBody,
        webhookSecret: webhookSecret || '',
        webhookToken,
        headersNorm,
    });
    if (!auth.ok) {
        if (auth.reason === 'missing_config') {
            res.status(500).send('config incompleta');
            return;
        }
        res.status(401).send(auth.reason === 'invalid_token' ? 'token' : 'signature');
        return;
    }
    const envelope = normalizeOnePayWebhookEnvelope(parsedBody);
    const { eventType: eventName, paymentId: payIdFromEnvelope } = extractPaymentIdAndEvent(envelope);
    if (!eventName) {
        res.status(200).send('ok');
        return;
    }
    const isPaymentOrCharge = eventName.startsWith('payment.') || eventName.startsWith('charge.');
    if (!isPaymentOrCharge) {
        res.status(200).send('ok');
        return;
    }
    const payId = payIdFromEnvelope;
    if (typeof payId !== 'string' || !payId) {
        res.status(200).send('ok');
        return;
    }
    const triggersOrderUpdate = eventName === 'payment.approved' ||
        eventName === 'payment.rejected' ||
        eventName === 'payment.expired' ||
        eventName === 'payment.declined' ||
        eventName === 'payment.cancelled' ||
        eventName === 'payment.canceled' ||
        eventName === 'charge.succeeded' ||
        eventName === 'charge.paid' ||
        eventName === 'charge.declined' ||
        eventName === 'charge.failed' ||
        eventName === 'charge.refunded';
    if (!triggersOrderUpdate) {
        res.status(200).send('ok');
        return;
    }
    const evId = eventName.replace(/\./g, '_');
    const procRef = db.doc(`mc_onpay_event_log/${payId}__${evId}`);
    const pProc = await procRef.get();
    if (pProc.exists) {
        res.status(200).send('ok');
        return;
    }
    const wantsApprove = eventName === 'payment.approved' ||
        eventName === 'charge.succeeded' ||
        eventName === 'charge.paid';
    const wantsReject = eventName === 'payment.rejected' ||
        eventName === 'payment.expired' ||
        eventName === 'payment.declined' ||
        eventName === 'payment.cancelled' ||
        eventName === 'payment.canceled' ||
        eventName === 'charge.declined' ||
        eventName === 'charge.failed' ||
        eventName === 'charge.refunded';
    if (wantsApprove || wantsReject) {
        if (isPlatform && eventName.startsWith('charge.')) {
            const charge = await onepayGetCharge(payId, secretKey);
            if (charge && wantsApprove) {
                const billingResult = await mcBillingTryFinalizeFromChargeWebhook({
                    db,
                    chargeId: payId,
                    platformSk: secretKey,
                    chargeMeta: charge.metadata,
                    chargeDetails: charge,
                });
                if (billingResult === 'handled') {
                    await procRef.set({ at: Date.now(), event: eventName, billingCharge: true });
                    res.status(200).send('ok');
                    return;
                }
                if (billingResult === 'retry') {
                    console.warn('[mcOnepayCatalogWebhook] billing charge pending retry', {
                        chargeId: payId,
                        event: eventName,
                    });
                    res.status(503).send('billing retry');
                    return;
                }
            }
            await procRef.set({ at: Date.now(), event: eventName });
            res.status(200).send('ok');
            return;
        }
        const v = await onepayGetPayment(payId, secretKey);
        if (!v?.id) {
            await procRef.set({ at: Date.now(), event: eventName });
            res.status(200).send('ok');
            return;
        }
        const vRec = v;
        const fromMetaOrder = mcOrderIdFromOnePayMetadata(v.metadata);
        const orderId = onepayPickExternalId(vRec) ||
            (typeof v.external_id === 'string' && v.external_id ? v.external_id : '') ||
            fromMetaOrder ||
            null;
        if (!orderId) {
            await procRef.set({ at: Date.now(), event: eventName });
            res.status(200).send('ok');
            return;
        }
        const storeIdFromPayment = mcStoreIdFromOnePayMetadata(v.metadata);
        const storeId = isPlatform ? storeIdFromPayment : routeTenantId;
        if (!storeId) {
            await procRef.set({ at: Date.now(), event: eventName });
            res.status(200).send('ok');
            return;
        }
        if (!isPlatform && storeIdFromPayment && storeIdFromPayment !== routeTenantId) {
            await procRef.set({ at: Date.now(), event: eventName });
            res.status(200).send('ok');
            return;
        }
        const oref = db.doc(`mc_tenants/${storeId}/ordenes_catalogo/${orderId}`);
        const oSnap = await oref.get();
        if (!oSnap.exists) {
            await procRef.set({ at: Date.now(), event: eventName });
            res.status(200).send('ok');
            return;
        }
        const o = oSnap.data();
        const amt = Math.round(Number(v.amount) || 0);
        const totalOk = typeof o.totalCop === 'number' && amt === o.totalCop;
        const payRefOk = o.onepayPaymentId === v.id;
        if (!totalOk || !payRefOk || o.estado !== 'esperando_pago') {
            await procRef.set({ at: Date.now(), event: eventName });
            res.status(200).send('ok');
            return;
        }
        if (wantsApprove &&
            paymentIsApproved(v.status, v.partial_payment)) {
            const paidAt = Date.now();
            await oref.update({
                estado: 'pagado',
                pagoOnePay: true,
                onepayPaymentId: v.id,
                updatedAt: paidAt,
                seguimientoCompraAt: paidAt,
            });
            try {
                await fulfillCatalogOrderInventory(db, storeId, orderId);
            }
            catch (fulfillErr) {
                console.error('[webhook] fulfill inventario:', fulfillErr);
            }
            const oCarritoId = o.carritoIniciadoId;
            const oCupon = o.cuponCodigo;
            if (typeof oCarritoId === 'string' && oCarritoId.trim()) {
                try {
                    await markCarritoIniciadoAfterOrderPaid(db, storeId, oCarritoId.trim(), orderId, typeof oCupon === 'string' ? oCupon : undefined);
                }
                catch {
                    /* no bloquear webhook */
                }
            }
            const resendKey = readResendApiKey();
            const pendingOwner = typeof o.ventaNotificacionEmailSentAt !== 'number';
            const pendingCliente = typeof o.ventaClienteConfirmacionEmailSentAt !== 'number';
            const ce = typeof o.clienteEmail === 'string' ? o.clienteEmail.trim() : '';
            if (resendKey && (pendingOwner || pendingCliente)) {
                try {
                    const tenantSnap = await db.doc(`mc_tenants/${storeId}`).get();
                    const tdata = tenantSnap.data();
                    const ownerUid = typeof tdata?.ownerUid === 'string' ? tdata.ownerUid : '';
                    const nombreTienda = typeof tdata?.nombreTienda === 'string' && tdata.nombreTienda.trim()
                        ? tdata.nombreTienda.trim()
                        : 'Tu tienda';
                    const themeColors = resolveEmailCatalogThemeColors(tdata);
                    const origin = mcPublicOrigin.value().replace(/\/$/, '');
                    const slug = typeof tdata?.slug === 'string' && tdata.slug.trim() ? tdata.slug.trim().toLowerCase() : '';
                    const catalogUrl = slug ? buildStorePublicUrl(origin, slug) : origin;
                    const seguimientoUrl = slug && orderId
                        ? buildStorePublicUrl(origin, slug, `/seguimiento?o=${encodeURIComponent(orderId)}`)
                        : undefined;
                    let toEmail = '';
                    if (ownerUid) {
                        try {
                            const au = await getAuth().getUser(ownerUid);
                            toEmail = au.email?.trim() ?? '';
                        }
                        catch {
                            /* usuario inexistente */
                        }
                    }
                    const sale = catalogSaleOrderSliceFromData(o, isPlatform ? 'Pasarela Mi Catálogo' : 'Pago en línea');
                    const pedidosUrl = `${origin}/app/pedidos?o=${encodeURIComponent(orderId)}`;
                    const emailPatch = {};
                    if (pendingOwner && toEmail) {
                        const sent = await sendCatalogSalePaidEmail({
                            resendApiKey: resendKey,
                            from: MC_RESEND_FROM,
                            to: toEmail,
                            nombreTienda,
                            orderId,
                            themeColors,
                            pedidosUrl,
                            ...sale,
                        });
                        if (sent.ok) {
                            emailPatch.ventaNotificacionEmailSentAt = Date.now();
                        }
                        else {
                            console.error('[mcOnepayCatalogWebhook] Resend (dueño):', sent.error);
                        }
                    }
                    if (pendingCliente && ce) {
                        const sentCliente = await sendCatalogCustomerPurchaseConfirmationEmail({
                            resendApiKey: resendKey,
                            from: MC_RESEND_FROM,
                            to: ce,
                            nombreTienda,
                            orderId,
                            totalCop: sale.totalCop,
                            lineas: sale.lineas,
                            themeColors,
                            clienteNombre: sale.clienteNombre,
                            clienteTelefono: sale.clienteTelefono,
                            clienteEmail: sale.clienteEmail,
                            envioCiudad: sale.envioCiudad,
                            envioDireccion: sale.envioDireccion,
                            notaCliente: sale.notaCliente,
                            numeroReferencia: sale.numeroReferencia,
                            catalogUrl,
                            seguimientoUrl,
                        });
                        if (sentCliente.ok) {
                            emailPatch.ventaClienteConfirmacionEmailSentAt = Date.now();
                        }
                        else {
                            console.error('[mcOnepayCatalogWebhook] Resend (cliente):', sentCliente.error);
                        }
                    }
                    if (Object.keys(emailPatch).length > 0) {
                        await oref.update(emailPatch);
                    }
                }
                catch (e) {
                    console.error('[mcOnepayCatalogWebhook] email venta:', e);
                }
            }
        }
        else if (wantsReject) {
            await oref.update({ estado: 'cancelado', updatedAt: Date.now() });
        }
    }
    await procRef.set({ at: Date.now(), event: eventName });
    res.status(200).send('ok');
});
export const mcOnepayCatalogWebhook = onRequest({ cors: false, invoker: 'public', secrets: [resendApiKey] }, webhookApp);
export { mcRecordStoreAnalytics } from './storeAnalytics.js';
export { mcOnTenantCreatedNotify } from './newStoreRegistrationEmail.js';
export { mcTallerRegister, mcTallerSendReminders } from './tallerEmail.js';
export { mcTallerGetMeetLink } from './tallerGetMeetLink.js';
export { mcFinalizeNewStoreOnboarding } from './onboardingExpertReward.js';
export { mcQuoteEnvioCheckout } from './shipping/mcQuoteEnvioCheckout.js';
export { mcCatalogSharePreview } from './catalog/mcCatalogSharePreview.js';
export { mcCatalogOrdersByEmail } from './catalog/mcCatalogOrdersByEmail.js';
export { mcCatalogSubmitProductReview, mcCatalogModerateProductReview, } from './catalog/mcCatalogProductReviews.js';
export { mcCatalogWishlistUpsert, mcCatalogWishlistGet, mcCatalogWishlistRecordPurchase, } from './catalog/mcCatalogWishlist.js';
export { mcStartStoreImpersonation, mcStopStoreImpersonation } from './storeImpersonation.js';
export { mcCreateSalesRep, mcSetSalesRepActive } from './salesRep.js';
export { mcCreatePosVendor, mcSetPosVendorActive } from './posVendor.js';
export { mcUpdatePosVendor, mcResetPosVendorPassword } from './posVendorUpdate.js';
export { mcAdminCreateStore } from './adminCreateStore.js';
export { mcSeedPosDemoData } from './posDemoSeed.js';
export { mcSeedReportDemoData } from './reportDemoSeed.js';
export { mcCatalogPublish, mcCatalogUnpublish, mcBackfillCatalogPublishGrandfather, } from './catalogPublishHandlers.js';
export { mcChangeStoreSlug } from './storeIdentityHandlers.js';
export { mcLiveCreateSession, mcLiveUpdateProducts, mcLiveStartSession, mcLiveEndSession, mcLivePinProduct, mcLiveSendChat, mcLiveJoinViewer, mcLiveRecordPurchase, mcLiveMuxWebhook, mcLiveGetBrowserBroadcastConfig, mcLiveStartBrowserBroadcast, mcLiveStartBrowserBroadcastEgress, mcLiveHostDisconnect, } from './live/handlers.js';
export { mcCancelCatalogOrder } from './cancelCatalogOrder.js';
export { mcShowroomJoinWaitlist } from './showroom/handlers.js';
export { mcAddiLinkMerchant, mcAddiUnlinkMerchant, mcAddiSetEnabled, mcAddiStartCatalogCheckout, mcAddiCheckoutStatus, mcAddiCatalogWebhook, } from './addi/handlers.js';
export { mcBillingGetSdkContext, mcBillingEnsureCustomer, mcBillingAddCard, mcBillingAddNequi, mcBillingListNequiBanks, mcBillingValidateNequi, mcBillingCheckNequiReady, mcBillingCompleteActivation, mcBillingPaymentMethods, mcBillingGetSubscriptionState, mcBillingListPaymentHistoryCallable, mcBillingCancelAutoRenewCallable, mcBillingSetDefaultPaymentMethod, mcBillingValidateDiscountCode, mcBillingCron, };
