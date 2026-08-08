import { useState } from 'react'
import { formatCop } from '@/lib/formatCop'
import {
  canEnableProductForResale,
  productHasSellableVariants,
  resolveProductStockForResale,
  type ResaleOfferTerms,
} from '@/lib/mcProveedorResale'
import type { McProducto } from '@/types/mc'
import {
  MC_PROVEEDOR_LEAD_TIME_OPTIONS,
  type McProveedorLeadTime,
} from '@/types/mcProveedor'

export function ResaleEnableSheet({
  product,
  busy,
  initial,
  onClose,
  onSave,
}: {
  product: McProducto & { id: string }
  busy?: boolean
  initial?: Partial<ResaleOfferTerms>
  onClose: () => void
  onSave: (terms: ResaleOfferTerms) => Promise<void>
}) {
  const gate = canEnableProductForResale(product)
  const defaultCosto =
    initial?.precioCostoCop ??
    product.reventa?.precioCostoCop ??
    product.precioCostoCop ??
    Math.round(product.precioCop * 0.7)
  const defaultSug =
    initial?.precioSugeridoCop ?? product.reventa?.precioSugeridoCop ?? product.precioCop
  const [costo, setCosto] = useState(String(defaultCosto))
  const [sugerido, setSugerido] = useState(String(defaultSug))
  const [lead, setLead] = useState<McProveedorLeadTime>(
    initial?.leadTimeHoras ?? product.reventa?.leadTimeHoras ?? 48,
  )
  const [error, setError] = useState<string | null>(null)

  const costoN = Math.max(0, Math.round(Number(String(costo).replace(/\D/g, '')) || 0))
  const sugN = Math.max(0, Math.round(Number(String(sugerido).replace(/\D/g, '')) || 0))
  const stock = resolveProductStockForResale(product)
  const leadHint = MC_PROVEEDOR_LEAD_TIME_OPTIONS.find((o) => o.value === lead)?.hint

  return (
    <div className="mc-prov-sheet" role="dialog" aria-modal onClick={onClose}>
      <div
        className="mc-prov-sheet__panel flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-neutral-100 px-4 py-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
              Habilitar para reventa
            </p>
            <h2 className="mt-0.5 truncate text-[17px] font-semibold">{product.nombre}</h2>
            <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
              Stock {stock}
              {productHasSellableVariants(product) ? ' · con variantes' : ''}
              {' · '}
              precio en tu tienda {formatCop(product.precioCop)}
            </p>
          </div>
          <button type="button" className="rounded-lg px-2 py-1 text-[13px] text-mc-600" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!gate.ok ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-950">{gate.reason}</p>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-[var(--cat-muted)]">
                Otras tiendas importan este producto a su catálogo. Cuando vendan, vos recibís el
                pedido y despachás desde tu bodega.
              </p>

              <label className="block">
                <span className="text-[13px] font-medium">Costo para otras tiendas</span>
                <input
                  className="mc-input mt-1"
                  inputMode="numeric"
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                />
                <span className="mt-1 block text-[12px] text-[var(--cat-muted)]">
                  Lo que te pagan por unidad (sin el margen de la otra tienda).
                </span>
              </label>

              <label className="block">
                <span className="text-[13px] font-medium">Precio sugerido al cliente final</span>
                <input
                  className="mc-input mt-1"
                  inputMode="numeric"
                  value={sugerido}
                  onChange={(e) => setSugerido(e.target.value)}
                />
              </label>

              <fieldset>
                <legend className="text-[13px] font-medium">Lead time (tiempo de despacho)</legend>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--cat-muted)]">
                  Cuántas horas necesitás, desde que llega el pedido, para entregar el paquete a la
                  transportadora. Las tiendas lo ven al importar.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {MC_PROVEEDOR_LEAD_TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={
                        lead === opt.value
                          ? 'rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2.5 text-left'
                          : 'rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-left'
                      }
                      onClick={() => setLead(opt.value)}
                    >
                      <span className="block text-[13px] font-semibold">{opt.label}</span>
                      <span className="mt-0.5 block text-[11px] text-[var(--cat-muted)]">
                        {opt.hint}
                      </span>
                    </button>
                  ))}
                </div>
                {leadHint ? (
                  <p className="mt-2 text-[12px] text-[var(--cat-muted)]">Elegido: {leadHint}.</p>
                ) : null}
              </fieldset>
            </>
          )}

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
            disabled={busy || !gate.ok || costoN <= 0}
            onClick={() => {
              setError(null)
              void onSave({
                precioCostoCop: costoN,
                precioSugeridoCop: sugN > 0 ? sugN : undefined,
                leadTimeHoras: lead,
                marketplaceVisible: true,
              }).catch((e) => {
                setError(e instanceof Error ? e.message : 'No se pudo publicar')
              })
            }}
          >
            {busy ? 'Guardando…' : product.reventa?.enabled ? 'Actualizar oferta' : 'Publicar para reventa'}
          </button>
        </div>
      </div>
    </div>
  )
}
