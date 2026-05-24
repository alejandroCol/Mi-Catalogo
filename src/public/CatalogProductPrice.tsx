import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import {
  productoPorcentajeDescuentoMax,
  productoPrecioListaDesde,
  productoPrecioVentaDesde,
  productoTieneDescuento,
} from '@/lib/productoDescuento'
import type { McProducto } from '@/types/mc'

type Size = 'sm' | 'md' | 'lg'

export function CatalogProductPrice({
  product,
  size = 'sm',
  showDesde,
  className,
}: {
  product: McProducto
  size?: Size
  /** Muestra «Desde» cuando hay variantes con precios distintos. */
  showDesde?: boolean
  className?: string
}) {
  const enOferta = productoTieneDescuento(product)
  const lista = productoPrecioListaDesde(product)
  const venta = productoPrecioVentaDesde(product)
  const pct = productoPorcentajeDescuentoMax(product)
  const tieneVariantes = (product.variantes ?? []).some((v) => v.nombre?.trim())

  const priceCls = clsx(
    'font-semibold tabular-nums text-[var(--cat-text)]',
    size === 'sm' && 'text-sm sm:text-[15px]',
    size === 'md' && 'text-lg sm:text-xl',
    size === 'lg' && 'text-2xl sm:text-3xl',
    enOferta && 'text-[var(--cat-accent)]',
  )

  const oldCls = clsx(
    'font-medium tabular-nums text-[var(--cat-muted)] line-through decoration-[color-mix(in_srgb,var(--cat-muted)_55%,transparent)]',
    size === 'sm' && 'text-[11px] sm:text-xs',
    size === 'md' && 'text-sm',
    size === 'lg' && 'text-base sm:text-lg',
  )

  const prefix = showDesde && tieneVariantes ? 'Desde ' : ''

  if (!enOferta) {
    return (
      <p className={clsx(priceCls, className)}>
        {prefix}
        {formatCop(lista)}
      </p>
    )
  }

  return (
    <div className={clsx('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <p className={priceCls}>
        {prefix}
        {formatCop(venta)}
      </p>
      <p className={oldCls}>{formatCop(lista)}</p>
      {pct != null && size !== 'lg' && (
        <span className="inline-flex shrink-0 items-center rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm sm:text-[11px]">
          −{pct}%
        </span>
      )}
    </div>
  )
}

export function CatalogDiscountBadge({
  product,
  className,
  floating,
}: {
  product: McProducto
  className?: string
  floating?: boolean
}) {
  if (!productoTieneDescuento(product)) return null
  const pct = productoPorcentajeDescuentoMax(product)
  if (pct == null) return null

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white shadow-md sm:text-[11px]',
        floating && 'shadow-lg',
        className,
      )}
    >
      −{pct}%
    </span>
  )
}
