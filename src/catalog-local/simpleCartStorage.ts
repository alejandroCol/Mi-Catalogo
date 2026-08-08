import { cartLineKey } from '@/catalog-local/cartLineKey'
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
  const key = cartLineKey(line)
  const idx = lines.findIndex((l) => cartLineKey(l) === key)
  if (idx === -1) return [...lines, line]
  const next = [...lines]
  const cur = next[idx]!
  next[idx] = {
    ...cur,
    cantidad: cur.cantidad + line.cantidad,
    ...(line.precioUnitarioCop != null ? { precioUnitarioCop: line.precioUnitarioCop } : {}),
    ...(line.imageUrl && !cur.imageUrl ? { imageUrl: line.imageUrl } : {}),
    ...(line.referencia?.trim() && !cur.referencia?.trim()
      ? { referencia: line.referencia.trim() }
      : {}),
  }
  return next
}

export function setSimpleLineQty(
  lines: LineaCarritoSimple[],
  productId: string,
  cantidad: number,
  varianteId?: string,
  tallaId?: string,
): LineaCarritoSimple[] {
  const key = cartLineKey({ productId, varianteId, tallaId })
  if (cantidad <= 0) return lines.filter((l) => cartLineKey(l) !== key)
  return lines.map((l) => (cartLineKey(l) === key ? { ...l, cantidad } : l))
}

export function clearSimpleCart(storageKey: string) {
  localStorage.removeItem(storageKey)
}
