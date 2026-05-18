import type { McProducto } from '@/types/mc'

/** Días desde alta en que un producto cuenta como novedad por fecha (si no tiene `marcarNovedad`). */
export const NOVEDAD_DIAS_RECENTE = 21

export function isProductNovedad(p: McProducto, nowMs: number = Date.now()): boolean {
  if (p.marcarNovedad === true) return true
  const t = typeof p.createdAt === 'number' && Number.isFinite(p.createdAt) ? p.createdAt : 0
  if (t <= 0) return false
  const umbral = nowMs - NOVEDAD_DIAS_RECENTE * 86_400_000
  return t >= umbral
}
