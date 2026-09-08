import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import { useMcAuth } from '@/auth/McAuthContext'
import { isEnvioCotizacionAutomaticaConfigured } from '@/lib/envioCotizacion'
import { ROPA_UNIDADES_POR_EMPAQUE } from '@/lib/envioEmpaquePack'
import {
  productoEnvioMedidasDraftFromCamiseta,
  type ProductoEnvioMedidasDraft,
} from '@/lib/productoEnvioMedidas'

type Props = {
  draft: ProductoEnvioMedidasDraft
  onChange: (next: ProductoEnvioMedidasDraft) => void
  /** Ropa (no zapatos): muestra la regla de 4 prendas. */
  esRopa?: boolean
  disabled?: boolean
}

const FIELD_CLASS = 'mc-input mt-1 bg-white py-2.5 text-[15px]'

/**
 * Medidas opcionales de envío. Solo se muestra si la tienda cotiza automático.
 */
export function ProductoEnvioMedidasEditor({ draft, onChange, esRopa, disabled }: Props) {
  const { tenant } = useMcAuth()
  if (!isEnvioCotizacionAutomaticaConfigured(tenant)) return null

  function patch(partial: Partial<ProductoEnvioMedidasDraft>) {
    onChange({ ...draft, ...partial })
  }

  return (
    <ProductoFormSection
      title="Medidas para envío"
      description="Opcional. Si las cargás, el cotizador usa este producto en vez del empaque promedio de la tienda."
    >
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--cat-text)]"
          checked={draft.enabled}
          disabled={disabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        <span className="text-[13px] leading-snug text-mc-800">Agregar peso y medidas de este producto</span>
      </label>

      {draft.enabled ? (
        <div className="mt-3 space-y-3">
          {esRopa ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(productoEnvioMedidasDraftFromCamiseta())}
              className="w-full rounded-lg border border-neutral-200/80 bg-white px-3 py-2 text-left text-[12px] leading-snug text-mc-700 transition hover:border-neutral-300"
            >
              Usar medida de prenda (camiseta doblada). Cubre hasta {ROPA_UNIDADES_POR_EMPAQUE} prendas.
            </button>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div>
              <label className="ios-footnote font-medium text-mc-700">Peso (kg)</label>
              <input
                className={FIELD_CLASS}
                inputMode="decimal"
                value={draft.pesoKg}
                disabled={disabled}
                onChange={(e) => patch({ pesoKg: e.target.value })}
                placeholder="0.3"
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Largo (cm)</label>
              <input
                className={FIELD_CLASS}
                inputMode="decimal"
                value={draft.largoCm}
                disabled={disabled}
                onChange={(e) => patch({ largoCm: e.target.value })}
                placeholder="30"
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Ancho (cm)</label>
              <input
                className={FIELD_CLASS}
                inputMode="decimal"
                value={draft.anchoCm}
                disabled={disabled}
                onChange={(e) => patch({ anchoCm: e.target.value })}
                placeholder="25"
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Alto (cm)</label>
              <input
                className={FIELD_CLASS}
                inputMode="decimal"
                value={draft.altoCm}
                disabled={disabled}
                onChange={(e) => patch({ altoCm: e.target.value })}
                placeholder="5"
              />
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-mc-500">
            {esRopa
              ? `En ropa, esta caja vale para hasta ${ROPA_UNIDADES_POR_EMPAQUE} prendas. La quinta abre otra caja con la misma medida.`
              : 'Si el cliente lleva varios productos con medidas distintas, estimamos el volumen del paquete sumando las cajas.'}
          </p>
        </div>
      ) : null}
    </ProductoFormSection>
  )
}
