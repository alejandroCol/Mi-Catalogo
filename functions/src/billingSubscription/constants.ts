/** Suscripción SaaS Mi Catálogo (cargos OnePay plataforma, estilo subscription_v2). */

export const MC_BILLING_SUB_DOC = 'default'
export const MC_BILLING_SUB_COLLECTION = 'billingSubscription'
export const MC_BILLING_GRACE_DAYS = 7
export const MC_BILLING_GRACE_MS = MC_BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000

/** Metadata OnePay: propósito del cobro. */
export const MC_BILLING_PURPOSE = 'mc_billing_sub'

export const MC_BILLING_METADATA_KEYS = {
  purpose: 'mi_catalogo_billing_purpose',
  tenantId: 'mi_catalogo_billing_tenant_id',
  period: 'mi_catalogo_billing_period',
  periodKey: 'mi_catalogo_billing_period_key',
} as const

export type McBillingDebitMethod = 'card' | 'nequi'
