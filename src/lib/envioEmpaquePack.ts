/** Empaque resultante / unidad de cotización (cm, kg). */
export type EmpaqueDims = {
  pesoKg: number
  largoCm: number
  anchoCm: number
  altoCm: number
}

/** En ropa, la medida mínima del producto cubre hasta 4 prendas. */
export const ROPA_UNIDADES_POR_EMPAQUE = 4

export type EmpaqueLineaPack = {
  cantidad: number
  /** Ropa (no calzado): comprime hasta `ROPA_UNIDADES_POR_EMPAQUE` por caja. */
  comprimeRopa: boolean
  medidas?: EmpaqueDims | null
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function clampEmpaqueDims(d: EmpaqueDims): EmpaqueDims {
  return {
    pesoKg: Math.min(30, Math.max(0.1, round1(d.pesoKg))),
    largoCm: Math.min(200, Math.max(1, Math.round(d.largoCm))),
    anchoCm: Math.min(200, Math.max(1, Math.round(d.anchoCm))),
    altoCm: Math.min(200, Math.max(1, Math.round(d.altoCm))),
  }
}

function positiveNum(raw: unknown): number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0
}

export function parseEmpaqueDims(raw: unknown): EmpaqueDims | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const pesoKg = positiveNum(o.pesoKg)
  const largoCm = positiveNum(o.largoCm)
  const anchoCm = positiveNum(o.anchoCm)
  const altoCm = positiveNum(o.altoCm)
  if (!pesoKg || !largoCm || !anchoCm || !altoCm) return null
  return clampEmpaqueDims({ pesoKg, largoCm, anchoCm, altoCm })
}

export function productoComprimeRopaEnvio(
  product: { esRopa?: boolean; tallaModo?: string } | null | undefined,
): boolean {
  return product?.esRopa === true && product.tallaModo !== 'zapatos'
}

function cajasDeLinea(line: EmpaqueLineaPack, fallback: EmpaqueDims): EmpaqueDims[] {
  const unit = line.medidas ?? fallback
  const qty = Math.max(0, Math.round(line.cantidad))
  if (qty <= 0) return []

  if (line.comprimeRopa) {
    const cajas: EmpaqueDims[] = []
    let restante = qty
    while (restante > 0) {
      const enCaja = Math.min(ROPA_UNIDADES_POR_EMPAQUE, restante)
      cajas.push({ ...unit, pesoKg: unit.pesoKg * enCaja })
      restante -= enCaja
    }
    return cajas
  }

  return Array.from({ length: qty }, () => ({ ...unit }))
}

/**
 * Une cajas del carrito en un cubo aproximado para Envia:
 * peso = suma; largo/ancho = máximos; alto = volumen / (largo × ancho).
 */
export function packEnvioEmpaque(lines: EmpaqueLineaPack[], fallback: EmpaqueDims): EmpaqueDims {
  const cajas = lines.flatMap((l) => cajasDeLinea(l, fallback))
  if (cajas.length === 0) return clampEmpaqueDims(fallback)
  if (cajas.length === 1) return clampEmpaqueDims(cajas[0]!)

  const pesoKg = cajas.reduce((s, b) => s + b.pesoKg, 0)
  const volumen = cajas.reduce((s, b) => s + b.largoCm * b.anchoCm * b.altoCm, 0)
  const largoCm = Math.max(...cajas.map((b) => b.largoCm))
  const anchoCm = Math.max(...cajas.map((b) => b.anchoCm))
  const altoMin = Math.max(...cajas.map((b) => b.altoCm))
  const area = Math.max(1, largoCm * anchoCm)
  const altoCm = Math.max(altoMin, Math.ceil(volumen / area))

  return clampEmpaqueDims({ pesoKg, largoCm, anchoCm, altoCm })
}
