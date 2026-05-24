import clsx from 'clsx'
import { VarianteImagenPicker } from '@/components/producto/VarianteImagenPicker'
import { formatIntegerEsCo } from '@/lib/formatCop'
import {
  COLORES_VARIANTE_SUGERIDOS,
  VARIANTE_SELECT_OTRO,
  VARIANTE_TIPOS_SUGERIDOS,
  esTipoColorVariante,
  hexColorVarianteSugerido,
  resolveVarianteColorNombreSelect,
  resolveVarianteTipoSelect,
  type VarianteDraftConArchivo,
  createVarianteDraft,
} from '@/lib/productoVariantes'
import { VARIANTE_TIPOS_ROPA } from '@/lib/productoTallas'

type Props = {
  variantes: VarianteDraftConArchivo[]
  onChange: (next: VarianteDraftConArchivo[]) => void
  /** Permite subir foto por variante. */
  allowImage?: boolean
  disabled?: boolean
  /** Modo prenda: solo color/tela/otro y sin stock por variante. */
  esRopa?: boolean
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

const selectClass =
  'mc-input mt-1 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat py-2 pr-9 text-[14px] [background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke-width=%272%27 stroke=%27%23737373%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 d=%27m19.5 8.25-7.5 7.5-7.5-7.5%27/%3E%3C/svg%3E")]'

function VarianteTipoField({
  tipo,
  onTipoChange,
  esRopa = false,
}: {
  tipo: string
  onTipoChange: (next: Partial<VarianteDraftConArchivo>) => void
  esRopa?: boolean
}) {
  const tiposSugeridos = esRopa ? VARIANTE_TIPOS_ROPA : VARIANTE_TIPOS_SUGERIDOS
  const { selectValue, customTipo } = resolveVarianteTipoSelect(tipo)
  const esOtro = selectValue === VARIANTE_SELECT_OTRO

  return (
    <div>
      <label className="text-[11px] font-medium text-mc-600">Tipo de opción</label>
      <select
        className={selectClass}
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value
          if (next === '') {
            onTipoChange({ tipo: '', mostrarColor: false })
            return
          }
          if (next === VARIANTE_SELECT_OTRO) {
            onTipoChange({ tipo: customTipo || VARIANTE_SELECT_OTRO, mostrarColor: false })
            return
          }
          onTipoChange({
            tipo: next,
            mostrarColor: esTipoColorVariante(next),
          })
        }}
      >
        <option value="">Seleccioná…</option>
        {tiposSugeridos.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        <option value={VARIANTE_SELECT_OTRO}>Otro</option>
      </select>
      {esOtro ? (
        <input
          className="mc-input mt-2 py-2 text-[14px]"
          value={customTipo === VARIANTE_SELECT_OTRO ? '' : customTipo}
          onChange={(e) => {
            const val = e.target.value.trim()
            onTipoChange({
              tipo: val || VARIANTE_SELECT_OTRO,
              mostrarColor: esTipoColorVariante(val),
            })
          }}
          placeholder="Ej. Sabor, Presentación, Edición"
          autoFocus={customTipo === VARIANTE_SELECT_OTRO || customTipo === ''}
        />
      ) : null}
    </div>
  )
}

