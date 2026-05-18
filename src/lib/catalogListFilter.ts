import { isProductNovedad } from '@/lib/catalogNovedad'
import type { McProducto } from '@/types/mc'

export type CatalogSortId = 'orden' | 'precio-asc' | 'precio-desc' | 'nombre-az' | 'nombre-za' | 'recientes'

export type CatalogListFilterState = {
  query: string
  sort: CatalogSortId
  onlyNovedades: boolean
  onlyInStock: boolean
  priceMin: string
  priceMax: string
}

export function getDefaultCatalogListFilter(): CatalogListFilterState {
  return {
    query: '',
    sort: 'orden',
    onlyNovedades: false,
    onlyInStock: false,
    priceMin: '',
    priceMax: '',
  }
}

const SORT_LABELS: Record<CatalogSortId, string> = {
  orden: 'Orden de la tienda',
  'precio-asc': 'Precio: menor a mayor',
  'precio-desc': 'Precio: mayor a menor',
  'nombre-az': 'Nombre A–Z',
  'nombre-za': 'Nombre Z–A',
  recientes: 'Más recientes',
}

export function catalogSortOptions(): { id: CatalogSortId; label: string }[] {
  return (Object.keys(SORT_LABELS) as CatalogSortId[]).map((id) => ({ id, label: SORT_LABELS[id] }))
}

function normalizeText(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function matchesQuery(p: McProducto, q: string): boolean {
  if (!q.trim()) return true
  const t = normalizeText(p.nombre)
  const words = normalizeText(q)
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return true
  return words.every((w) => t.includes(w))
}

function parsePriceInput(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number(t.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n)
}

function inPriceRange(p: McProducto, min: number | null, max: number | null): boolean {
  if (min != null && p.precioCop < min) return false
  if (max != null && p.precioCop > max) return false
  return true
}

function sortList(list: (McProducto & { id: string })[], sort: CatalogSortId): (McProducto & { id: string })[] {
  const copy = [...list]
  switch (sort) {
    case 'orden':
      return copy.sort((a, b) => a.orden - b.orden || b.createdAt - a.createdAt)
    case 'precio-asc':
      return copy.sort((a, b) => a.precioCop - b.precioCop || a.nombre.localeCompare(b.nombre))
    case 'precio-desc':
      return copy.sort((a, b) => b.precioCop - a.precioCop || a.nombre.localeCompare(b.nombre))
    case 'nombre-az':
      return copy.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    case 'nombre-za':
      return copy.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'))
    case 'recientes':
      return copy.sort((a, b) => b.createdAt - a.createdAt)
    default:
      return copy
  }
}

export function catalogListHasActiveFilters(f: CatalogListFilterState): boolean {
  if (f.query.trim() !== '') return true
  if (f.sort !== 'orden') return true
  if (f.onlyNovedades) return true
  if (f.onlyInStock) return true
  if (f.priceMin.trim() !== '' || f.priceMax.trim() !== '') return true
  return false
}

export function applyCatalogListFilters(
  rows: (McProducto & { id: string })[],
  f: CatalogListFilterState,
  now: number,
): (McProducto & { id: string })[] {
  const minP = parsePriceInput(f.priceMin)
  const maxP = parsePriceInput(f.priceMax)

  let out = rows.filter((p) => matchesQuery(p, f.query))
  if (f.onlyNovedades) {
    out = out.filter((p) => isProductNovedad(p, now))
  }
  if (f.onlyInStock) {
    out = out.filter((p) => p.stock > 0)
  }
  out = out.filter((p) => inPriceRange(p, minP, maxP))
  return sortList(out, f.sort)
}

export function priceRangeFromRows(rows: (McProducto & { id: string })[]): { min: number; max: number } {
  if (rows.length === 0) return { min: 0, max: 0 }
  let min = rows[0].precioCop
  let max = rows[0].precioCop
  for (const p of rows) {
    if (p.precioCop < min) min = p.precioCop
    if (p.precioCop > max) max = p.precioCop
  }
  return { min, max }
}
