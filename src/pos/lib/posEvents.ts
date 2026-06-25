import type { McPosVentaPayload } from '@/pos/lib/posTypes'

const EVENT_NAME = 'mc:pos:venta'

export function emitMcPosVenta(payload: McPosVentaPayload) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }))
}

export function onMcPosVenta(handler: (payload: McPosVentaPayload) => void) {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<McPosVentaPayload>).detail
    if (detail) handler(detail)
  }
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}

export function ventaToPosPayload(
  venta: {
    id: string
    sedeNombre: string
    vendedorNombre: string
    lineas: { nombre: string; cantidad: number; subtotalCop: number }[]
    pagos: { metodo: string; monto: number }[]
    totalCop: number
    descuentoGlobalCop?: number
    motivoDescuentoGlobal?: string
    esCredito?: boolean
    createdAt: number
  },
  config?: import('@/types/mc').McPosSedeConfig,
): McPosVentaPayload {
  const metodoLabel: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    nequi: 'Nequi',
    credito: 'Crédito',
  }
  return {
    ticket: {
      sedeNombre: venta.sedeNombre,
      vendedorNombre: venta.vendedorNombre,
      ventaId: venta.id,
      fechaMs: venta.createdAt,
      lineas: venta.lineas.map((l) => ({
        descripcion: l.nombre,
        cantidad: l.cantidad,
        subtotal: l.subtotalCop,
      })),
      total: venta.totalCop,
      descuentoGlobal: venta.descuentoGlobalCop,
      motivoDescuentoGlobal: venta.motivoDescuentoGlobal,
      pagos: venta.pagos.map((p) => ({
        etiqueta: metodoLabel[p.metodo] ?? p.metodo,
        monto: p.monto,
      })),
      esCredito: venta.esCredito,
    },
    config,
  }
}
