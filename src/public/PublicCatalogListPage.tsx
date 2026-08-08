import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  catalogListSearchParamsEqual,
  catalogListStateToSearchParams,
  parseCatalogListSearchParams,
} from '@/lib/catalogListUrlState'
import { applyStoreHomeSeo, clearStoreHomeSeo } from '@/lib/storePageSeo'
import { CatalogFavoriteButton } from '@/public/CatalogFavoriteButton'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { isProductNovedad, NOVEDAD_DIAS_RECENTE } from '@/lib/catalogNovedad'
import {
  applyCatalogListFilters,
  catalogListHasActiveFilters,
  getDefaultCatalogListFilter,
  priceRangeFromRows,
} from '@/lib/catalogListFilter'
import { resolvePublicCatalogTheme } from '@/lib/catalogTheme'
import { mcProductosCollection } from '@/lib/mcCollections'
import { usePublicCategorias } from '@/hooks/usePublicCategorias'
import {
  buildCategoryCountMap,
  categoriaSubtituloCatalogo,
  categoriaTituloCatalogo,
  categoriasPublicasVisibles,
  filtrarProductosPorCategoria,
} from '@/lib/catalogCategorias'
import {
  catalogDescuentosTabVisible,
  productoTieneDescuento,
  resolveCatalogDescuentosTabLabel,
} from '@/lib/productoDescuento'
import { productoStockEfectivo } from '@/lib/productoVariantes'
import type { ProductoLookup } from '@/lib/comboProducto'
import type { McCatalogThemePreset, McProducto } from '@/types/mc'
import { CatalogListToolbar } from '@/public/CatalogListToolbar'
import {
  CatalogCategoryHeader,
  CatalogCategoryMobileBar,
  CatalogCategorySidebar,
} from '@/public/CatalogCategorySidebar'
import { CatalogProductPrice, CatalogDiscountBadge } from '@/public/CatalogProductPrice'
import { CatalogViewTabs, type CatalogViewTab } from '@/public/CatalogViewTabs'
import { SeasonBannerHero } from '@/public/SeasonBannerHero'
import { usePublicStore } from '@/public/PublicStoreContext'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { isSeasonBannerActive, MC_CATALOGO_PRODUCTOS_ID } from '@/lib/seasonBanner'
import { ShowroomEntranceCard } from '@/public/showroom/ShowroomEntranceCard'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'

function CatalogIntro({ preset }: { preset: McCatalogThemePreset }) {
  if (preset === 'minimal') {
    return (
      <div className="mx-auto max-w-3xl sm:mx-0">
        <h1 className="mc-pc-display text-left text-3xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-4xl">
          Colección
        </h1>
      </div>
    )
  }
  if (preset === 'bold') {
    return (
      <div className="text-center">
        <h1 className="mc-pc-display text-3xl font-bold tracking-tight text-[var(--cat-text)] sm:text-4xl">
          ¡Mirá el catálogo!
        </h1>
      </div>
    )
  }
  if (preset === 'boutique') {
    return (
      <div className="text-center sm:text-left">
        <h1 className="mc-pc-display text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-3xl">
          Novedades
        </h1>
      </div>
    )
  }
  if (preset === 'ios') {
    return (
      <div className="mx-auto max-w-3xl sm:mx-0 sm:max-w-3xl">
        <h1 className="mc-pc-display text-center text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-left sm:text-3xl">
          Catálogo · moda
        </h1>
      </div>
    )
  }
  return null
}

function NovedadBadge({ className, floating }: { className?: string; floating?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded-sm border border-[color-mix(in_srgb,var(--cat-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_14%,var(--cat-surface)_86%)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-accent)] sm:text-[10px]',
        floating && 'shadow-sm',
        className,
      )}
    >
      Nuevo
    </span>
  )
}

