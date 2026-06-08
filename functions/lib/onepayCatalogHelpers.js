/**
 * Utilidades OnePay alineadas con Ticket Colombia / docs oficial.
 * @see https://docs.onepay.la/guides/implementar-webhooks
 */
import { createHmac, timingSafeEqual } from 'crypto';
export function normalizeOnePaySecretValue(value) {
    let t = String(value || '').trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        t = t.slice(1, -1).trim();
    }
    return t.replace(/\r\n/g, '\n').trim();
}
/** Cabeceras donde OnePay puede enviar la firma HMAC. */
export function collectOnePaySignatureHeader(headersNorm) {
    const keys = ['x-signature', 'x-onepay-signature', 'x-webhook-signature', 'onepay-signature'];
    for (const k of keys) {
        const v = headersNorm[k];
        if (v && String(v).trim())
            return String(v).trim();
    }
    return '';
}
/** Cabeceras útiles para depurar entregas sin firma válida. */
export function onePayWebhookInterestingHeaderKeys(headersNorm) {
    return Object.keys(headersNorm).filter((k) => /sig|signature|webhook|onepay|hmac|token|x-/i.test(k));
}
function looksLikeOnePayHmacSecret(value) {
    const v = value.trim();
    return (v.startsWith('whsec_') ||
        v.startsWith('wh_tok_') ||
        (v.length >= 16 && !v.startsWith('wh_hdr_')));
}
function looksLikeOnePayWebhookToken(value) {
    return value.trim().startsWith('wh_hdr_');
}
/**
 * Normaliza secret/token guardados (a veces se intercambian al copiar del panel).
 * whsec_/wh_tok_ → HMAC; wh_hdr_ → x-webhook-token.
 */
export function resolveOnePayWebhookCredentials(stored) {
    let hmacSecret = normalizeOnePaySecretValue(stored.webhookSecret || '');
    let headerToken = normalizeOnePaySecretValue(stored.webhookToken || '');
    if (looksLikeOnePayWebhookToken(hmacSecret) && !headerToken) {
        headerToken = hmacSecret;
        hmacSecret = '';
    }
    if (looksLikeOnePayHmacSecret(headerToken) && !hmacSecret) {
        hmacSecret = headerToken;
        headerToken = '';
    }
    return { hmacSecret, headerToken };
}
/**
 * Valida webhooks OnePay como Ticket Colombia:
 * 1) Con x-signature / x-onepay-signature: HMAC (whsec_/wh_tok_).
 * 2) Sin firma: x-webhook-token (wh_hdr_).
 */
export function authenticateOnePayWebhook(params) {
    const { hmacSecret, headerToken } = resolveOnePayWebhookCredentials({
        webhookSecret: params.webhookSecret,
        webhookToken: params.webhookToken,
    });
    const tok = normalizeOnePaySecretValue(params.headersNorm['x-webhook-token'] || params.headersNorm['x-onepay-token'] || '');
    const sig = collectOnePaySignatureHeader(params.headersNorm);
    const hasSig = Boolean(sig);
    if (hasSig) {
        if (!hmacSecret) {
            return { ok: false, reason: 'missing_config' };
        }
        if (verifyOnePayWebhookSignatureDetailed(params.rawBody, params.parsedBody, hmacSecret, sig).ok) {
            return { ok: true, via: 'hmac' };
        }
        if (headerToken && tok === headerToken) {
            console.warn('[mcOnepayCatalogWebhook] HMAC rechazado; aceptado por x-webhook-token (revisá que el secreto sea whsec_/wh_tok_, no wh_hdr_)');
            return { ok: true, via: 'token' };
        }
        console.error('[mcOnepayCatalogWebhook] firma HMAC rechazada', {
            rawBodyLength: params.rawBody.length,
            signatureHeaderLen: sig.length,
            interestingHeaders: onePayWebhookInterestingHeaderKeys(params.headersNorm),
            hasWebhookTokenConfigured: Boolean(headerToken),
            hint: 'El secreto del webhook debe ser whsec_… (panel OnePay al crear el webhook), no el valor del header x-onepay-signature.',
        });
        return { ok: false, reason: 'invalid_signature' };
    }
    if (!headerToken) {
        return { ok: false, reason: 'missing_config' };
    }
    if (tok !== headerToken) {
        console.error('[mcOnepayCatalogWebhook] Sin firma HMAC y token inválido', {
            headerTokenLen: tok.length,
            expectedTokenLen: headerToken.length,
        });
        return { ok: false, reason: 'invalid_token' };
    }
    console.warn('[mcOnepayCatalogWebhook] Aceptado solo con x-webhook-token (no vino firma HMAC)');
    return { ok: true, via: 'token' };
}
export function onePayHmacHexMatchesBody(body, webhookSecret, signatureHeader) {
    if (!signatureHeader || !webhookSecret || body.length === 0)
        return false;
    let sigIn = String(signatureHeader).trim();
    const low = sigIn.toLowerCase();
    if (low.startsWith('sha256=')) {
        sigIn = sigIn.slice(7).trim();
    }
    const expectedBuf = createHmac('sha256', webhookSecret).update(body, 'utf8').digest();
    const sigHex = sigIn.replace(/^0x/i, '').toLowerCase();
    if (/^[0-9a-f]+$/.test(sigHex) && sigHex.length % 2 === 0) {
        try {
            const sigBuf = Buffer.from(sigHex, 'hex');
            if (sigBuf.length !== expectedBuf.length)
                return false;
            return timingSafeEqual(sigBuf, expectedBuf);
        }
        catch {
            return false;
        }
    }
    try {
        const sigBuf = Buffer.from(sigIn, 'base64');
        if (sigBuf.length === expectedBuf.length) {
            return timingSafeEqual(sigBuf, expectedBuf);
        }
    }
    catch {
        /* ignore */
    }
    return false;
}
/**
 * OnePay firma el body crudo (docs) o `JSON.stringify(req.body)` (guía Node legacy).
 * Priorizamos rawBody; Firebase/Express deben exponer los bytes originales del POST.
 */
