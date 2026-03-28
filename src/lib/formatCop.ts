export function formatCop(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

/** Entero con separadores de miles (es-CO), para inputs de precio al agregar artículos. */
export function formatIntegerEsCo(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ''
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)
}