function VarianteNombreField({
  tipo,
  nombre,
  hex,
  onChange,
}: {
  tipo: string
  nombre: string
  hex: string
  onChange: (next: Partial<VarianteDraftConArchivo>) => void
}) {
  const esColor = esTipoColorVariante(tipo)

  if (!esColor) {
    return (
      <div>
        <label className="text-[11px] font-medium text-mc-600">Nombre visible</label>
        <input
          className="mc-input mt-1 py-2 text-[14px]"
          value={nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          placeholder="Ej. Lavanda, 256 GB, Talla M"
        />
      </div>
    )
  }

  const { selectValue, customNombre } = resolveVarianteColorNombreSelect(nombre)
  const esOtro = selectValue === VARIANTE_SELECT_OTRO

  return (
    <div>
      <label className="text-[11px] font-medium text-mc-600">Color</label>
      <select
        className={selectClass}
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value
          if (next === '') {
            onChange({ nombre: '' })
            return
          }
          if (next === VARIANTE_SELECT_OTRO) {
            onChange({
              nombre: customNombre || VARIANTE_SELECT_OTRO,
              mostrarColor: true,
            })
            return
          }
          const hexSugerido = hexColorVarianteSugerido(next)
          onChange({
            nombre: next,
            mostrarColor: true,
            ...(hexSugerido ? { hex: hexSugerido } : {}),
          })
        }}
      >
        <option value="">Elegí un color…</option>
        {COLORES_VARIANTE_SUGERIDOS.map((c) => (
          <option key={c.nombre} value={c.nombre}>
            {c.nombre}
          </option>
        ))}
        <option value={VARIANTE_SELECT_OTRO}>Otro</option>
      </select>
      {esOtro ? (
        <input
          className="mc-input mt-2 py-2 text-[14px]"
          value={customNombre === VARIANTE_SELECT_OTRO ? '' : customNombre}
          onChange={(e) =>
            onChange({
              nombre: e.target.value.trim() || VARIANTE_SELECT_OTRO,
              mostrarColor: true,
            })
          }
          placeholder="Ej. Turquesa, Coral, Dorado"
          autoFocus={customNombre === VARIANTE_SELECT_OTRO || customNombre === ''}
        />
      ) : null}
      {selectValue && !esOtro ? (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-neutral-200/50 bg-neutral-50/80 px-2.5 py-1.5">
          <span
            className="h-5 w-5 shrink-0 rounded-full border border-neutral-200/70 shadow-inner"
            style={{ backgroundColor: hex }}
            aria-hidden
          />
          <span className="text-[11px] text-mc-500">Vista previa del círculo en el catálogo</span>
        </div>
      ) : null}
    </div>
  )
}

export function ProductoVariantesEditor({ variantes, onChange, allowImage = false, disabled = false, esRopa = false }: Props) {
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
    <div className="mc-producto-form-section rounded-xl border border-neutral-300/90 bg-neutral-100/80 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ios-footnote font-semibold text-mc-900">Variantes del producto</p>
          <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
            {esRopa
              ? 'Color, tela u otra opción. El stock se maneja por talla arriba.'
              : 'Color, olor, capacidad… Cada variante tiene nombre, stock y, si querés, color y precio propios.'}
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
                className="overflow-hidden rounded-lg border border-neutral-300/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
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
                    <VarianteTipoField tipo={v.tipo} esRopa={esRopa} onTipoChange={(partial) => patch(i, partial)} />
                    <VarianteNombreField
                      tipo={v.tipo}
                      nombre={v.nombre}
                      hex={v.hex}
                      onChange={(partial) => patch(i, partial)}
                    />
                  </div>

                  <div className={clsx('grid gap-3', esRopa ? 'sm:grid-cols-1' : 'sm:grid-cols-2')}>
                    {!esRopa ? (
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
                    ) : null}
                    <div className={esRopa ? '' : ''}>
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

                  {esTipoColorVariante(v.tipo) ? (
                    <div className="rounded-md border border-neutral-200/50 bg-mc-50/30 px-3 py-2.5">
                      <p className="text-[13px] font-medium text-mc-800">Muestra de color en el catálogo</p>
                      <div className="mt-2.5 flex items-center gap-3">
                        <input
                          type="color"
                          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-neutral-200/70 bg-white p-0.5"
                          value={v.hex}
                          onChange={(e) => patch(i, { hex: e.target.value, mostrarColor: true })}
                          aria-label="Ajustar tono del color"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] text-mc-600">
                            Ajustá el tono exacto si el color predefinido no coincide con tu producto.
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-mc-500">{v.hex}</p>
                        </div>
                        <span
                          className="hidden h-10 w-10 shrink-0 rounded-full border border-neutral-200/70 shadow-inner sm:block"
                          style={{ backgroundColor: v.hex }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  ) : (
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
                  )}

                  {allowImage ? (
                    <VarianteImagenPicker
                      file={v.file ?? null}
                      imageUrl={v.imageUrl}
                      disabled={disabled}
                      onChange={(file) => patch(i, { file })}
                      onRemoveExisting={() => patch(i, { imageUrl: undefined, file: null })}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <p
            className={clsx(
              'mt-3 rounded-md px-3 py-2 text-[12px] font-medium',
              esRopa
                ? 'bg-neutral-100 text-mc-700'
                : stockTotal > 0
                  ? 'bg-emerald-50 text-emerald-900'
                  : 'bg-amber-50 text-amber-900',
            )}
          >
            {esRopa
              ? 'El stock de cada talla se configura en la sección de tallas.'
              : stockTotal > 0
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
    </div>
  )
}
