/** Casar webhook `charge.id` (intento) con el `id` del cobro que guardamos al crear el cargo. */
export function resolveBillingWebhookChargeMatch(params: {
  incomingIds: string[]
  storedIds: string[]
  lastProcessedChargeId?: string | null
  pendingChargeId?: string | null
}): 'handled' | 'apply' {
  const incoming = params.incomingIds.filter((id) => Boolean(id?.trim()))
  const stored = params.storedIds.filter((id) => Boolean(id?.trim()))
  const processed = params.lastProcessedChargeId?.trim() || ''
  const pending = params.pendingChargeId?.trim() || ''
  if (processed && incoming.includes(processed)) return 'handled'
  const overlaps = incoming.some((id) => stored.includes(id))
  if (processed && stored.includes(processed) && overlaps) return 'handled'
  if (overlaps) return 'apply'
  const stalePending = !pending || pending === processed
  if (processed && stalePending) return 'handled'
  return 'apply'
}