function ReyProductCard({
  p,
  productPath,
  showNovedadBadge,
  layout,
  productsLookup,
}: {
  p: McProducto & { id: string }
  productPath: (productId: string) => string
  showNovedadBadge: boolean
  layout: { density: 'comfortable' | 'compact'; aspect: '4/5' | '3/4' }
  productsLookup?: ProductoLookup
}) {
  const img = p.imageUrl
  const { density, aspect } = layout
  const pad = density === 'compact' ? 'p-2.5 sm:p-3' : 'p-3.5 sm:p-4'
  const ar = aspect === '3/4' ? 'aspect-[3/4]' : 'aspect-[4/5]'

  return (
    <article
      className={clsx(
        'group mc-pc-rey-card flex h-full flex-col',
        density === 'compact' && 'rounded-2xl shadow-sm',
      )}
    >
      <div className={clsx('relative w-full overflow-hidden mc-pc-image-placeholder', ar)}>
        {showNovedadBadge && (
          <span className="absolute left-2.5 top-2.5 z-10 sm:left-3 sm:top-3">
            <NovedadBadge floating />
          </span>
        )}
        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col items-end gap-1.5 sm:right-3 sm:top-3">
          <CatalogFavoriteButton productId={p.id} size="sm" />
          <CatalogDiscountBadge product={p} floating />
        </div>
        {img ? (
          <Link
            to={productPath(p.id)}
            className="relative block h-full w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-inset mc-pc-ring-focus"
            aria-label={`Ver ${p.nombre}`}
          >
            <img
              src={img}
              alt={p.nombre}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 will-change-transform group-hover:scale-[1.03]"
            />
          </Link>
        ) : (
          <Link
            to={productPath(p.id)}
            className="flex h-full items-center justify-center text-xs mc-pc-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-inset mc-pc-ring-focus"
            aria-label={`Ver ${p.nombre}`}
          >
            Sin foto
          </Link>
        )}
      </div>
      <Link
        to={productPath(p.id)}
        className={clsx('flex flex-1 flex-col', pad)}
      >
        <h3
          className={clsx(
            'line-clamp-2 font-semibold leading-snug text-[var(--cat-text)]',
            density === 'compact' ? 'text-[13px] sm:text-sm' : 'text-[14px] sm:text-base',
          )}
        >
          {p.nombre}
        </h3>
        <CatalogProductPrice product={p} size="sm" showDesde className="mt-1.5" />
        <p className="mt-1 text-[10px] leading-relaxed mc-pc-muted sm:text-[11px]">
          {productoStockEfectivo(p, productsLookup) > 0
            ? `${productoStockEfectivo(p, productsLookup)} en stock`
            : 'Stock a consultar'}
        </p>
      </Link>
    </article>
  )
}

function ReyProductCardBold({
  p,
  productPath,
  showNovedadBadge,
  productsLookup,
}: {
  p: McProducto & { id: string }
  productPath: (productId: string) => string
  showNovedadBadge: boolean
  productsLookup?: ProductoLookup
}) {
  const img = p.imageUrl
  return (
    <article className="group mc-pc-rey-card overflow-hidden rounded-2xl">
      <div className="relative aspect-[5/3] w-full min-h-[200px] sm:aspect-[2/1] sm:min-h-0">
        {showNovedadBadge && (
          <span className="absolute left-4 top-4 z-10">
            <NovedadBadge floating />
          </span>
        )}
        <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
          <CatalogFavoriteButton productId={p.id} size="sm" />
          <CatalogDiscountBadge product={p} floating />
        </div>
        {img ? (
          <Link
            to={productPath(p.id)}
            className="relative block h-full w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-inset mc-pc-ring-focus"
            aria-label={`Ver ${p.nombre}`}
          >
            <img
              src={img}
              alt={p.nombre}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          </Link>
        ) : (
          <Link
            to={productPath(p.id)}
            className="flex h-full items-center justify-center text-sm mc-pc-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-inset mc-pc-ring-focus"
            aria-label={`Ver ${p.nombre}`}
          >
            Sin foto
          </Link>
        )}
      </div>
      <Link to={productPath(p.id)} className="block px-5 py-6 text-center sm:px-8 sm:py-8">
        <h3 className="mc-pc-display text-[1.35rem] font-semibold leading-tight text-[var(--cat-text)] sm:text-2xl">
          {p.nombre}
        </h3>
        <CatalogProductPrice product={p} size="md" showDesde className="mt-2 justify-center" />
        <p className="mt-2 text-sm mc-pc-muted">
          {productoStockEfectivo(p, productsLookup) > 0
            ? `Stock ${productoStockEfectivo(p, productsLookup)}`
            : 'Consultar stock'}
        </p>
      </Link>
    </article>
  )
}

function sectionHeading(preset: McCatalogThemePreset, key: 'novedades' | 'resto'): string | null {
  if (key === 'novedades') return 'Novedades'
  if (preset === 'bold') return 'Todo el catálogo'
  if (preset === 'boutique') return 'Colección'
  return null
}

