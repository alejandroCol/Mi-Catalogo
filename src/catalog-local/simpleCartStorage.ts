import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'

export function loadSimpleCart(storageKey: string): LineaCarritoSimple[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LineaCarritoSimple[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSimpleCart(storageKey: string, lines: LineaCarritoSimple[]) {
  localStorage.setItem(storageKey, JSON.stringify(lines))
}

export function addOrMergeSimpleLine(
  lines: LineaCarritoSimple[],
  line: LineaCarritoSimple,
): LineaCarritoSimple[] {
  const idx = lines.findIndex((l) => l.productId === line.productId)
  if (idx === -1) return [...lines, line]
  const next = [...lines]
  const cur = next[idx]!
  next[idx] = { ...cur, cantidad: cur.cantidad + line.cantidad }
  return next
}

export function setSimpleLineQty(
  lines: LineaCarritoSimple[],
  productId: string,
  cantidad: number,
): LineaCarritoSimple[] {
  if (cantidad <= 0) return lines.filter((l) => l.productId !== productId)
  return lines.map((l) => (l.productId === productId ? { ...l, cantidad } : l))
}

export function clearSimpleCart(storageKey: string) {
  localStorage.removeItem(storageKey)
}
