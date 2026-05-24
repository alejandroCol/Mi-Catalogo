export const MC = {
  users: 'mc_users',
  tenants: 'mc_tenants',
  slugs: 'mc_slugs',
  /** Doc `settings`: banderas públicas de la plataforma (ej. pasarela sin registro). */
  mcPlatform: 'mc_platform',
  mcPlatformSettingsDoc: 'settings',
  billingDiscountCodes: 'mc_billing_discount_codes',
} as const

export function mcProductosCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/productos` as const
}

export function mcPedidosCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/pedidos` as const
}

export function mcOrdenesCatalogoCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/ordenes_catalogo` as const
}

export function mcCarritosIniciadosCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/carritos_iniciados` as const
}

export function mcAnalyticsDailyCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/analytics_daily` as const
}

export function mcAnalyticsProductsCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/analytics_products` as const
}

export function mcAnalyticsProductDailyCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/analytics_product_daily` as const
}

export function mcAnalyticsProductDailyDocId(dateKey: string, productId: string) {
  return `${dateKey}__${productId}` as const
}

export function mcLegalAcceptanceDoc(tenantId: string, termsVersion: string) {
  return `mc_tenants/${tenantId}/legal_acceptances/${termsVersion}` as const
}

export function mcPasarelaRetirosCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/pasarela_retiros` as const
}
