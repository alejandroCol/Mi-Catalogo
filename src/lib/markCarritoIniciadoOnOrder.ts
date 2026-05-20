import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { normalizeCuponCodigo } from '@/lib/checkoutPricing'
import { carritoIniciadoDocPath } from '@/lib/carritoIniciado'
import { clearStoredCarritoIniciadoId } from '@/lib/carritoIniciadoSession'
import { getDb } from '@/lib/firebase'
import type { McCarritoIniciado } from '@/types/mc'

/**
 * Marca el carrito iniciado como comprado o recuperado tras completar checkout.
 * `recuperado` si el cupón coincide con el enviado en recordatorio de ese carrito.
 */
export async function markCarritoIniciadoOnOrderComplete(opts: {
  tenantId: string
  slug: string
  carritoIniciadoId: string | null | undefined
  orderId: string
  cuponCodigo?: string
}): Promise<void> {
  const { tenantId, slug, orderId, cuponCodigo } = opts
  let carritoId = opts.carritoIniciadoId?.trim() || null
  const cuponKey = cuponCodigo ? normalizeCuponCodigo(cuponCodigo) : ''

  if (!carritoId && !cuponKey) return

  if (!carritoId && cuponKey) {
    /* Sin id en URL: no hacemos query; el link de recuperación siempre incluye `r`. */
    return
  }

  if (!carritoId) return

  try {
    const ref = doc(getDb(), carritoIniciadoDocPath(tenantId, carritoId))
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const data = snap.data() as McCarritoIniciado
    if (data.estado !== 'activo') return

    const now = Date.now()
    const cuponRecup =
      data.cuponCodigo && cuponKey && normalizeCuponCodigo(data.cuponCodigo) === cuponKey
    const esRecuperado = Boolean(cuponRecup && data.recordatorioEnviadoAt)

    await updateDoc(ref, {
      estado: esRecuperado ? 'recuperado' : 'comprado',
      ordenId: orderId,
      updatedAt: now,
      ...(esRecuperado ? { recuperadoAt: now } : {}),
    })
    clearStoredCarritoIniciadoId(slug)
  } catch {
    /* no bloquear checkout */
  }
}
