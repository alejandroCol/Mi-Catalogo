import type { McCatalogHeaderLayoutId, McTenant } from '@/types/mc'

export const CATALOG_HEADER_LAYOUT_DEFAULT: McCatalogHeaderLayoutId = 'brand-left'

export const CATALOG_HEADER_LAYOUT_OPTIONS: {
  id: McCatalogHeaderLayoutId
  title: string
  description: string
}[] = [
  {
    id: 'brand-left',
    title: 'Clásico',
    description: 'Logo y nombre a la izquierda, enlaces al centro e iconos a la derecha.',
  },
  {
    id: 'logo-center',
    title: 'Logo al centro',
    description: 'Secciones a la izquierda, marca centrada e iconos a la derecha.',
  },
]

export function isCatalogHeaderLayoutId(value: unknown): value is McCatalogHeaderLayoutId {
  return value === 'brand-left' || value === 'logo-center'
}

export function resolveCatalogHeaderLayout(
  tenant: McTenant | null | undefined,
): McCatalogHeaderLayoutId {
  const raw = tenant?.headerLayout
  return isCatalogHeaderLayoutId(raw) ? raw : CATALOG_HEADER_LAYOUT_DEFAULT
}

/** null = usar default y borrar el campo en Firestore. */
export function buildHeaderLayoutForSave(
  layout: McCatalogHeaderLayoutId,
): McCatalogHeaderLayoutId | null {
  if (!isCatalogHeaderLayoutId(layout) || layout === CATALOG_HEADER_LAYOUT_DEFAULT) {
    return null
  }
  return layout
}
