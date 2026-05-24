/** Punto en curva cuadrática de Bézier (t ∈ [0, 1]). */
export function quadraticBezier(t: number, p0: number, p1: number, p2: number): number {
  const u = 1 - t
  return u * u * p0 + 2 * u * t * p1 + t * t * p2
}

/** Desaceleración suave al final del vuelo. */
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export const CART_FLY_DURATION_MS = 620
