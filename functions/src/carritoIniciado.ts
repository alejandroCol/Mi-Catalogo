import type { Firestore } from 'firebase-admin/firestore'

type CarritoSnap = {
  estado?: string
  cuponCodigo?: string
  recordatorioEnviadoAt?: number
  sessionToken?: string
}

function normalizeCuponCodigo(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Tras pago confirmado: marca carrito como recuperado (cupón de recordatorio) o comprado.
 */
export async function markCarritoIniciadoAfterOrderPaid(
  db: Firestore,
  tenantId: string,
  carritoIniciadoId: string | undefined,
  orderId: string,
  cuponCodigo: string | undefined,
): Promise<void> {
  const carritoId = typeof carritoIniciadoId === 'string' ? carritoIniciadoId.trim() : ''
  if (!carritoId) return

  const ref = db.doc(`mc_tenants/${tenantId}/carritos_iniciados/${carritoId}`)
  const snap = await ref.get()
  if (!snap.exists) return

  const data = snap.data() as CarritoSnap
  if (data.estado !== 'activo') return

  const now = Date.now()
  const cuponKey = cuponCodigo ? normalizeCuponCodigo(cuponCodigo) : ''
  const cuponRecup =
    data.cuponCodigo &&
    cuponKey &&
    normalizeCuponCodigo(data.cuponCodigo) === cuponKey &&
    typeof data.recordatorioEnviadoAt === 'number'
  const esRecuperado = Boolean(cuponRecup)

  await ref.update({
    estado: esRecuperado ? 'recuperado' : 'comprado',
    ordenId: orderId,
    updatedAt: now,
    ...(esRecuperado ? { recuperadoAt: now } : {}),
  })
}
