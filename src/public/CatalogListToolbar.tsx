import { useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import type { CatalogListFilterState, CatalogSortId } from '@/lib/catalogListFilter'
import { catalogSortOptions } from '@/lib/catalogListFilter'
import { formatCop } from '@/lib/formatCop'

type Props = {
  value: CatalogListFilterState
  onChange: (next: CatalogListFilterState) => void
  onReset: () => void
  resultCount: number
  totalInCatalog: number
  hasActiveFilters: boolean
  /** Para hint de rango (desde el catálogo completo) */
  catalogPriceMin: number
  catalogPriceMax: number
}

export function CatalogListToolbar({
  value,
  onChange,
  onReset,
  resultCount,
  totalInCatalog,
  hasActiveFilters,
  catalogPriceMin,
  catalogPriceMax,
}: Props) {
  const searchId = useId()
  const idDesk = useId()
  const idMob = useId()
  const [mobileOpen, setMobileOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const sortOptions = catalogSortOptions()

  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [mobileOpen])

  function patch<K extends keyof CatalogListFilterState>(k: K, v: CatalogListFilterState[K]) {
    onChange({ ...value, [k]: v })
  }

  return (
    <div className="space-y-4">
      <form
        role="search"
        className="relative"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <label htmlFor={searchId} className="sr-only">
          Buscar en el catálogo
        </label>
        <span
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--cat-muted)] sm:left-4"
          aria-hidden
        >
          <svg className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15z" />
          </svg>
        </span>
        <input
          ref={inputRef}
          id={searchId}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={value.query}
          onChange={(e) => patch('query', e.target.value)}
          placeholder="Buscar por nombre…"
          className="mc-pc-surface w-full rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_22%,var(--cat-surface)_78%)] py-2.5 pl-10 pr-10 text-sm text-[var(--cat-text)] shadow-sm outline-none ring-0 transition placeholder:text-[color-mix(in_srgb,var(--cat-muted)_75%,transparent)] focus:border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] focus:ring-2 focus:ring-[var(--cat-ring)] sm:py-3 sm:pl-12 sm:pr-12"
        />
        {value.query.trim() !== '' && (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--cat-muted)] transition hover:bg-[color-mix(in_srgb,var(--cat-text)_6%,var(--cat-surface)_94%)] hover:text-[var(--cat-text)]"
            onClick={() => {
              patch('query', '')
              inputRef.current?.focus()
            }}
            aria-label="Borrar búsqueda"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </form>

      <div className="hidden flex-wrap items-center justify-between gap-3 sm:flex">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cat-muted)]">Ordenar</span>
          <div className="relative min-w-[12rem] max-w-sm flex-1">
            <select
              className="mc-pc-surface w-full cursor-pointer appearance-none rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_20%,transparent)] py-2 pl-3.5 pr-9 text-sm font-medium text-[var(--cat-text)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--cat-text)_14%,transparent)] focus:border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--cat-ring)]"
              value={value.sort}
              onChange={(e) => patch('sort', e.target.value as CatalogSortId)}
              aria-label="Ordenar productos"
            >
              {sortOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--cat-muted)]" aria-hidden>
              ▼
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChips value={value} onChange={onChange} />
          <PriceFields
            compact
            idMin={`${idDesk}-pmin`}
            idMax={`${idDesk}-pmax`}
            value={value}
            onChange={onChange}
            catalogPriceMin={catalogPriceMin}
            catalogPriceMax={catalogPriceMax}
          />
        </div>
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="mc-pc-surface flex w-full items-center justify-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_20%,var(--cat-surface)_80%)] py-2.5 text-sm font-medium text-[var(--cat-text)] shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M6 12h12m-6 6h6" />
          </svg>
          Filtros y orden
          {hasActiveFilters && (
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--cat-accent)]" aria-label="Filtros activos" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] sm:hidden" role="dialog" aria-modal="true" aria-labelledby="mc-mobile-filters-title">
          <button type="button" className="mc-pc-modal-backdrop absolute inset-0" aria-label="Cerrar" onClick={() => setMobileOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl border border-[color-mix(in_srgb,var(--cat-muted)_12%,var(--cat-surface)_88%)] bg-[var(--cat-surface)] p-5 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="mc-mobile-filters-title" className="text-base font-semibold text-[var(--cat-text)]">
                Filtros y orden
              </h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border mc-pc-border p-2 text-[var(--cat-muted)]"
                aria-label="Cerrar"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="mb-3 text-sm text-[var(--cat-muted)]">Elegí cómo listar y acotar productos</p>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--cat-muted)]">Ordenar</label>
            <select
              className="mb-4 w-full rounded-xl border border-[color-mix(in_srgb,var(--cat-muted)_22%,var(--cat-surface)_78%)] bg-[var(--cat-surface)] py-2.5 pl-3 pr-8 text-sm text-[var(--cat-text)]"
              value={value.sort}
              onChange={(e) => patch('sort', e.target.value as CatalogSortId)}
            >
              {sortOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <FilterChips value={value} onChange={onChange} className="mb-4" />
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--cat-muted)]">
              Precio (COP)
            </p>
            <PriceFields
              idMin={`${idMob}-pmin`}
              idMax={`${idMob}-pmax`}
              value={value}
              onChange={onChange}
              catalogPriceMin={catalogPriceMin}
              catalogPriceMax={catalogPriceMax}
            />
            <button
              type="button"
              onClick={() => {
                onReset()
                setMobileOpen(false)
              }}
              className="mt-5 w-full rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_30%,var(--cat-surface)_70%)] py-2.5 text-sm font-medium text-[var(--cat-text)]"
            >
              Restablecer todo
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="mt-2 w-full mc-pc-btn bg-[var(--cat-accent)] py-2.5 text-sm font-semibold text-[var(--cat-accent-text)]"
            >
              Ver {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-2 sm:pt-0">
        <p className="text-sm tabular-nums text-[var(--cat-muted)]" aria-live="polite" aria-atomic>
          {hasActiveFilters ? (
            <>
              <span className="font-medium text-[var(--cat-text)]">{resultCount}</span>
              {resultCount === 1 ? ' resultado' : ' resultados'}
              {totalInCatalog > 0 && (
                <span className="ml-1 text-[12px]">
                  (de {totalInCatalog} {totalInCatalog === 1 ? 'artículo' : 'artículos'})
                </span>
              )}
            </>
          ) : totalInCatalog > 0 ? (
            <span>
              {totalInCatalog} {totalInCatalog === 1 ? 'artículo' : 'artículos'} en la tienda
            </span>
          ) : null}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-[var(--cat-text)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_45%,transparent)] underline-offset-4 transition hover:opacity-80"
          >
            Quitar filtros
          </button>
        )}
      </div>
    </div>
  )
}

