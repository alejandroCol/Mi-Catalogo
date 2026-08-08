type McCupon = {
  codigo: string
  activo?: boolean
  tipo: 'porcentaje' | 'monto_fijo'
  valor: number
}

export function normalizeCuponCodigo(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function descuentoDesdeCupon(subtotalCop: number, cupon: McCupon): number {
  const sub = Math.max(0, Math.round(subtotalCop))
  if (sub <= 0) return 0
  if (cupon.tipo === 'porcentaje') {
    const p = Math.min(100, Math.max(0, cupon.valor))
    return Math.min(sub, Math.round((sub * p) / 100))
  }
  const fijo = Math.max(0, Math.round(cupon.valor))
  return Math.min(sub, fijo)
}

export function buscarCuponActivo(
  codigoIngresado: string,
  cupones: McCupon[] | undefined,
): McCupon | null {
  const key = normalizeCuponCodigo(codigoIngresado)
  if (!key || !cupones?.length) return null
  const found = cupones.find((c) => c.activo && normalizeCuponCodigo(c.codigo) === key)
  return found ?? null
}

export function totalCheckoutCop(subtotalCop: number, envioCop: number, descuentoCop: number): number {
  const s = Math.max(0, Math.round(subtotalCop))
  const e = Math.max(0, Math.round(envioCop))
  const d = Math.min(s, Math.max(0, Math.round(descuentoCop)))
  return Math.max(0, s - d + e)
}
