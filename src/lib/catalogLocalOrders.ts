const PREFIX = 'mc_orders_'

export type LocalOrderRef = {
  orderId: string
  savedAt: number
}

export function ordersStorageKey(slug: string): string {
  return `${PREFIX}${slug.trim().toLowerCase()}`
}

export function loadLocalOrderIds(slug: string): string[] {
  try {
    const raw = localStorage.getItem(ordersStorageKey(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const ids: string[] = []
    for (const item of parsed) {
      if (typeof item === 'string' && item.trim()) {
        ids.push(item.trim())
      } else if (
        item &&
        typeof item === 'object' &&
        typeof (item as LocalOrderRef).orderId === 'string' &&
        (item as LocalOrderRef).orderId.trim()
      ) {
        ids.push((item as LocalOrderRef).orderId.trim())
      }
    }
    return [...new Set(ids)].slice(0, 30)
  } catch {
    return []
  }
}

export function rememberLocalOrderId(slug: string, orderId: string): void {
  const id = orderId.trim()
  if (!slug || !id) return
  try {
    const prev = loadLocalOrderIds(slug)
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, 30)
    localStorage.setItem(
      ordersStorageKey(slug),
      JSON.stringify(next.map((orderId) => ({ orderId, savedAt: Date.now() }) satisfies LocalOrderRef)),
    )
  } catch {
    /* ignore quota */
  }
}
