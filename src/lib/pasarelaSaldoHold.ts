/** Tiempo que debe transcurrir desde el cobro antes de poder retirar el neto de una venta. */
export const PASARELA_SALDO_HOLD_MS = 24 * 60 * 60 * 1000

export const PASARELA_SALDO_HOLD_HOURS = PASARELA_SALDO_HOLD_MS / (60 * 60 * 1000)

export function pasarelaSaldoReleaseAtMs(paidAtMs: number): number {
  return paidAtMs + PASARELA_SALDO_HOLD_MS
}

export function pasarelaSaldoIsReleased(paidAtMs: number, nowMs = Date.now()): boolean {
  if (paidAtMs <= 0) return false
  return nowMs >= pasarelaSaldoReleaseAtMs(paidAtMs)
}

/** Texto corto para la UI: cuándo libera o cuánto falta. */
export function pasarelaSaldoReleaseLabel(paidAtMs: number, nowMs = Date.now()): string {
  if (paidAtMs <= 0) return 'Pendiente de confirmación'
  const releaseAt = pasarelaSaldoReleaseAtMs(paidAtMs)
  if (nowMs >= releaseAt) return 'Liberado'

  const diffMs = releaseAt - nowMs
  const diffHours = Math.ceil(diffMs / (60 * 60 * 1000))
  if (diffHours <= 1) return 'Libera en menos de 1 h'

  return `Libera en ${diffHours} h`
}
