export const MC = {
  users: 'mc_users',
  tenants: 'mc_tenants',
  slugs: 'mc_slugs',
  /** Doc `settings`: banderas públicas de la plataforma (ej. pasarela sin registro). */
  mcPlatform: 'mc_platform',
  mcPlatformSettingsDoc: 'settings',
  billingDiscountCodes: 'mc_billing_discount_codes',
  tutorialSections: 'mc_tutorial_sections',
  salesVisits: 'mc_sales_visits',
  demoStores: 'mc_demo_stores',
  talleres: 'mc_talleres',
} as const

export function mcTallerRegistrationsCollection(slug: string) {
  return `${MC.talleres}/${slug}/registrations` as const
}

export function mcTutorialsCollection(sectionId: string) {
  return `${MC.tutorialSections}/${sectionId}/tutorials` as const
}

export function mcTutorialSectionsCollection() {
  return MC.tutorialSections
}

export function mcProductosCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/productos` as const
}

export function mcCategoriasCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/categorias` as const
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

export function mcLiveSessionsCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/live_sessions` as const
}

export function mcLiveSessionProductsCollection(tenantId: string, sessionId: string) {
  return `mc_tenants/${tenantId}/live_sessions/${sessionId}/session_products` as const
}

export function mcLiveChatCollection(tenantId: string, sessionId: string) {
  return `mc_tenants/${tenantId}/live_sessions/${sessionId}/chat` as const
}
