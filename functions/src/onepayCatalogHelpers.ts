/**
 * Utilidades OnePay alineadas con Ticket Colombia / docs oficial.
 * @see https://docs.onepay.la/guides/implementar-webhooks
 */
import { createHmac, timingSafeEqual } from 'crypto'

export function normalizeOnePaySecretValue(value: string): string {
  let t = String(value || '').trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim()
  }
  return t.replace(/\r\n/g, '\n').trim()
}

/** Cabeceras donde OnePay puede enviar la firma HMAC. */
export function collectOnePaySignatureHeader(headersNorm: Record<string, string>): string {
  const keys = ['x-signature', 'x-onepay-signature', 'x-webhook-signature', 'onepay-signature']
  for (const k of keys) {
    const v = headersNorm[k]
    if (v && String(v).trim()) return String(v).trim()
  }
  return ''
}

export function onePayHmacHexMatchesBody(
  body: string,
  webhookSecret: string,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader || !webhookSecret || body.length === 0) return false
  let sigIn = String(signatureHeader).trim()
  const low = sigIn.toLowerCase()
  if (low.startsWith('sha256=')) {
    sigIn = sigIn.slice(7).trim()
  }
  const expectedBuf = createHmac('sha256', webhookSecret).update(body, 'utf8').digest()

  const sigHex = sigIn.replace(/^0x/i, '').toLowerCase()
  if (/^[0-9a-f]+$/.test(sigHex) && sigHex.length % 2 === 0) {
    try {
      const sigBuf = Buffer.from(sigHex, 'hex')
      if (sigBuf.length !== expectedBuf.length) return false
      return timingSafeEqual(sigBuf, expectedBuf)
    } catch {
      return false
    }
  }
  try {
    const sigBuf = Buffer.from(sigIn, 'base64')
    if (sigBuf.length === expectedBuf.length) {
      return timingSafeEqual(sigBuf, expectedBuf)
    }
  } catch {
    /* ignore */
  }
  return false
}

/**
 * OnePay (guía Node) puede firmar `JSON.stringify(req.body)`; Firebase expone rawBody.
 * Aceptamos si cualquiera de los dos coincide con el HMAC.
 */
export function verifyOnePayWebhookSignatureDetailed(
  rawBody: string,
  parsedBody: unknown,
  webhookSecret: string,
  signatureHeader: string | undefined,
): { ok: boolean } {
  if (!signatureHeader || !webhookSecret) {
    return { ok: false }
  }
  const parts: string[] = []
  if (parsedBody !== undefined && parsedBody !== null) {
    try {
      parts.push(JSON.stringify(parsedBody))
    } catch {
      /* ignore */
    }
  }
  if (rawBody?.length) parts.push(rawBody)
  const seen = new Set<string>()
  for (const body of parts) {
    if (!body || seen.has(body)) continue
    seen.add(body)
    if (onePayHmacHexMatchesBody(body, webhookSecret, signatureHeader)) {
      return { ok: true }
    }
  }
  return { ok: false }
}

export type OnePayWebhookEnvelope = {
  payment?: {
    id?: string
    status?: string
    amount?: number | string
    external_id?: string | null
    externalId?: string | null
    metadata?: unknown
    payment_method?: string
  }
  charge?: {
    id?: string
    status?: string
    amount?: number
    external_id?: string | null
    externalId?: string | null
    metadata?: unknown
    payment_method_type?: string
    payment_method_id?: string
    source?: { type?: string; id?: string }
  }
  event?: { type?: string }
}

export function normalizeOnePayWebhookEnvelope(body: unknown): OnePayWebhookEnvelope {
  if (!body || typeof body !== 'object') return {}
  const b = body as Record<string, unknown>
  if (b.payment || b.charge || b.event) {
    return {
      payment: b.payment as OnePayWebhookEnvelope['payment'],
      charge: b.charge as OnePayWebhookEnvelope['charge'],
      event: b.event as OnePayWebhookEnvelope['event'],
    }
  }
  const data = b.data
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    return {
      payment: d.payment as OnePayWebhookEnvelope['payment'],
      charge: d.charge as OnePayWebhookEnvelope['charge'],
      event: d.event as OnePayWebhookEnvelope['event'],
    }
  }
  return b as OnePayWebhookEnvelope
}

