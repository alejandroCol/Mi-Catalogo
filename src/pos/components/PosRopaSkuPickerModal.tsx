import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import { varianteEtiqueta } from '@/lib/productoVariantes'
import {
  posStockDisponibleSku,
  resolvePosProductoSkuView,
} from '@/pos/lib/posProductoSkus'
import type { McPosProducto, McPosVariante, McProducto } from '@/types/mc'

type Props = {
  producto: McPosProducto & { id: string }
  catalogProducto?: McProducto | null
  stockMap: Map<string, number>
  onClose: () => void
  onConfirm: (colorId: string, colorNombre: string, tallaId: string, tallaNombre: string) => void
}

function ColorChip({
  variante,
  active,
  disabled,
  onClick,
}: {
  variante: McPosVariante
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition',
        disabled && 'cursor-not-allowed opacity-40',
        active && !disabled
          ? 'border-[var(--mc-landing-gold-dark)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_12%,white)] ring-1 ring-[var(--mc-landing-gold-dark)]'
          : !disabled && 'border-neutral-200 bg-white hover:border-neutral-300',
      )}
    >
      {variante.hex ? (
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-neutral-200/70"
          style={{ backgroundColor: variante.hex }}
          aria-hidden
        />
      ) : null}
      {varianteEtiqueta(variante)}
    </button>
  )
}

export function PosRopaSkuPickerModal({
  producto,
  catalogProducto,
  stockMap,
  onClose,
  onConfirm,
}: Props) {
  const view = resolvePosProductoSkuView(producto, catalogProducto)
  const [colorId, setColorId] = useState<string | null>(null)
  const [tallaId, setTallaId] = useState<string | null>(null)

  const selectedColor = view.colores.find((c) => c.id === colorId)
  const selectedTalla = view.tallas.find((t) => t.id === tallaId)

  const disponible = useMemo(() => {
    if (!colorId || !tallaId) return 0
    return posStockDisponibleSku(producto.id, colorId, tallaId, stockMap)
  }, [colorId, tallaId, producto.id, stockMap])

  const colorTieneStock = (cId: string) =>
    view.tallas.some((t) => posStockDisponibleSku(producto.id, cId, t.id, stockMap) > 0)

  return (
    <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="mc-pos-modal mc-pos-modal--wide mc-pos-modal--stacked"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mc-pos-modal__title">Elegir color y talla</h2>
        <p className="mc-pos-modal__subtitle">
          {producto.nombre} · {formatCop(producto.precioCop)}
        </p>

        <div className="mc-pos-modal__body space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mc-brand-gray/70">
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {view.colores.map((c) => (
                <ColorChip
                  key={c.id}
                  variante={c}
                  active={c.id === colorId}
                  disabled={!colorTieneStock(c.id)}
                  onClick={() => {
                    setColorId(c.id)
                    setTallaId(null)
                  }}
                />
              ))}
            </div>
          </div>

          {selectedColor ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mc-brand-gray/70">
                Talla
              </p>
              <div className="flex flex-wrap gap-2">
                {view.tallas.map((t) => {
                  const disp = posStockDisponibleSku(producto.id, selectedColor.id, t.id, stockMap)
                  const active = t.id === tallaId
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={disp <= 0}
                      onClick={() => setTallaId(t.id)}
                      className={clsx(
                        'inline-flex min-h-[44px] min-w-[3rem] items-center justify-center rounded-xl border px-3.5 py-2 text-[13px] font-bold transition',
                        disp <= 0 && 'cursor-not-allowed opacity-40',
                        active && disp > 0
                          ? 'border-[var(--mc-landing-gold-dark)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_12%,white)] ring-1 ring-[var(--mc-landing-gold-dark)]'
                          : disp > 0 && 'border-neutral-200 bg-white hover:border-neutral-300',
                      )}
                    >
                      {t.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="mc-pos-muted text-sm">Seleccioná un color para ver las tallas disponibles.</p>
          )}

          {colorId && tallaId && disponible <= 0 ? (
            <p className="mc-pos-status mc-pos-status--error" role="alert">
              Sin stock para esta combinación.
            </p>
          ) : null}
        </div>

        <div className="mc-pos-modal__actions">
          <button type="button" className="mc-landing-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="mc-landing-btn-primary"
            disabled={!selectedColor || !selectedTalla || disponible <= 0}
            onClick={() => {
              if (!selectedColor || !selectedTalla) return
              onConfirm(selectedColor.id, varianteEtiqueta(selectedColor), selectedTalla.id, selectedTalla.nombre)
            }}
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
