export const MC = {
  users: 'mc_users',
  tenants: 'mc_tenants',
  slugs: 'mc_slugs',
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