function FilterChips({
  value,
  onChange,
  className,
}: {
  value: CatalogListFilterState
  onChange: (n: CatalogListFilterState) => void
  className?: string
}) {
  function patch<K extends keyof CatalogListFilterState>(k: K, v: CatalogListFilterState[K]) {
    onChange({ ...value, [k]: v })
  }

  const chip = (active: boolean) =>
    clsx(
      'inline-flex min-h-[40px] items-center justify-center rounded-full border px-3.5 text-[13px] font-medium transition',
      active
        ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,var(--cat-surface)_88%)] text-[var(--cat-text)]'
        : 'border-[color-mix(in_srgb,var(--cat-muted)_25%,var(--cat-surface)_75%)] bg-[var(--cat-surface)] text-[var(--cat-muted)] hover:border-[color-mix(in_srgb,var(--cat-text)_15%,var(--cat-surface)_85%)] hover:text-[var(--cat-text)]',
    )

  return (
    <div className={clsx('flex flex-wrap items-center gap-2', className)} role="group" aria-label="Filtros rápidos">
      <button
        type="button"
        className={chip(value.onlyNovedades)}
        aria-pressed={value.onlyNovedades}
        onClick={() => patch('onlyNovedades', !value.onlyNovedades)}
      >
        Novedades
      </button>
      <button
        type="button"
        className={chip(value.onlyInStock)}
        aria-pressed={value.onlyInStock}
        onClick={() => patch('onlyInStock', !value.onlyInStock)}
      >
        Con stock
      </button>
    </div>
  )
}

function PriceFields({
  value,
  onChange,
  catalogPriceMin,
  catalogPriceMax,
  compact,
  idMin,
  idMax,
}: {
  value: CatalogListFilterState
  onChange: (n: CatalogListFilterState) => void
  catalogPriceMin: number
  catalogPriceMax: number
  compact?: boolean
  idMin: string
  idMax: string
}) {
  const hint =
    catalogPriceMax > 0
      ? `Aprox. ${formatCop(catalogPriceMin)} – ${formatCop(catalogPriceMax)} en esta tienda`
      : 'Sin precios cargados aún'

  const minField = (
    <div className="min-w-0 flex-1 sm:w-28 sm:flex-initial">
      <label
        className="mb-0.5 block text-[9px] font-medium uppercase tracking-wider text-[var(--cat-muted)] sm:sr-only"
        htmlFor={idMin}
      >
        Mín.
      </label>
      <input
        id={idMin}
        inputMode="numeric"
        placeholder="Mín. COP"
        className="mc-pc-surface w-full min-w-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_22%,var(--cat-surface)_78%)] px-3 py-1.5 text-sm text-[var(--cat-text)] placeholder:text-[color-mix(in_srgb,var(--cat-muted)_65%,transparent)]"
        value={value.priceMin}
        onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
        aria-label="Precio mínimo en pesos"
      />
    </div>
  )

  const maxField = (
    <div className="min-w-0 flex-1 sm:w-28 sm:flex-initial">
      <label
        className="mb-0.5 block text-[9px] font-medium uppercase tracking-wider text-[var(--cat-muted)] sm:sr-only"
        htmlFor={idMax}
      >
        Máx.
      </label>
      <input
        id={idMax}
        inputMode="numeric"
        placeholder="Máx. COP"
        className="mc-pc-surface w-full min-w-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_22%,var(--cat-surface)_78%)] px-3 py-1.5 text-sm text-[var(--cat-text)] placeholder:text-[color-mix(in_srgb,var(--cat-muted)_65%,transparent)]"
        value={value.priceMax}
        onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
        aria-label="Precio máximo en pesos"
      />
    </div>
  )

  if (compact) {
    return (
      <div className="flex max-w-md min-w-0 flex-wrap items-end gap-2 sm:max-w-none sm:w-auto">
        {minField}
        <span className="hidden self-end pb-2 text-[var(--cat-muted)] sm:inline" aria-hidden>
          —
        </span>
        {maxField}
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex w-full items-end gap-2">
        {minField}
        {maxField}
      </div>
      <p className="text-[10px] leading-relaxed text-[var(--cat-muted)]">{hint}</p>
    </div>
  )
}
