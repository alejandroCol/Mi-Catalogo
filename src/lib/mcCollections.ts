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
