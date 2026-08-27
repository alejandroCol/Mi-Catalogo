import type { McOrdenCatalogo } from '@/types/mc'

function paymentIdOf(
  orden: Pick<McOrdenCatalogo, 'onepayPaymentId'>,
): string {
  return typeof orden.onepayPaymentId === 'string' ? orden.onepayPaymentId.trim() : ''
}

export function ordenCatalogoTieneCobroOnePay(
  orden: Pick<McOrdenCatalogo, 'onepayPaymentId' | 'onepayRefundedAt'>,
): boolean {
  if (typeof orden.onepayRefundedAt === 'number') return false
  return paymentIdOf(orden).length > 0
}

export function ordenCatalogoPendienteReembolsoOnePay(
  orden: Pick<McOrdenCatalogo, 'pagoOnePay' | 'onepayPaymentId' | 'onepayRefundedAt'>,
): boolean {
  return orden.pagoOnePay === true && ordenCatalogoTieneCobroOnePay(orden)
}

export type OrdenCatalogoDevolucionEstado =
  | 'devuelto_onepay'
  | 'pendiente_onepay'
  | 'cobro_anulado'
  | 'sin_cobro'

export function ordenCatalogoDevolucionEstado(
  orden: Pick<McOrdenCatalogo, 'pagoOnePay' | 'onepayPaymentId' | 'onepayRefundedAt'>,
): OrdenCatalogoDevolucionEstado {
  if (typeof orden.onepayRefundedAt === 'number') return 'devuelto_onepay'
  if (orden.pagoOnePay === true && paymentIdOf(orden).length > 0) return 'pendiente_onepay'
  if (paymentIdOf(orden).length > 0) return 'cobro_anulado'
  return 'sin_cobro'
}

export function ordenCatalogoDevolucionEtiqueta(estado: OrdenCatalogoDevolucionEstado): string {
  if (estado === 'devuelto_onepay') return 'Devuelto en OnePay'
  if (estado === 'pendiente_onepay') return 'Pendiente devolver'
  if (estado === 'cobro_anulado') return 'Cobro anulado'
  return 'Sin cobro pasarela'
}
