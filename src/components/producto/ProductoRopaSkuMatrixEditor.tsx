import clsx from 'clsx'
import type { McProductoVariante } from '@/types/mc'
import type { TallaDraft } from '@/lib/productoTallas'
import { varianteEtiqueta } from '@/lib/productoVariantes'
import { skuKey, sumarStockSkuDrafts, type SkuDraft } from '@/lib/productoSkus'

type Props = {
  variantes: Pick<McProductoVariante, 'id' | 'nombre' | 'hex' | 'tipo'>[]
  tallas: TallaDraft[]
  skus: SkuDraft[]
  onChange: (next: SkuDraft[]) => void
  disabled?: boolean
}

function patchSku(rows: SkuDraft[], key: string, stock: string): SkuDraft[] {
  return rows.map((s) => (skuKey(s.varianteId, s.tallaId) === key ? { ...s, stock } : s))
}

export function ProductoRopaSkuMatrixEditor({
  variantes,
  tallas,
  skus,
  onChange,
  disabled = false,
}: Props) {
  const stockTotal = sumarStockSkuDrafts(skus)

  if (variantes.length === 0 || tallas.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900">
        Agregá al menos un color y una talla para definir el stock por combinación.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ios-footnote font-medium text-mc-700">Stock por color y talla</p>
          <p className="mt-1 text-[12px] leading-relaxed text-mc-500">
            Indicá cuántas unidades hay en cada combinación. Cada celda es independiente.
          </p>
        </div>
        {stockTotal > 0 ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            {stockTotal} u.
          </span>
        ) : null}
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-300/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <table className="min-w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-neutral-200/80 bg-neutral-50/80">
              <th className="sticky left-0 z-10 bg-neutral-50/95 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-mc-600">
                Color
              </th>
              {tallas.map((t) => (
                <th
                  key={t.id}
                  className="min-w-[4.5rem] px-2 py-2.5 text-center text-[11px] font-bold text-mc-900"
                >
                  {t.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variantes.map((v) => (
              <tr key={v.id} className="border-b border-neutral-100 last:border-0">
                <td className="sticky left-0 z-10 bg-white px-3 py-2">
                  <span className="inline-flex items-center gap-2 font-medium text-mc-900">
                    {v.hex ? (
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-neutral-200/70"
                        style={{ backgroundColor: v.hex }}
                        aria-hidden
                      />
                    ) : null}
                    {varianteEtiqueta(v)}
                  </span>
                </td>
                {tallas.map((t) => {
                  const key = skuKey(v.id, t.id)
                  const cell = skus.find((s) => skuKey(s.varianteId, s.tallaId) === key)
                  return (
                    <td key={t.id} className="px-2 py-2">
                      <label className="sr-only">
                        Stock {varianteEtiqueta(v)} {t.nombre}
                      </label>
                      <input
                        className="mc-input mt-0 w-full min-w-[3.5rem] bg-white py-2 text-center text-[14px]"
                        inputMode="numeric"
                        value={cell?.stock ?? ''}
                        disabled={disabled}
                        onChange={(e) =>
                          onChange(patchSku(skus, key, e.target.value.replace(/\D/g, '')))
                        }
                        placeholder="0"
                        autoComplete="off"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        className={clsx(
          'mt-3 rounded-lg px-3 py-2 text-[12px] font-medium',
          stockTotal > 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900',
        )}
      >
        {stockTotal > 0
          ? `Stock total: ${stockTotal} unidades (suma de todas las combinaciones).`
          : 'Indicá stock en al menos una combinación color × talla.'}
      </p>
    </div>
  )
}
