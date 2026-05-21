import clsx from 'clsx'
import { formatIntegerEsCo } from '@/lib/formatCop'
import {
  VARIANTE_TIPOS_SUGERIDOS,
  type VarianteDraftConArchivo,
  createVarianteDraft,
} from '@/lib/productoVariantes'

type Props = {
  variantes: VarianteDraftConArchivo[]
  onChange: (next: VarianteDraftConArchivo[]) => void
  /** Permite subir foto por variante (solo en edición). */
  allowImage?: boolean
}

function patchAt(
  rows: VarianteDraftConArchivo[],
  i: number,
  partial: Partial<VarianteDraftConArchivo>,
): VarianteDraftConArchivo[] {
  return rows.map((v, j) => (j === i ? { ...v, ...partial } : v))
}

function onPrecioVariante(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return ''
  const n = Number(digits)
  if (!Number.isFinite(n)) return ''
  return formatIntegerEsCo(n)
}

export function ProductoVariantesEditor({ variantes, onChange, allowImage = false }: Props) {
  function patch(i: number, partial: Partial<VarianteDraftConArchivo>) {
    onChange(patchAt(variantes, i, partial))
  }

  function addVariante() {
    onChange([...variantes, createVarianteDraft()])
  }

  function removeVariante(i: number) {
    onChange(variantes.filter((_, j) => j !== i))
  }

  const stockTotal = variantes.reduce((s, v) => {
    const n = Number(v.stock.replace(/\D/g, ''))
    return s + (Number.isFinite(n) && n > 0 ? n : 0)
  }, 0)

  return (
    <div className="rounded-xl border border-neutral-200/70 bg-gradient-to-b from-mc-50/80 to-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ios-footnote font-semibold text-mc-900">Variantes del producto</p>
          <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
            Color, olor, capacidad, talla… Cada variante tiene nombre, stock y, si querés, color y precio propios.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-neutral-200/80 bg-white px-3 py-1.5 text-[13px] font-semibold text-mc-900 shadow-sm transition hover:border-neutral-300"
          onClick={addVariante}
        >
          + Añadir
        </button>
      </div>

      {variantes.length > 0 ? (
        <>
          <ul className="mt-4 space-y-3">
            {variantes.map((v, i) => (
              <li
                key={v.id}
                className="overflow-hidden rounded-lg border border-neutral-200/60 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-neutral-100 bg-neutral-50/80 px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-mc-500">
                    Variante {i + 1}
                  </span>
                  <button
                    type="button"
                    className="text-[12px] font-medium text-red-700/90 underline decoration-red-200 underline-offset-2"
                    onClick={() => removeVariante(i)}
                  >
                    Quitar
                  </button>
                </div>

                <div className="space-y-3 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Tipo de opción</label>
                      <input
                        className="mc-input mt-1 py-2 text-[14px]"
                        list="mc-variante-tipos"
                        value={v.tipo}
                        onChange={(e) => patch(i, { tipo: e.target.value })}
                        placeholder="Ej. Olor, Capacidad"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Nombre visible</label>
                      <input
                        className="mc-input mt-1 py-2 text-[14px]"
                        value={v.nombre}
                        onChange={(e) => patch(i, { nombre: e.target.value })}
                        placeholder="Ej. Lavanda, 256 GB, Negro"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Stock de esta variante</label>
                      <input
                        className="mc-input mt-1 py-2 text-[14px]"
                        inputMode="numeric"
                        value={v.stock}
                        onChange={(e) => patch(i, { stock: e.target.value.replace(/\D/g, '') })}
                        placeholder="0"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Precio COP (opcional)</label>
                      <input
                        className="mc-input mt-1 py-2 text-[14px]"
                        inputMode="numeric"
                        value={v.precio}
                        onChange={(e) => patch(i, { precio: onPrecioVariante(e.target.value) })}
                        placeholder="Igual al base"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="rounded-md border border-neutral-200/50 bg-mc-50/30 px-3 py-2.5">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 rounded border-neutral-300"
                        checked={v.mostrarColor}
                        onChange={(e) => patch(i, { mostrarColor: e.target.checked })}
                      />
                      <span className="text-[13px] font-medium text-mc-800">Mostrar muestra de color</span>
                    </label>
                    {v.mostrarColor ? (
                      <div className="mt-2.5 flex items-center gap-3">
                        <input
                          type="color"
                          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-neutral-200/70 bg-white p-0.5"
                          value={v.hex}
                          onChange={(e) => patch(i, { hex: e.target.value })}
                          aria-label="Color de la variante"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] text-mc-600">El cliente verá este círculo de color en el catálogo.</p>
                          <p className="mt-0.5 font-mono text-[11px] text-mc-500">{v.hex}</p>
                        </div>
                        <span
                          className="hidden h-10 w-10 shrink-0 rounded-full border border-neutral-200/70 shadow-inner sm:block"
                          style={{ backgroundColor: v.hex }}
                          aria-hidden
                        />
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[12px] text-mc-500">
                        Ideal para olores, capacidades u opciones sin color visual.
                      </p>
                    )}
                  </div>

                  {allowImage ? (
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Foto de esta variante (opcional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-1.5 w-full text-[13px] text-mc-600 file:mr-2 file:rounded-md file:border file:border-neutral-200/70 file:bg-neutral-50 file:px-2.5 file:py-1.5 file:text-[12px] file:font-medium"
                        onChange={(e) => patch(i, { file: e.target.files?.[0] ?? null })}
                      />
                      {v.imageUrl && !v.file ? (
                        <p className="mt-1 text-[11px] text-mc-500">Ya hay una imagen guardada para esta variante.</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <p
            className={clsx(
              'mt-3 rounded-md px-3 py-2 text-[12px] font-medium',
              stockTotal > 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900',
            )}
          >
            {stockTotal > 0
              ? `Stock total en variantes: ${stockTotal} unidades (se guardará como stock del producto).`
              : 'Indicá el stock de cada variante para que el cliente vea disponibilidad real.'}
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-neutral-200/80 bg-white/60 px-4 py-6 text-center">
          <p className="text-[13px] font-medium text-mc-700">Sin variantes</p>
          <p className="mt-1 text-[12px] leading-relaxed text-mc-500">
            Ejemplos: velas con olores distintos, iPhone 128/256 GB con color y stock propio por opción.
          </p>
          <button
            type="button"
            className="mt-3 text-[13px] font-semibold text-mc-900 underline decoration-mc-300 underline-offset-2"
            onClick={addVariante}
          >
            Crear primera variante
          </button>
        </div>
      )}

      <datalist id="mc-variante-tipos">
        {VARIANTE_TIPOS_SUGERIDOS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  )
}
