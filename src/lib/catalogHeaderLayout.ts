import type { McCatalogHeaderLayoutId, McCatalogHeaderLogoShape, McTenant } from '@/types/mc'

export const CATALOG_HEADER_LAYOUT_DEFAULT: McCatalogHeaderLayoutId = 'brand-left'
export const CATALOG_HEADER_LOGO_SHAPE_DEFAULT: McCatalogHeaderLogoShape = 'original'

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

export const CATALOG_HEADER_LOGO_SHAPE_OPTIONS: {
  id: McCatalogHeaderLogoShape
  title: string
  description: string
}[] = [
  {
    id: 'round',
    title: 'Redondo',
    description: 'Círculo, como en el estilo clásico. Ideal si tu logo es cuadrado.',
  },
  {
    id: 'original',
    title: 'Original',
    description: 'Respeta la forma de tu archivo. Ideal para logos horizontales.',
  },
]

export function isCatalogHeaderLayoutId(value: unknown): value is McCatalogHeaderLayoutId {
  return value === 'brand-left' || value === 'logo-center'
}

export function isCatalogHeaderLogoShape(value: unknown): value is McCatalogHeaderLogoShape {
  return value === 'round' || value === 'original'
}

export function resolveCatalogHeaderLayout(
  tenant: McTenant | null | undefined,
): McCatalogHeaderLayoutId {
  const raw = tenant?.headerLayout
  return isCatalogHeaderLayoutId(raw) ? raw : CATALOG_HEADER_LAYOUT_DEFAULT
}

export function resolveCatalogHeaderLogoShape(
  tenant: McTenant | null | undefined,
): McCatalogHeaderLogoShape {
  if (resolveCatalogHeaderLayout(tenant) !== 'logo-center') return CATALOG_HEADER_LOGO_SHAPE_DEFAULT
  const raw = tenant?.headerLogoShape
  return isCatalogHeaderLogoShape(raw) ? raw : CATALOG_HEADER_LOGO_SHAPE_DEFAULT
}

/** Clásico: logo siempre circular. Centro: `round` o `original`. */
export function catalogHeaderLogoIsRound(tenant: McTenant | null | undefined): boolean {
  if (resolveCatalogHeaderLayout(tenant) === 'brand-left') return true
  return resolveCatalogHeaderLogoShape(tenant) === 'round'
}

export function catalogHeaderCenterLogoClassName(
  shape: McCatalogHeaderLogoShape,
  large = false,
): string {
  if (shape === 'round') {
    return large
      ? 'h-11 w-11 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] object-cover shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:h-12 sm:w-12'
      : 'h-8 w-8 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] object-cover shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:h-9 sm:w-9'
  }
  return large
    ? 'h-10 w-auto max-w-[11rem] object-contain sm:h-12 sm:max-w-[14rem]'
    : 'h-7 w-auto max-w-[7.5rem] object-contain sm:h-8 sm:max-w-[9rem]'
}

export function catalogHeaderClassicLogoClassName(large = false): string {
  return large
    ? 'h-11 w-11 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] object-cover shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:h-12 sm:w-12'
    : 'h-8 w-8 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] object-cover shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:h-9 sm:w-9'
}

/** Ausente → mostrar el nombre. */
export function resolveHeaderShowStoreName(tenant: McTenant | null | undefined): boolean {
  return tenant?.headerShowStoreName !== false
}

/** Si no hay logo, el nombre siempre se muestra. */
export function catalogHeaderShowsStoreName(tenant: McTenant | null | undefined): boolean {
  if (!tenant?.storeLogoUrl) return true
  return resolveHeaderShowStoreName(tenant)
}

/** true (default) → borrar el campo; false → persistir. */
export function buildHeaderShowStoreNameForSave(show: boolean): false | null {
  return show ? null : false
}

export function catalogHeaderStoreLabel(tenant: McTenant | null | undefined): string {
  const name = tenant?.nombreTienda?.trim()
  return name || 'Catálogo'
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

/** null = no aplica fuera de logo al centro (se borra el campo). */
export function buildHeaderLogoShapeForSave(
  layout: McCatalogHeaderLayoutId,
  shape: McCatalogHeaderLogoShape,
): McCatalogHeaderLogoShape | null {
  if (layout !== 'logo-center') return null
  return isCatalogHeaderLogoShape(shape) ? shape : CATALOG_HEADER_LOGO_SHAPE_DEFAULT
}
