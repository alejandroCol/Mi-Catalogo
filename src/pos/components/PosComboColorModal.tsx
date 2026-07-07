import { useMemo, useState } from 'react'
import type { McComboColorSeleccion, McPosProducto, McProducto } from '@/types/mc'
import { ComboColorPicker } from '@/components/producto/ComboColorPicker'
import {
  comboClienteSlots,
  comboColorSeleccionCompleta,
  type ProductoLookup,
} from '@/lib/comboProducto'
import { catalogProductLookup } from '@/pos/lib/posComboStock'
import { formatCop } from '@/lib/formatCop'

type Props = {
  producto: McPosProducto & { id: string }
  catalogProductos: (McProducto & { id: string })[]
  onConfirm: (seleccion: McComboColorSeleccion[]) => void
  onClose: () => void
}

export function PosComboColorModal({ producto, catalogProductos, onConfirm, onClose }: Props) {
  const catalogLookup: ProductoLookup = useMemo(
    () => catalogProductLookup(catalogProductos),
    [catalogProductos],
  )
  const comboCatalog = useMemo(
    () =>
      producto.catalogProductoId
        ? catalogLookup.get(producto.catalogProductoId)
        : undefined,
    [producto.catalogProductoId, catalogLookup],
  )

  const comboDef = useMemo(
    () => ({
      comboComponentes: producto.comboComponentes,
      comboPermiteElegirColor: producto.comboPermiteElegirColor ?? comboCatalog?.comboPermiteElegirColor,
      comboPermiteElegirTalla: producto.comboPermiteElegirTalla ?? comboCatalog?.comboPermiteElegirTalla,
    }),
    [producto, comboCatalog],
  )

  const slots = useMemo(() => comboClienteSlots(comboDef, catalogLookup), [comboDef, catalogLookup])
  const [seleccion, setSeleccion] = useState<McComboColorSeleccion[]>([])
  const completa = comboColorSeleccionCompleta(comboDef, catalogLookup, seleccion)

  return (
    <div
      className="mc-pos-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-combo-colors-title"
      onClick={onClose}
    >
      <div className="mc-pos-modal mc-pos-modal--wide mc-pos-modal--stacked" onClick={(e) => e.stopPropagation()}>
        <h2 id="pos-combo-colors-title" className="mc-pos-modal__title">
          Opciones del combo
        </h2>
        <p className="mc-pos-modal__subtitle">
          {producto.nombre} · {formatCop(producto.precioCop)}
        </p>
        <div className="mc-pos-modal__body mc-pos-combo-colors">
          {slots.length === 0 ? (
            <p className="text-sm text-mc-brand-gray/80">
              Este combo no tiene opciones para elegir.
            </p>
          ) : (
            <ComboColorPicker
              slots={slots}
              products={catalogLookup}
              value={seleccion}
              onChange={setSeleccion}
              variant="pos"
            />
          )}
        </div>
        {!completa && slots.length > 0 && (
          <p className="mc-pos-status mc-pos-status--error" role="alert">
            Completá color y talla de cada prenda del combo.
          </p>
        )}
        <div className="mc-pos-modal__actions">
          <button type="button" className="mc-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="mc-landing-btn-primary"
            disabled={!completa}
            onClick={() => onConfirm(seleccion)}
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
