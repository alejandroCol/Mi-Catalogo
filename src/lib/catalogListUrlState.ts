import type { CatalogListFilterState, CatalogSortId } from '@/lib/catalogListFilter'
import { getDefaultCatalogListFilter } from '@/lib/catalogListFilter'
import type { CatalogViewTab } from '@/public/CatalogViewTabs'

const SORT_IDS: CatalogSortId[] = [
  'orden',
  'precio-asc',
  'precio-desc',
  'nombre-az',
  'nombre-za',
  'recientes',
]

export type CatalogListUrlState = {
  filter: CatalogListFilterState
  selectedCategoriaId: string | null
  viewTab: CatalogViewTab
}

export function parseCatalogListSearchParams(params: URLSearchParams): CatalogListUrlState {
  const defaults = getDefaultCatalogListFilter()
  const q = params.get('q') ?? ''
  const sortRaw = params.get('sort') ?? ''
  const sort = (SORT_IDS as string[]).includes(sortRaw) ? (sortRaw as CatalogSortId) : defaults.sort
  const cat = params.get('cat')?.trim() || null
  const tab = params.get('tab') === 'descuentos' ? 'descuentos' : 'todos'
  const min = params.get('min') ?? ''
  const max = params.get('max') ?? ''
  const onlyInStock = params.get('stock') === '1'
  const onlyNovedades = params.get('nov') === '1'

  return {
    selectedCategoriaId: cat,
    viewTab: tab,
    filter: {
      query: q,
      sort,
      onlyNovedades,
      onlyInStock,
      priceMin: min,
      priceMax: max,
    },
  }
}

/** Escribe solo params no-default para URLs limpias. */
export function catalogListStateToSearchParams(state: CatalogListUrlState): URLSearchParams {
  const defaults = getDefaultCatalogListFilter()
  const p = new URLSearchParams()
  if (state.selectedCategoriaId) p.set('cat', state.selectedCategoriaId)
  if (state.viewTab === 'descuentos') p.set('tab', 'descuentos')
  if (state.filter.query.trim()) p.set('q', state.filter.query.trim())
  if (state.filter.sort !== defaults.sort) p.set('sort', state.filter.sort)
  if (state.filter.priceMin.trim()) p.set('min', state.filter.priceMin.trim())
  if (state.filter.priceMax.trim()) p.set('max', state.filter.priceMax.trim())
  if (state.filter.onlyInStock) p.set('stock', '1')
  if (state.filter.onlyNovedades) p.set('nov', '1')
  return p
}

export function catalogListSearchParamsEqual(a: URLSearchParams, b: URLSearchParams): boolean {
  return a.toString() === b.toString()
}
