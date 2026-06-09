/** Normaliza subscriptionEndsAt desde Firestore (number o Timestamp). */
export function subscriptionEndsAtMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => unknown }).toMillis === 'function'
  ) {
    const ms = (value as { toMillis: () => number }).toMillis()
    return typeof ms === 'number' && Number.isFinite(ms) ? ms : null
  }
  return null
}

export function isSubscriptionEndsAtActive(value: unknown, nowMs = Date.now()): boolean {
  const ms = subscriptionEndsAtMs(value)
  return ms !== null && ms > nowMs
}
