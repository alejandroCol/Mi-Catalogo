import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  collectOnePaySignatureHeader,
  extractPaymentIdAndEvent,
  normalizeOnePayWebhookEnvelope,
} from '../lib/onepayCatalogHelpers.js'
import { readBillingMeta } from '../lib/billingSubscription/onepayBillingApi.js'
import { resolveBillingWebhookChargeMatch } from '../lib/billingSubscription/webhookMatch.js'
import { MC_BILLING_METADATA_KEYS, MC_BILLING_PURPOSE } from '../lib/billingSubscription/constants.js'

describe('OnePay webhook envelope', () => {
  it('lee el header Signature que documenta OnePay', () => {
    const sig = collectOnePaySignatureHeader({ signature: 'abc123' })
    assert.equal(sig, 'abc123')
  })

  it('acepta event.type objeto + charge.id (intento)', () => {
    const env = normalizeOnePayWebhookEnvelope({
      event: { type: 'charge.paid' },
      charge: {
        id: 'attempt-1',
        status: 'paid',
        external_id: 'mcb_tenant1_init-monthly',
        source: { type: 'Payment', id: 'payment-should-not-win' },
      },
    })
    const parsed = extractPaymentIdAndEvent(env)
    assert.equal(parsed.eventType, 'charge.paid')
    assert.equal(parsed.paymentId, 'attempt-1')
  })

  it('acepta event string + data plano (formato de ejemplos OnePay)', () => {
    const env = normalizeOnePayWebhookEnvelope({
      event: 'charge.paid',
      data: {
        id: 'attempt-2',
        status: 'paid',
        payment_method_type: 'Nequi',
        external_id: 'mcb_tenant1_init-monthly',
      },
    })
    const parsed = extractPaymentIdAndEvent(env)
    assert.equal(parsed.eventType, 'charge.paid')
    assert.equal(parsed.paymentId, 'attempt-2')
    assert.equal(env.charge?.id, 'attempt-2')
  })
})

describe('billing webhook charge id match', () => {
  it('no casa intento vs cobro en el matcher viejo (repro del bug)', () => {
    const cobroId = 'cobro-aaa'
    const attemptId = 'intento-bbb'
    const chargeMatchesOld = cobroId === attemptId
    assert.equal(chargeMatchesOld, false)
  })

  it('casa el intento del webhook con el cobro guardado', () => {
    const decision = resolveBillingWebhookChargeMatch({
      incomingIds: ['intento-bbb'],
      storedIds: ['cobro-aaa', 'intento-bbb'],
      lastProcessedChargeId: null,
      pendingChargeId: 'cobro-aaa',
    })
    assert.equal(decision, 'apply')
  })

  it('aplica renovación cuando el intento no está guardado pero hay pending nuevo', () => {
    const decision = resolveBillingWebhookChargeMatch({
      incomingIds: ['intento-nuevo'],
      storedIds: ['cobro-nuevo', 'cobro-viejo'],
      lastProcessedChargeId: 'cobro-viejo',
      pendingChargeId: 'cobro-nuevo',
    })
    assert.equal(decision, 'apply')
  })

  it('no vuelve a aplicar un cargo ya procesado (replay intento vs cobro)', () => {
    const decision = resolveBillingWebhookChargeMatch({
      incomingIds: ['intento-viejo'],
      storedIds: ['cobro-viejo'],
      lastProcessedChargeId: 'cobro-viejo',
      pendingChargeId: 'cobro-viejo',
    })
    assert.equal(decision, 'handled')
  })
})

describe('billing metadata', () => {
  it('lee tenant desde metadata anidada { value }', () => {
    const tenant = readBillingMeta(
      { [MC_BILLING_METADATA_KEYS.tenantId]: { key: MC_BILLING_METADATA_KEYS.tenantId, value: 'tienda-1' } },
      MC_BILLING_METADATA_KEYS.tenantId,
    )
    assert.equal(tenant, 'tienda-1')
    const purpose = readBillingMeta(
      [{ key: MC_BILLING_METADATA_KEYS.purpose, value: MC_BILLING_PURPOSE }],
      MC_BILLING_METADATA_KEYS.purpose,
    )
    assert.equal(purpose, MC_BILLING_PURPOSE)
  })
})
