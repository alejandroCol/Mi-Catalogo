import clsx from 'clsx'
import { ProductoImagenesEditor } from '@/components/producto/ProductoImagenesEditor'
import { ProductoTallasEditor } from '@/components/producto/ProductoTallasEditor'
import { COLORES_VARIANTE_SUGERIDOS, VARIANTE_SELECT_OTRO } from '@/lib/productoVariantes'
import {
  agregarColorSugerido,
  colorTieneImagenes,
  createColorZapatoDraft,
  resolveImagenPrincipalColorId,
  type ColorZapatoDraft,
} from '@/lib/productoZapatos'

type Props = {
  colores: ColorZapatoDraft[]
  onChange: (next: ColorZapatoDraft[]) => void
  imagenPrincipalColorId: string | null
  onImagenPrincipalColorIdChange: (id: string | null) => void
  disabled?: boolean
}

const selectClass =
  'mc-input mt-1 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat py-2 pr-9 text-[14px] [background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke-width=%272%27 stroke=%27%23737373%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 d=%27m19.5 8.25-7.5 7.5-7.5-7.5%27/%3E%3C/svg%3E")]'

function patchColor(rows: ColorZapatoDraft[], i: number, partial: Partial<ColorZapatoDraft>): ColorZapatoDraft[] {
  return rows.map((c, j) => (j === i ? { ...c, ...partial } : c))
}

function resolveColorSelect(nombre: string): { selectValue: string; customNombre: string } {
  const n = nombre.trim()
  if (!n) return { selectValue: '', customNombre: '' }
  const found = COLORES_VARIANTE_SUGERIDOS.find((c) => c.nombre.toLowerCase() === n.toLowerCase())
  if (found) return { selectValue: found.nombre, customNombre: '' }
  return { selectValue: VARIANTE_SELECT_OTRO, customNombre: n }
}