/** Metadata API: objeto cuyas claves apuntan a { key, value } (requisito OnePay). */
export function onepayMetadataForApi(
  pairs: Array<{ key: string; value: string }>,
): Record<string, { key: string; value: string }> {
  const out: Record<string, { key: string; value: string }> = {}
  for (const p of pairs) {
    const k = String(p.key || '').trim()
    if (!k) continue
    out[k] = { key: k, value: String(p.value ?? '') }
  }
  return out
}

function metaEntryValue(entry: unknown): string {
  if (entry === null || entry === undefined) return ''
  if (typeof entry === 'string' || typeof entry === 'number') return String(entry).trim()
  if (typeof entry === 'object' && !Array.isArray(entry)) {
    const o = entry as { value?: unknown; key?: string }
    if (o.value !== undefined && o.value !== null) return String(o.value).trim()
  }
  return ''
}

/** Resuelve orden Firestore desde metadata GET /payments o webhook (plano o formato API). */
export function mcOrderIdFromOnePayMetadata(meta: unknown): string {
  if (!meta) return ''
  if (Array.isArray(meta)) {
    for (const item of meta) {
      if (!item || typeof item !== 'object') continue
      const k = String((item as { key?: string }).key || '').toLowerCase()
      if (k === 'mi_catalogo_order_id' || k === 'micatalogoorderid') {
        return String((item as { value?: string }).value || '').trim()
      }
    }
    return ''
  }
  if (typeof meta !== 'object') return ''
  const m = meta as Record<string, unknown>
  const direct = metaEntryValue(m.mi_catalogo_order_id ?? m.miCatalogoOrderId)
  if (direct) return direct
  for (const v of Object.values(m)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue
    const inner = v as { key?: string; value?: unknown }
    const k = String(inner.key || '').toLowerCase()
    if (k === 'mi_catalogo_order_id' || k === 'micatalogoorderid') {
      return String(inner.value ?? '').trim()
    }
  }
  return ''
}

export function mcStoreIdFromOnePayMetadata(meta: unknown): string {
  if (!meta) return ''
  if (Array.isArray(meta)) {
    for (const item of meta) {
      if (!item || typeof item !== 'object') continue
      const k = String((item as { key?: string }).key || '').toLowerCase()
      if (k === 'mi_catalogo_store_id' || k === 'mi_catalogo_tenant') {
        return String((item as { value?: string }).value || '').trim()
      }
    }
    return ''
  }
  if (typeof meta !== 'object') return ''
  const m = meta as Record<string, unknown>
  const sid = m.mi_catalogo_store_id ?? m.mi_catalogo_tenant
  if (typeof sid === 'string' && sid.trim()) return sid.trim()
  for (const v of Object.values(m)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue
    const inner = v as { key?: string; value?: unknown }
    const k = String(inner.key || '').toLowerCase()
    if (k === 'mi_catalogo_store_id' || k === 'mi_catalogo_tenant') {
      return String(inner.value ?? '').trim()
    }
  }
  return ''
}

export function onepayPickExternalId(obj: Record<string, unknown> | null | undefined): string {
  if (!obj || typeof obj !== 'object') return ''
  const ex = obj.external_id ?? obj.externalId
  return String(ex ?? '').trim()
}

export function extractPaymentIdAndEvent(envelope: OnePayWebhookEnvelope): {
  eventType: string
  paymentId: string | null
} {
  const eventType = typeof envelope.event?.type === 'string' ? envelope.event.type : ''
  const pay = envelope.payment
  const ch = envelope.charge
  if (pay?.id) {
    return { eventType, paymentId: pay.id }
  }
  if (ch) {
    const srcType = String(ch.source?.type || '').toLowerCase()
    if (srcType === 'payment' && ch.source?.id) {
      return { eventType, paymentId: ch.source.id }
    }
    if (ch.id) return { eventType, paymentId: ch.id }
  }
  return { eventType, paymentId: null }
}
