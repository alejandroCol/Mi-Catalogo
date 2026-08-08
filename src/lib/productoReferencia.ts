/**
 * Referencia de producto de catálogo: nombre de la prenda + número secuencial.
 * Lógica pura (SRP) reutilizable en formularios, persistencia y WhatsApp.
 */

/** Próximo número de referencia (1-based) a partir del conteo actual de productos. */
export function nextProductoReferenciaNumero(productCount: number): number {
  return Math.max(1, Math.trunc(productCount) + 1)
}

/** Combina el nombre de la prenda y el número → referencia del producto. */
export function buildProductoReferencia(nombre: string, numero: number): string {
  const n = nombre.trim().replace(/\s+/g, ' ')
  if (!n) return ''
  const num = Math.max(1, Math.trunc(numero))
  return `${n} ${num}`
}

/** Extrae el número final de una referencia ("Camisa Oversize 12" → 12). */
export function parseProductoReferenciaNumero(referencia: string | undefined | null): number | null {
  if (!referencia?.trim()) return null
  const m = referencia.trim().match(/\s+(\d+)$/)
  if (!m?.[1]) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

/**
 * Vista previa / recálculo al renombrar.
 * Si ya hay referencia, preserva su número; si no, usa el siguiente del inventario.
 */
export function resolveProductoReferencia(
  nombre: string,
  opts: {
    referenciaActual?: string | null
    productCount?: number
  },
): string {
  const numeroExistente = parseProductoReferenciaNumero(opts.referenciaActual)
  if (numeroExistente != null) return buildProductoReferencia(nombre, numeroExistente)
  if (opts.productCount != null) {
    return buildProductoReferencia(nombre, nextProductoReferenciaNumero(opts.productCount))
  }
  return ''
}
