import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import {
  INTERACTIVE_LANDING_LIMITS,
} from '@/lib/interactiveLanding'
import { productoPrecioVentaDesde } from '@/lib/productoDescuento'
import {
  isStudioImageSelectable,
  useStudioImageEligibility,
  type StudioImageEligibility,
} from '@/lib/studioProductImage'
import type { McProducto } from '@/types/mc'

type Props = {
  products: McProducto[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  loading?: boolean
}

function eligibilityLabel(state: StudioImageEligibility): string {
  if (state === 'pending') return 'Revisando foto…'
  if (state === 'studio') return 'Fondo de estudio'
  if (state === 'busy') return 'Foto de ambiente'
  if (state === 'none') return 'Sin foto'
  return 'No se pudo verificar'
}

function PickerRow({
  product,
  selected,
  full,
  onToggle,
}: {
  product: McProducto
  selected: boolean
  full: boolean
  onToggle: () => void
}) {
  const eligibility = useStudioImageEligibility(product.imageUrl)
  const selectable = isStudioImageSelectable(eligibility)
  const disabled = full || (!selected && !selectable) || eligibility === 'pending' || eligibility === 'none'

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={clsx(
          'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition',
          selected
            ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_8%,transparent)]'
            : 'border-[var(--cat-muted)]/20 bg-[var(--cat-surface)] hover:border-[var(--cat-muted)]/35',
          disabled && !selected && 'opacity-45',
        )}
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#111]">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              className="h-full w-full object-contain mix-blend-multiply"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.nombre}</p>
          <p className="text-xs text-[var(--cat-muted)]">
            {formatCop(productoPrecioVentaDesde(product))}
            {' · '}
            <span
              className={clsx(
                eligibility === 'studio' && 'text-emerald-700',
                eligibility === 'busy' && 'text-amber-800',
              )}
            >
              {eligibilityLabel(eligibility)}
            </span>
          </p>
        </div>
        <span
          className={clsx(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
            selected
              ? 'border-[var(--cat-accent)] bg-[var(--cat-accent)] text-[var(--cat-accent-text)]'
              : 'border-[var(--cat-muted)]/30 text-transparent',
          )}
        >
          ✓
        </span>
      </button>
    </li>
  )
}

export function InteractiveLandingProductPicker({
  products,
  selectedIds,
  onChange,
  loading,
}: Props) {
  const [search, setSearch] = useState('')
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = products.filter((p) => p.activo && p.enCatalogo && !p.esBorrador && p.imageUrl)
    if (!q) return list
    return list.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [products, search])

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
      return
    }
    if (selectedIds.length >= INTERACTIVE_LANDING_LIMITS.maxProducts) return
    onChange([...selectedIds, id])
  }

  function move(id: string, dir: -1 | 1) {
    const idx = selectedIds.indexOf(id)
    if (idx < 0) return
    const next = idx + dir
    if (next < 0 || next >= selectedIds.length) return
    const copy = [...selectedIds]
    const tmp = copy[idx]!
    copy[idx] = copy[next]!
    copy[next] = tmp
    onChange(copy)
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-[var(--cat-muted)]">
        Elegí {INTERACTIVE_LANDING_LIMITS.minProducts} a {INTERACTIVE_LANDING_LIMITS.maxProducts}{' '}
        productos con foto de estudio (fondo blanco o muy claro). Las fotos de ambiente se ven mal
        en el carrusel oscuro y no se pueden seleccionar.
      </p>

      {selectedIds.length > 0 ? (
        <ol className="space-y-2 rounded-xl border border-neutral-200/70 bg-white/70 p-3">
          {selectedIds.map((id, i) => {
            const p = byId.get(id)
            return (
              <li key={id} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--cat-text)] text-[11px] font-semibold text-[var(--cat-bg)]">
                  {i + 1}
                </span>
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#111]">
                  {p?.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply" />
                  ) : null}
                </div>
                <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--cat-text)]">
                  {p?.nombre ?? id}
                </p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] text-[var(--cat-muted)]"
                    onClick={() => move(id, -1)}
                    disabled={i === 0}
                    aria-label="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] text-[var(--cat-muted)]"
                    onClick={() => move(id, 1)}
                    disabled={i === selectedIds.length - 1}
                    aria-label="Bajar"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] text-red-600/80"
                    onClick={() => onChange(selectedIds.filter((x) => x !== id))}
                    aria-label="Quitar"
                  >
                    ✕
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar producto…"
        className="mc-input"
      />

      {loading ? (
        <p className="text-sm text-[var(--cat-muted)]">Cargando productos…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--cat-muted)]">No hay productos con foto en el catálogo.</p>
      ) : (
        <ul className="max-h-[min(42vh,22rem)] space-y-2 overflow-y-auto overscroll-contain pr-1">
          {filtered.map((p) => {
            const selected = selectedIds.includes(p.id)
            const full = !selected && selectedIds.length >= INTERACTIVE_LANDING_LIMITS.maxProducts
            return (
              <PickerRow
                key={p.id}
                product={p}
                selected={selected}
                full={full}
                onToggle={() => toggle(p.id)}
              />
            )
          })}
        </ul>
      )}

      <p className="text-xs text-[var(--cat-muted)]">
        {selectedIds.length} de {INTERACTIVE_LANDING_LIMITS.maxProducts} productos · mínimo{' '}
        {INTERACTIVE_LANDING_LIMITS.minProducts}
      </p>
    </div>
  )
}
