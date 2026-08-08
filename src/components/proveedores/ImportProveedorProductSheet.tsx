import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { formatCop, formatIntegerEsCo } from '@/lib/formatCop'
import type { McMarketplaceListing } from '@/types/mcProveedor'

export function ImportProveedorProductSheet({
  listing,
  busy,
  onClose,
  onImport,
}: {
  listing: McMarketplaceListing
  busy?: boolean
  onClose: () => void
  onImport: (precioVentaCop: number) => Promise<void>
}) {
  const suggested =
    listing.precioSugeridoCop && listing.precioSugeridoCop > listing.precioCostoCop
      ? listing.precioSugeridoCop
      : Math.round(listing.precioCostoCop * 1.45)
  const [precio, setPrecio] = useState(() => formatIntegerEsCo(suggested))
  const [error, setError] = useState<string | null>(null)

  const precioN = Math.max(0, Math.round(Number(precio.replace(/\D/g, '')) || 0))
  const margen = precioN - listing.precioCostoCop
  const margenPct = precioN > 0 ? Math.round((margen / precioN) * 100) : 0
  const aboveCost = precioN >= listing.precioCostoCop
  const minProveedorOk =
    listing.precioMinimoVentaCop == null || precioN >= listing.precioMinimoVentaCop
  const minOk = aboveCost && minProveedorOk

  const tip = useMemo(() => {
    if (!aboveCost) return 'Debe ser mayor o igual al costo'
    if (!minProveedorOk) return 'Por debajo del mínimo del proveedor'
    if (margenPct >= 35) return 'Margen saludable'
    if (margenPct >= 20) return 'Margen aceptable'
    if (margen > 0) return 'Margen justo — revisá envío'
    return 'Sin margen'
  }, [aboveCost, minProveedorOk, margen, margenPct])

  return (
    <div className="mc-prov-sheet" role="dialog" aria-modal onClick={onClose}>
      <div
        className="mc-prov-sheet__panel flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-neutral-100 px-4 py-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            {listing.imageUrl ? (
              <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] text-mc-500">
                Sin foto
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
              Importar a tu tienda
            </p>
            <h2 className="mt-0.5 truncate text-[17px] font-semibold text-[var(--cat-text)]">
              {listing.nombre}
            </h2>
            <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
              {listing.proveedorNombre}
              {listing.proveedorCiudad ? ` · ${listing.proveedorCiudad}` : ''}
              {' · '}
              despacho en {listing.leadTimeHoras}h
              {listing.tieneVariantes ? ' · incluye variantes' : ''}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-[13px] text-mc-600"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-2.5">
              <p className="text-[11px] text-[var(--cat-muted)]">Tu costo</p>
              <p className="text-[16px] font-semibold">{formatCop(listing.precioCostoCop)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/80 px-3 py-2.5">
              <p className="text-[11px] text-[var(--cat-muted)]">Stock proveedor</p>
              <p className="text-[16px] font-semibold">{listing.stock}</p>
            </div>
          </div>

          <label className="block">
            <span className="text-[13px] font-medium text-[var(--cat-text)]">
              Precio de venta en tu tienda
            </span>
            <input
              className="mc-input mt-1.5"
              inputMode="numeric"
              value={precio}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                if (!digits) {
                  setPrecio('')
                  return
                }
                setPrecio(formatIntegerEsCo(Number(digits)))
              }}
            />
            {!aboveCost && precioN > 0 ? (
              <span className="mt-1 block text-[12px] font-medium text-red-700">
                El precio de venta no puede ser menor al costo.
              </span>
            ) : null}
            {aboveCost &&
            listing.precioMinimoVentaCop != null &&
            precioN < listing.precioMinimoVentaCop ? (
              <span className="mt-1 block text-[12px] font-medium text-red-700">
                El precio mínimo del proveedor es {formatCop(listing.precioMinimoVentaCop)}.
              </span>
            ) : null}
          </label>

          <div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-[var(--cat-text)]">
                Margen {formatCop(Math.max(0, margen))} ({Math.max(0, margenPct)}%)
              </span>
              <span
                className={clsx(
                  'text-[12px]',
                  margenPct >= 20 ? 'text-emerald-700' : 'text-amber-800',
                )}
              >
                {tip}
              </span>
            </div>
            <div className="mc-prov-margin mt-2">
              <div
                className="mc-prov-margin__fill"
                style={{ width: `${Math.min(100, Math.max(4, margenPct))}%` }}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-4 py-3">
          <button type="button" className="mc-btn-secondary flex-1" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="mc-btn-primary flex-1"
            disabled={busy || !minOk || precioN <= 0}
            onClick={async () => {
              setError(null)
              try {
                await onImport(precioN)
              } catch (e) {
                setError(e instanceof Error ? e.message : 'No se pudo importar')
              }
            }}
          >
            {busy ? 'Importando…' : 'Agregar a mi inventario'}
          </button>
        </div>
      </div>
    </div>
  )
}