export function PublicCatalogListPage() {
  const { slug, to, storePublicUrl } = usePublicStore()
  const { tenantId, tenant, loading, error } = useCatalogTenant()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<(McProducto & { id: string })[]>([])
  const { categorias: categoriasRaw } = usePublicCategorias(tenantId)
  const categoriasActivas = useMemo(
    () => categoriasPublicasVisibles(categoriasRaw),
    [categoriasRaw],
  )
  const initialUrl = useMemo(() => parseCatalogListSearchParams(searchParams), [])
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string | null>(
    () => initialUrl.selectedCategoriaId,
  )
  const [filter, setFilter] = useState(() => initialUrl.filter)
  const [viewTab, setViewTab] = useState<CatalogViewTab>(() => initialUrl.viewTab)
  const [novedadNow] = useState(() => Date.now())
  const [urlHydrated, setUrlHydrated] = useState(false)

  const preset = tenant ? resolvePublicCatalogTheme(tenant).preset : 'morning'

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) return
    const db = getDb()
    const q = query(
      collection(db, mcProductosCollection(tenantId)),
      where('activo', '==', true),
      where('enCatalogo', '==', true),
      orderBy('orden', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
  }, [tenantId])

  useEffect(() => {
    const parsed = parseCatalogListSearchParams(searchParams)
    setSelectedCategoriaId((prev) =>
      prev === parsed.selectedCategoriaId ? prev : parsed.selectedCategoriaId,
    )
    setViewTab((prev) => (prev === parsed.viewTab ? prev : parsed.viewTab))
    setFilter((prev) => {
      const n = parsed.filter
      if (
        prev.query === n.query &&
        prev.sort === n.sort &&
        prev.onlyNovedades === n.onlyNovedades &&
        prev.onlyInStock === n.onlyInStock &&
        prev.priceMin === n.priceMin &&
        prev.priceMax === n.priceMax
      ) {
        return prev
      }
      return n
    })
    setUrlHydrated(true)
  }, [searchParams])

  useEffect(() => {
    if (!urlHydrated) return
    const next = catalogListStateToSearchParams({
      filter,
      selectedCategoriaId,
      viewTab,
    })
    if (!catalogListSearchParamsEqual(next, searchParams)) {
      setSearchParams(next, { replace: true })
    }
  }, [filter, selectedCategoriaId, viewTab, urlHydrated, searchParams, setSearchParams])

  useEffect(() => {
    if (!tenant || !slug) return
    applyStoreHomeSeo({
      nombreTienda: tenant.nombreTienda,
      descripcion: tenant.storeAbout?.body,
      imageUrl: tenant.storeLogoUrl || rows[0]?.imageUrl,
      logoUrl: tenant.storeLogoUrl,
      canonicalUrl: storePublicUrl('/'),
    })
    return () => clearStoreHomeSeo()
  }, [
    tenant,
    slug,
    storePublicUrl,
    rows[0]?.imageUrl,
    tenant?.storeAbout?.body,
    tenant?.storeLogoUrl,
    tenant?.nombreTienda,
  ])

  const descuentos = useMemo(() => rows.filter((p) => productoTieneDescuento(p)), [rows])
  const productsLookup = useMemo(() => new Map(rows.map((p) => [p.id, p])), [rows])
  const descuentosTabLabel = tenant ? resolveCatalogDescuentosTabLabel(tenant) : 'Descuento'
  const showDescuentosTab = tenant ? catalogDescuentosTabVisible(tenant, descuentos.length) : false

  const showCategoriasSidebar = categoriasActivas.length > 0

  const categoryCounts = useMemo(
    () => buildCategoryCountMap(rows, categoriasActivas),
    [rows, categoriasActivas],
  )

  const scopedRows = useMemo(() => {
    const base = viewTab === 'descuentos' ? descuentos : rows
    return filtrarProductosPorCategoria(base, selectedCategoriaId, categoriasActivas)
  }, [viewTab, rows, descuentos, selectedCategoriaId, categoriasActivas])

  const { novedades, resto } = useMemo(() => {
    const n: (McProducto & { id: string })[] = []
    const r: (McProducto & { id: string })[] = []
    for (const p of scopedRows) {
      if (isProductNovedad(p, novedadNow)) n.push(p)
      else r.push(p)
    }
    return { novedades: n, resto: r }
  }, [scopedRows, novedadNow])

  const hasActiveFilters = useMemo(() => catalogListHasActiveFilters(filter), [filter])
  const catalogPriceRange = useMemo(() => priceRangeFromRows(scopedRows), [scopedRows])
  const filteredRows = useMemo(
    () => applyCatalogListFilters(scopedRows, filter, novedadNow),
    [scopedRows, filter, novedadNow],
  )

  if (!firebaseConfigured) {
    return (
      <p className="mx-auto max-w-md px-2 py-12 text-center text-sm leading-relaxed mc-pc-text">
        Configurá Firebase.
      </p>
    )
  }
  if (loading) {
    return <p className="text-center mc-pc-muted">Cargando…</p>
  }
  if (error || !tenant || !slug) {
    return <p className="text-center text-sm text-red-600">{error ?? 'No disponible'}</p>
  }

  const productPath = (productId: string) => to(`/p/${productId}`)

  function listFor(
    items: (McProducto & { id: string })[],
    novedadFor: (p: McProducto & { id: string }) => boolean,
  ): ReactNode {
    if (items.length === 0) return null
    if (preset === 'bold') {
      return (
        <div className="space-y-6 sm:space-y-8">
          {items.map((p) => (
            <ReyProductCardBold
              key={p.id}
              p={p}
              productPath={productPath}
              showNovedadBadge={novedadFor(p)}
              productsLookup={productsLookup}
            />
          ))}
        </div>
      )
    }
    if (preset === 'boutique') {
      return (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-5">
          {items.map((p) => (
            <ReyProductCard
              key={p.id}
              p={p}
              productPath={productPath}
              showNovedadBadge={novedadFor(p)}
              layout={{ density: 'compact', aspect: '3/4' }}
              productsLookup={productsLookup}
            />
          ))}
        </div>
      )
    }
    if (preset === 'minimal') {
      return (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-4">
          {items.map((p) => (
            <ReyProductCard
              key={p.id}
              p={p}
              productPath={productPath}
              showNovedadBadge={novedadFor(p)}
              layout={{ density: 'compact', aspect: '3/4' }}
              productsLookup={productsLookup}
            />
          ))}
        </div>
      )
    }
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6">
        {items.map((p) => (
          <ReyProductCard
            key={p.id}
            p={p}
            productPath={productPath}
            showNovedadBadge={novedadFor(p)}
            layout={{ density: 'comfortable', aspect: '4/5' }}
            productsLookup={productsLookup}
          />
        ))}
      </div>
    )
  }

  const showNovedadesBlock = viewTab === 'todos' && novedades.length > 0
  const novedadesHint = `Alta reciente o destacado por la tienda (últimos ${NOVEDAD_DIAS_RECENTE} días).`
  const descuentosHint = `Artículos con precio especial en ${descuentosTabLabel.toLowerCase()}.`
  const novedadBadgeFor = (p: McProducto & { id: string }) => isProductNovedad(p, novedadNow)
  const restoSectionTitle = sectionHeading(preset, 'resto')
  const noHeroBeforeSearch = preset === 'morning'
  const showSeasonHero = isSeasonBannerActive(tenant)
  const catalogTitle = categoriaTituloCatalogo(selectedCategoriaId, categoriasActivas)
  const catalogSubtitle = categoriaSubtituloCatalogo(
    scopedRows.length,
    tenant.nombreTienda,
    selectedCategoriaId,
    categoriasActivas,
  )

  const catalogMain = (
    <>
      <div className={clsx(!showSeasonHero && (noHeroBeforeSearch ? 'space-y-0' : 'space-y-3 sm:space-y-4'))}>
        {!showSeasonHero && !showCategoriasSidebar ? <CatalogIntro preset={preset} /> : null}
        {showCategoriasSidebar ? (
          <>
            <CatalogCategoryMobileBar
              categorias={categoriasActivas}
              selectedId={selectedCategoriaId}
              onSelect={setSelectedCategoriaId}
              counts={categoryCounts}
              showWithImages={tenant?.mostrarCategoriasConImagenes === true}
            />
            <CatalogCategoryHeader title={catalogTitle} subtitle={catalogSubtitle} />
          </>
        ) : null}
        <div id="mc-catalogo-busqueda" className="scroll-mt-20">
          {showDescuentosTab && !hasActiveFilters && (
            <div className="mb-4">
              <CatalogViewTabs
                active={viewTab}
                onChange={setViewTab}
                descuentosLabel={descuentosTabLabel}
                descuentosCount={descuentos.length}
              />
            </div>
          )}
          <CatalogListToolbar
            value={filter}
            onChange={setFilter}
            onReset={() => setFilter(getDefaultCatalogListFilter())}
            resultCount={filteredRows.length}
            totalInCatalog={scopedRows.length}
            hasActiveFilters={hasActiveFilters}
            catalogPriceMin={catalogPriceRange.min}
            catalogPriceMax={catalogPriceRange.max}
          />
        </div>
      </div>

      {hasActiveFilters ? (
        <section className="scroll-mt-4" aria-label="Resultados de búsqueda y filtros">
          <h2 className="mc-pc-display mb-4 text-lg font-semibold tracking-tight text-[var(--cat-text)] sm:mb-5 sm:text-xl">
            Resultados
          </h2>
          {filteredRows.length === 0 ? (
            <div className="mc-pc-rey-card flex flex-col items-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_28%,var(--cat-surface)_72%)] bg-[color-mix(in_srgb,var(--cat-bg)_45%,var(--cat-surface)_55%)] px-6 py-12 text-center sm:py-14">
              <p className="text-base font-medium text-[var(--cat-text)]">No encontramos productos con estos criterios</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--cat-muted)]">
                Probá otras palabras, ampliá el rango de precio o quitá un filtro.
              </p>
              <button
                type="button"
                onClick={() => setFilter(getDefaultCatalogListFilter())}
                className="mt-5 mc-pc-btn bg-[var(--cat-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)] transition hover:opacity-90"
              >
                Quitar todos los filtros
              </button>
            </div>
          ) : (
            listFor(filteredRows, novedadBadgeFor)
          )}
        </section>
      ) : viewTab === 'descuentos' ? (
        <section className="scroll-mt-4" aria-label={descuentosTabLabel}>
          <h2 className="mc-pc-display mb-2 text-lg font-medium tracking-tight mc-pc-text sm:text-xl">
            {descuentosTabLabel}
          </h2>
          <p className="mb-6 max-w-xl text-[13px] leading-relaxed mc-pc-muted sm:text-sm">{descuentosHint}</p>
          {filteredRows.length === 0 ? (
            <div className="mc-pc-rey-card flex flex-col items-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_28%,var(--cat-surface)_72%)] bg-[color-mix(in_srgb,var(--cat-bg)_45%,var(--cat-surface)_55%)] px-6 py-12 text-center sm:py-14">
              <p className="text-base font-medium text-[var(--cat-text)]">No hay ofertas con estos criterios</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--cat-muted)]">
                Probá quitar filtros o volvé a «Todos».
              </p>
            </div>
          ) : (
            listFor(filteredRows, productoTieneDescuento)
          )}
        </section>
      ) : (
        <>
          {showNovedadesBlock && (
            <section className="scroll-mt-4">
              <h2 className="mc-pc-display mb-2 text-lg font-medium tracking-tight mc-pc-text sm:text-xl">
                {sectionHeading(preset, 'novedades')}
              </h2>
              <p className="mb-6 max-w-xl text-[13px] leading-relaxed mc-pc-muted sm:text-sm">{novedadesHint}</p>
              {listFor(novedades, () => true)}
            </section>
          )}

          <section className="scroll-mt-4">
            {restoSectionTitle != null && preset !== 'minimal' && (
              <h2 className="mc-pc-display mb-6 text-lg font-medium tracking-tight mc-pc-text sm:text-xl">
                {restoSectionTitle}
              </h2>
            )}
            {restoSectionTitle != null && showNovedadesBlock && preset === 'minimal' && (
              <h2 className="mc-pc-display mb-4 text-left text-base font-medium tracking-tight mc-pc-text sm:text-lg">
                {restoSectionTitle}
              </h2>
            )}
            {listFor(showNovedadesBlock ? resto : scopedRows, () => false)}
            {scopedRows.length === 0 && <p className="text-sm mc-pc-muted">Aún no hay artículos en el catálogo.</p>}
            {showNovedadesBlock && resto.length === 0 && scopedRows.length > 0 && (
              <p className="text-sm mc-pc-muted">Todo el catálogo está en Novedades por ahora.</p>
            )}
          </section>
        </>
      )}
    </>
  )

  return (
    <div className={clsx(showSeasonHero && 'mc-catalog-list--season')}>
      {showSeasonHero ? <SeasonBannerHero tenant={tenant} /> : null}

      <div
        id={MC_CATALOGO_PRODUCTOS_ID}
        className={clsx(
          'scroll-mt-[calc(3.25rem+0.5rem)] sm:scroll-mt-[calc(3.75rem+0.75rem)]',
          showSeasonHero && 'pt-6 sm:pt-8',
        )}
      >
        <ShowroomEntranceCard tenant={tenant} />
        {showCategoriasSidebar ? (
          <div className="mc-cat-layout flex items-start gap-8 xl:gap-12">
            <CatalogCategorySidebar
              categorias={categoriasActivas}
              selectedId={selectedCategoriaId}
              onSelect={setSelectedCategoriaId}
              counts={categoryCounts}
              showWithImages={tenant?.mostrarCategoriasConImagenes === true}
            />
            <div className="min-w-0 flex-1 space-y-8 sm:space-y-10">{catalogMain}</div>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">{catalogMain}</div>
        )}
      </div>
    </div>
  )
}
