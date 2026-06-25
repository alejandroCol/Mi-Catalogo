export function mcPosSedesCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/pos_sedes` as const
}

export function mcPosProductosCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/pos_productos` as const
}

export function mcPosStockCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/pos_stock` as const
}

export function mcPosVentasCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/pos_ventas` as const
}

export function mcPosCajaDiariaCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/pos_caja_diaria` as const
}

export function mcPosTurnosCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/pos_turnos` as const
}

export function mcPosDevolucionesCollection(tenantId: string) {
  return `mc_tenants/${tenantId}/pos_devoluciones` as const
}

/** ID determinístico: `{sedeId}_{productoId}` o `{sedeId}_{productoId}_{varianteId}`. */
export function mcPosStockDocId(sedeId: string, productoId: string, varianteId?: string | null) {
  return varianteId ? `${sedeId}_${productoId}_${varianteId}` : `${sedeId}_${productoId}`
}

/** ID determinístico: `{sedeId}_{vendedorUid}_{YYYY-MM-DD}`. */
export function mcPosCajaDiariaDocId(sedeId: string, vendedorUid: string, fechaKey: string) {
  return `${sedeId}_${vendedorUid}_${fechaKey}` as const
}