export function ProductoZapatosColoresEditor({
  colores,
  onChange,
  imagenPrincipalColorId,
  onImagenPrincipalColorIdChange,
  disabled = false,
}: Props) {
  const nombresUsados = new Set(colores.map((c) => c.nombre.trim().toLowerCase()).filter(Boolean))
  const coloresSugeridosDisponibles = COLORES_VARIANTE_SUGERIDOS.filter(
    (c) => !nombresUsados.has(c.nombre.toLowerCase()),
  )

  const stockTotal = colores.reduce((sum, c) => {
    return (
      sum +
      c.tallas.reduce((s, t) => {
        const n = Number(t.stock.replace(/\D/g, ''))
        return s + (Number.isFinite(n) && n > 0 ? n : 0)
      }, 0)
    )
  }, 0)

  function syncPrincipal(nextColores: ColorZapatoDraft[]) {
    onImagenPrincipalColorIdChange(resolveImagenPrincipalColorId(nextColores, imagenPrincipalColorId))
  }

  function updateColores(next: ColorZapatoDraft[]) {
    onChange(next)
    syncPrincipal(next)
  }

  function addColor(partial?: Partial<Omit<ColorZapatoDraft, 'id' | 'tallas' | 'imagenes' | 'coverId'>>) {
    updateColores([...colores, createColorZapatoDraft(partial)])
  }

  function removeColor(i: number) {
    const removed = colores[i]
    const next = colores.filter((_, j) => j !== i)
    onChange(next)
    if (removed && imagenPrincipalColorId === removed.id) {
      onImagenPrincipalColorIdChange(resolveImagenPrincipalColorId(next, null))
    } else {
      syncPrincipal(next)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ios-footnote font-medium text-mc-700">Colores, fotos y stock por talla</p>
          <p className="mt-1 text-[12px] leading-relaxed text-mc-500">
            Subí las fotos por color (podés agregar varias). Marcá cuál color muestra la imagen principal en el
            catálogo. Cada color tiene su propia curva de tallas.
          </p>
        </div>
        {stockTotal > 0 ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            {stockTotal} u.
          </span>
        ) : null}
      </div>

      {colores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300/90 bg-white px-4 py-6 text-center">
          <p className="text-[13px] font-medium text-mc-800">Agregá el primer color</p>
          <p className="mt-1 text-[12px] text-mc-500">Elegí un color sugerido o creá uno personalizado.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {COLORES_VARIANTE_SUGERIDOS.slice(0, 6).map((c) => (
              <button
                key={c.nombre}
                type="button"
                disabled={disabled}
                onClick={() => addColor({ nombre: c.nombre, hex: c.hex, tipo: 'Color' })}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300/90 bg-white px-3 py-1.5 text-[12px] font-medium text-mc-800 transition hover:border-mc-900/30 active:scale-[0.98]"
              >
                <span
                  className="h-4 w-4 rounded-full border border-neutral-200/70"
                  style={{ backgroundColor: c.hex }}
                  aria-hidden
                />
                {c.nombre}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => addColor()}
            className="mt-3 text-[13px] font-semibold text-mc-900 underline decoration-mc-300 underline-offset-2"
          >
            + Otro color
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {colores.map((color, i) => {
            const { selectValue, customNombre } = resolveColorSelect(color.nombre)
            const esOtro = selectValue === VARIANTE_SELECT_OTRO
            const esPrincipal = imagenPrincipalColorId === color.id
            const puedeSerPrincipal = colorTieneImagenes(color)

            return (
              <li
                key={color.id}
                className={clsx(
                  'overflow-hidden rounded-xl border bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]',
                  esPrincipal ? 'border-mc-900/50 ring-1 ring-mc-900/10' : 'border-neutral-300/80',
                )}
              >
                <div className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-6 w-6 shrink-0 rounded-full border border-neutral-200/70 shadow-inner"
                      style={{ backgroundColor: color.hex }}
                      aria-hidden
                    />
                    <span className="truncate text-[14px] font-semibold text-mc-900">
                      {color.nombre.trim() || `Color ${i + 1}`}
                    </span>
                    {esPrincipal ? (
                      <span className="shrink-0 rounded-full bg-mc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Principal
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeColor(i)}
                    className="shrink-0 text-[12px] font-medium text-red-700/90 underline decoration-red-200 underline-offset-2"
                  >
                    Quitar color
                  </button>
                </div>

                <div className="space-y-4 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Color</label>
                      <select
                        className={selectClass}
                        value={selectValue}
                        disabled={disabled}
                        onChange={(e) => {
                          const next = e.target.value
                          if (next === '') {
                            updateColores(patchColor(colores, i, { nombre: '' }))
                            return
                          }
                          if (next === VARIANTE_SELECT_OTRO) {
                            updateColores(patchColor(colores, i, { nombre: customNombre || '' }))
                            return
                          }
                          const sug = COLORES_VARIANTE_SUGERIDOS.find((c) => c.nombre === next)
                          updateColores(
                            patchColor(colores, i, {
                              nombre: next,
                              hex: sug?.hex ?? color.hex,
                              tipo: 'Color',
                            }),
                          )
                        }}
                      >
                        <option value="">Seleccioná…</option>
                        {COLORES_VARIANTE_SUGERIDOS.map((c) => (
                          <option key={c.nombre} value={c.nombre}>
                            {c.nombre}
                          </option>
                        ))}
                        <option value={VARIANTE_SELECT_OTRO}>Otro color…</option>
                      </select>
                      {esOtro ? (
                        <input
                          className="mc-input mt-2 py-2 text-[14px]"
                          value={customNombre}
                          disabled={disabled}
                          onChange={(e) => {
                            updateColores(patchColor(colores, i, { nombre: e.target.value.trim() }))
                          }}
                          placeholder="Ej. Camel, Nude, Plata"
                        />
                      ) : null}
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Tono exacto</label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="color"
                          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-neutral-200/70 bg-white p-0.5"
                          value={color.hex}
                          disabled={disabled}
                          onChange={(e) => updateColores(patchColor(colores, i, { hex: e.target.value }))}
                          aria-label={`Tono ${color.nombre || i + 1}`}
                        />
                        <span className="font-mono text-[11px] text-mc-500">{color.hex}</span>
                      </div>
                    </div>
                  </div>

                  <ProductoImagenesEditor
                    items={color.imagenes}
                    coverId={color.coverId}
                    disabled={disabled}
                    label={`Fotos del color ${color.nombre.trim() || i + 1}`}
                    hint="Podés subir varias. Tocá una miniatura para marcar la portada de este color."
                    onChange={(imagenes, coverId) => {
                      const next = patchColor(colores, i, { imagenes, coverId })
                      updateColores(next)
                    }}
                  />

                  {puedeSerPrincipal ? (
                    <label
                      className={clsx(
                        'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition',
                        esPrincipal
                          ? 'border-mc-900/40 bg-mc-900/5'
                          : 'border-neutral-200/80 bg-neutral-50/50 hover:border-neutral-300',
                        disabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <input
                        type="radio"
                        name="imagen-principal-zapatos"
                        className="mt-0.5 h-4 w-4 shrink-0"
                        checked={esPrincipal}
                        disabled={disabled}
                        onChange={() => onImagenPrincipalColorIdChange(color.id)}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-mc-900">Imagen principal del producto</span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-mc-500">
                          La portada de este color se verá en el listado del catálogo y al abrir el producto.
                        </span>
                      </span>
                    </label>
                  ) : null}

                  <div className="rounded-lg border border-neutral-200/60 bg-neutral-50/50 p-3">
                    <ProductoTallasEditor
                      tallas={color.tallas}
                      onChange={(next) => updateColores(patchColor(colores, i, { tallas: next }))}
                      modo="zapatos"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {colores.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => addColor()}
              className="rounded-full border-2 border-dashed border-neutral-300/90 bg-white px-4 py-2 text-[13px] font-semibold text-mc-900 transition hover:border-mc-900/40 active:scale-[0.98]"
            >
              + Agregar otro color
            </button>
            {coloresSugeridosDisponibles.slice(0, 8).map((c) => (
              <button
                key={c.nombre}
                type="button"
                disabled={disabled}
                onClick={() => updateColores(agregarColorSugerido(colores, c.nombre, c.hex))}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300/90 bg-white px-3 py-1.5 text-[12px] font-medium text-mc-700 transition hover:border-mc-900/30 active:scale-[0.98]"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-neutral-200/70"
                  style={{ backgroundColor: c.hex }}
                  aria-hidden
                />
                + {c.nombre}
              </button>
            ))}
          </div>

          <p
            className={clsx(
              'rounded-lg px-3 py-2 text-[12px] font-medium',
              stockTotal > 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900',
            )}
          >
            {stockTotal > 0
              ? `Stock total: ${stockTotal} unidades (suma de todos los colores y tallas).`
              : 'Indicá stock en al menos una talla de algún color para publicar.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