export function verifyOnePayWebhookSignatureDetailed(rawBody, parsedBody, webhookSecret, signatureHeader) {
    if (!signatureHeader || !webhookSecret) {
        return { ok: false };
    }
    const parts = [];
    if (rawBody?.length)
        parts.push(rawBody);
    if (parsedBody !== undefined && parsedBody !== null) {
        try {
            parts.push(JSON.stringify(parsedBody));
        }
        catch {
            /* ignore */
        }
    }
    const seen = new Set();
    for (const body of parts) {
        if (!body || seen.has(body))
            continue;
        seen.add(body);
        if (onePayHmacHexMatchesBody(body, webhookSecret, signatureHeader)) {
            return { ok: true };
        }
    }
    return { ok: false };
}
export function normalizeOnePayWebhookEnvelope(body) {
    if (!body || typeof body !== 'object')
        return {};
    const b = body;
    if (b.payment || b.charge || b.event) {
        return {
            payment: b.payment,
            charge: b.charge,
            event: b.event,
        };
    }
    const data = b.data;
    if (data && typeof data === 'object') {
        const d = data;
        return {
            payment: d.payment,
            charge: d.charge,
            event: d.event,
        };
    }
    return b;
}
/** Metadata API: objeto cuyas claves apuntan a { key, value } (requisito OnePay). */
export function onepayMetadataForApi(pairs) {
    const out = {};
    for (const p of pairs) {
        const k = String(p.key || '').trim();
        if (!k)
            continue;
        out[k] = { key: k, value: String(p.value ?? '') };
    }
    return out;
}
function metaEntryValue(entry) {
    if (entry === null || entry === undefined)
        return '';
    if (typeof entry === 'string' || typeof entry === 'number')
        return String(entry).trim();
    if (typeof entry === 'object' && !Array.isArray(entry)) {
        const o = entry;
        if (o.value !== undefined && o.value !== null)
            return String(o.value).trim();
    }
    return '';
}
/** Resuelve orden Firestore desde metadata GET /payments o webhook (plano o formato API). */
export function mcOrderIdFromOnePayMetadata(meta) {
    if (!meta)
        return '';
    if (Array.isArray(meta)) {
        for (const item of meta) {
            if (!item || typeof item !== 'object')
                continue;
            const k = String(item.key || '').toLowerCase();
            if (k === 'mi_catalogo_order_id' || k === 'micatalogoorderid') {
                return String(item.value || '').trim();
            }
        }
        return '';
    }
    if (typeof meta !== 'object')
        return '';
    const m = meta;
    const direct = metaEntryValue(m.mi_catalogo_order_id ?? m.miCatalogoOrderId);
    if (direct)
        return direct;
    for (const v of Object.values(m)) {
        if (!v || typeof v !== 'object' || Array.isArray(v))
            continue;
        const inner = v;
        const k = String(inner.key || '').toLowerCase();
        if (k === 'mi_catalogo_order_id' || k === 'micatalogoorderid') {
            return String(inner.value ?? '').trim();
        }
    }
    return '';
}
export function mcStoreIdFromOnePayMetadata(meta) {
    if (!meta)
        return '';
    if (Array.isArray(meta)) {
        for (const item of meta) {
            if (!item || typeof item !== 'object')
                continue;
            const k = String(item.key || '').toLowerCase();
            if (k === 'mi_catalogo_store_id' || k === 'mi_catalogo_tenant') {
                return String(item.value || '').trim();
            }
        }
        return '';
    }
    if (typeof meta !== 'object')
        return '';
    const m = meta;
    const sid = m.mi_catalogo_store_id ?? m.mi_catalogo_tenant;
    if (typeof sid === 'string' && sid.trim())
        return sid.trim();
    for (const v of Object.values(m)) {
        if (!v || typeof v !== 'object' || Array.isArray(v))
            continue;
        const inner = v;
        const k = String(inner.key || '').toLowerCase();
        if (k === 'mi_catalogo_store_id' || k === 'mi_catalogo_tenant') {
            return String(inner.value ?? '').trim();
        }
    }
    return '';
}
export function onepayPickExternalId(obj) {
    if (!obj || typeof obj !== 'object')
        return '';
    const ex = obj.external_id ?? obj.externalId;
    return String(ex ?? '').trim();
}
export function extractPaymentIdAndEvent(envelope) {
    const eventType = typeof envelope.event?.type === 'string' ? envelope.event.type : '';
    const pay = envelope.payment;
    const ch = envelope.charge;
    if (pay?.id) {
        return { eventType, paymentId: pay.id };
    }
    if (ch) {
        const srcType = String(ch.source?.type || '').toLowerCase();
        if (srcType === 'payment' && ch.source?.id) {
            return { eventType, paymentId: ch.source.id };
        }
        if (ch.id)
            return { eventType, paymentId: ch.id };
    }
    return { eventType, paymentId: null };
}
