export const MC_PROVEEDORES = 'mc_proveedores' as const
export const MC_MARKETPLACE_LISTINGS = 'mc_marketplace_listings' as const

export function mcProveedoresCollection() {
  return MC_PROVEEDORES
}

export function mcProveedorProductosCollection(proveedorId: string) {
  return `${MC_PROVEEDORES}/${proveedorId}/productos` as const
}

export function mcProveedorOrdenesCollection(proveedorId: string) {
  return `${MC_PROVEEDORES}/${proveedorId}/ordenes` as const
}

export function mcMarketplaceListingsCollection() {
  return MC_MARKETPLACE_LISTINGS
}

export function mcMarketplaceListingId(proveedorId: string, productoId: string) {
  return `${proveedorId}_${productoId}`
}

export function mcProveedorLinksCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/proveedor_links` as const
}
