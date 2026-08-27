import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

export type McCancelCatalogOrderResult = {
  ok: true
  orderId: string
  estado: 'cancelado'
  refundKind: 'full_refund' | 'unpaid_cancelled' | 'already_refunded' | 'test_skipped' | null
  restocked: boolean
}

function callableErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object') {
    const fe = e as { message?: string }
    if (typeof fe.message === 'string' && fe.message.trim()) return fe.message.trim()
  }
  return fallback
}

export async function cancelCatalogOrder(orderId: string): Promise<McCancelCatalogOrderResult> {
  try {
    const fn = httpsCallable<{ orderId: string }, McCancelCatalogOrderResult>(
      getFirebaseFunctions(),
      'mcCancelCatalogOrder',
    )
    const res = await fn({ orderId })
    return res.data
  } catch (e) {
    throw new Error(callableErrorMessage(e, 'No se pudo cancelar la venta ni devolver el pago.'))
  }
}
