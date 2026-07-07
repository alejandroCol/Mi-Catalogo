import { doc, updateDoc } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosVentasCollection } from '@/lib/mcPosCollections'
import { isVentaPendienteCobro } from '@/pos/lib/posVentaUtils'
import type { McPosLineaPago, McPosMetodoPago, McPosVenta } from '@/types/mc'

const METODOS_COBRO: McPosMetodoPago[] = ['efectivo', 'transferencia', 'nequi']

export function metodoPagoCobroValido(metodo: McPosMetodoPago): boolean {
  return METODOS_COBRO.includes(metodo)
}

export async function completarPagoPosVenta(
  tenantId: string,
  venta: McPosVenta & { id: string },
  metodo: McPosMetodoPago,
  cobradorUid: string,
  cobradorNombre: string,
): Promise<void> {
  if (!isVentaPendienteCobro(venta)) {
    throw new Error('Esta venta no está pendiente de cobro.')
  }
  if (!metodoPagoCobroValido(metodo)) {
    throw new Error('Método de pago no válido para completar el cobro.')
  }

  const pago: McPosLineaPago = { metodo, monto: venta.totalCop }
  const now = Date.now()
  const db = getDb()

  await updateDoc(doc(db, mcPosVentasCollection(tenantId), venta.id), {
    pagos: [pago],
    estadoPago: 'pagado',
    pagadoAt: now,
    cobradoPorUid: cobradorUid,
    cobradoPorNombre: cobradorNombre,
  })
}
