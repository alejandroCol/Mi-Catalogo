import { useMemo, useState } from 'react'
import type { McComboComponente, McProducto } from '@/types/mc'
import {
  comboComponenteEtiqueta,
  componenteTieneColoresElegibles,
  componenteTieneTallasElegibles,
} from '@/lib/comboProducto'
import { variantesValidas } from '@/lib/productoVariantes'
import { tallasValidas } from '@/lib/productoTallas'

type Props = {
  componentes: McComboComponente[]
  onChange: (next: McComboComponente[]) => void
  products: (McProducto & { id: string })[]
  comboPermiteElegirColor: boolean
  onComboPermiteElegirColorChange: (v: boolean) => void
  comboPermiteElegirTalla: boolean
  onComboPermiteElegirTallaChange: (v: boolean) => void
  /** Muestra el listado de inventario abierto al entrar. */
  defaultPickerOpen?: boolean
}

export function ComboComponentesEditor({
  componentes,
  onChange,
  products,
  comboPermiteElegirColor,
  onComboPermiteElegirColorChange,
  comboPermiteElegirTalla,
  onComboPermiteElegirTallaChange,
  defaultPickerOpen = false,
}: Props) {
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(defaultPickerOpen)

  const productsById = useMemo(() => {
    const m = new Map<string, McProducto & { id: string }>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = products.filter((p) => p.activo !== false)
    if (!q) return base
    return base.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [products, search])

  const tienePrendasConColor = useMemo(
    () =>
      componentes.some((c) => {
        const p = products.find((x) => x.id === c.productId)
        return p && componenteTieneColoresElegibles(p)
      }),
    [componentes, products],
  )

  const tienePrendasConTalla = useMemo(
    () =>
      componentes.some((c) => {
        const p = products.find((x) => x.id === c.productId)
        return p && componenteTieneTallasElegibles(p)
      }),
    [componentes, products],
  )

  function addProduct(prod: McProducto & { id: string }) {
    const tallas = tallasValidas(prod)
    const variantes = variantesValidas(prod).filter(
      (v) => !prod.esRopa || v.tipo?.trim().toLowerCase() !== 'talla',
    )
    onChange([
      ...componentes,
      {
        productId: prod.id,
        cantidad: 1,
        ...(tallas.length === 1 && !comboPermiteElegirTalla ? { tallaId: tallas[0]!.id } : {}),
        ...(variantes.length === 1 && !comboPermiteElegirColor ? { varianteId: variantes[0]!.id } : {}),
        nombreSnapshot: prod.nombre,
        imageUrlSnapshot: prod.imageUrl,
      },
    ])
    setPickerOpen(false)
    setSearch('')
  }

  function updateAt(index: number, patch: Partial<McComboComponente>) {
    onChange(componentes.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function removeAt(index: number) {
    onChange(componentes.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {tienePrendasConColor ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--mc-landing-gold-dark)_22%,white)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_8%,white)] p-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-[color-mix(in_srgb,var(--mc-landing-gold-dark)_35%,white)]"
            checked={comboPermiteElegirColor}
            onChange={(e) => onComboPermiteElegirColorChange(e.target.checked)}
          />
          <span className="text-[13px] leading-relaxed text-[var(--mc-landing-gold-dark)]">
            <span className="font-semibold">Permitir que el cliente elija el color</span>
            <span className="mt-0.5 block opacity-90">
              En tienda y POS podrán elegir color/tela de las prendas incluidas.
            </span>
          </span>
        </label>
      ) : null}

      {tienePrendasConTalla ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--mc-landing-gold-dark)_22%,white)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_8%,white)] p-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-[color-mix(in_srgb,var(--mc-landing-gold-dark)_35%,white)]"
            checked={comboPermiteElegirTalla}
            onChange={(e) => onComboPermiteElegirTallaChange(e.target.checked)}
          />
          <span className="text-[13px] leading-relaxed text-[var(--mc-landing-gold-dark)]">
            <span className="font-semibold">Permitir que el cliente elija la talla</span>
            <span className="mt-0.5 block opacity-90">
              En tienda y POS podrán elegir la talla de las prendas de ropa incluidas.
            </span>
          </span>
        </label>
      ) : null}

      {componentes.length === 0 ? (
        <p className="text-[13px] text-mc-600">Todavía no agregaste productos al combo.</p>
      ) : (
        <ul className="space-y-2">
          {componentes.map((c, i) => {
            const prod = productsById.get(c.productId)
            const tallas = prod ? tallasValidas(prod) : []
            const variantes = prod
              ? variantesValidas(prod).filter((v) => !prod.esRopa || v.tipo?.trim().toLowerCase() !== 'talla')
              : []
            const eligeColor =
              comboPermiteElegirColor && prod && componenteTieneColoresElegibles(prod)
            const eligeTalla =
              comboPermiteElegirTalla && prod && componenteTieneTallasElegibles(prod)
            const variantesFijas = eligeColor ? [] : variantes
            return (
              <li
                key={`${c.productId}-${i}`}
                className="rounded-xl border border-neutral-200/70 bg-white p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-mc-100">
                    {(c.imageUrlSnapshot ?? prod?.imageUrl) ? (
                      <img
                        src={c.imageUrlSnapshot ?? prod?.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium leading-snug">
                      {c.nombreSnapshot ?? prod?.nombre ?? 'Producto'}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-mc-600">
                      {comboComponenteEtiqueta(c, prod, {
                        comboPermiteElegirColor,
                        comboPermiteElegirTalla,
                      })}
                    </p>
                    {eligeColor ? (
                      <p className="mt-1 text-[12px] font-medium text-[var(--mc-landing-gold-dark)]">
                        El cliente elige el color al comprar
                      </p>
                    ) : null}
                    {eligeTalla ? (
                      <p className="mt-1 text-[12px] font-medium text-[var(--mc-landing-gold-dark)]">
                        El cliente elige la talla al comprar
                      </p>
                    ) : null}
                    {!prod ? (
                      <p className="mt-1 text-[12px] text-red-600">Producto no encontrado</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-medium text-red-700 hover:bg-red-50"
                    onClick={() => removeAt(i)}
                  >
                    Quitar
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-mc-500">Cantidad</span>
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      className="mc-input bg-white py-2 text-[14px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      value={c.cantidad > 0 ? String(c.cantidad) : ''}
                      placeholder="1"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '')
                        if (raw === '') {
                          updateAt(i, { cantidad: 0 })
                          return
                        }
                        updateAt(i, { cantidad: Math.max(1, Math.floor(Number(raw))) })
                      }}
                      onBlur={() => {
                        if (c.cantidad < 1) updateAt(i, { cantidad: 1 })
                      }}
                    />
                  </label>
                  {tallas.length > 0 && !eligeTalla ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-mc-500">Talla</span>
                      <select
                        className="mc-input bg-white py-2 text-[14px]"
                        value={c.tallaId ?? ''}
                        onChange={(e) => updateAt(i, { tallaId: e.target.value || undefined })}
                      >
                        <option value="">Elegir…</option>
                        {tallas.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre} ({t.stock})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {variantesFijas.length > 0 ? (
                    <label className="flex flex-col gap-1 sm:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-mc-500">Variante</span>
                      <select
                        className="mc-input bg-white py-2 text-[14px]"
                        value={c.varianteId ?? ''}
                        onChange={(e) => updateAt(i, { varianteId: e.target.value || undefined })}
                      >
                        <option value="">Elegir…</option>
                        {variantesFijas.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!pickerOpen ? (
        <button type="button" className="mc-btn-secondary w-full py-2.5" onClick={() => setPickerOpen(true)}>
          + Agregar producto del inventario
        </button>
      ) : (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--mc-landing-gold-dark)_22%,white)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_8%,white)] p-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--mc-landing-gold-dark)]">
            Buscar en inventario
          </p>
          <input
            className="mc-input mt-2 bg-white"
            placeholder="Filtrar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-neutral-200/70 bg-white">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-[13px] text-mc-500">
                {products.length === 0
                  ? 'No hay productos en inventario. Creá productos antes de armar el combo.'
                  : 'Sin resultados para esa búsqueda.'}
              </li>
            ) : (
              filtered.map((p) => (
                <li key={p.id} className="border-b border-neutral-100 last:border-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[14px] hover:bg-mc-50"
                    onClick={() => addProduct(p)}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{p.nombre}</span>
                    {p.esRopa ? (
                      <span className="shrink-0 rounded-full bg-mc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-mc-600">
                        Ropa
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
          <button
            type="button"
            className="mt-2 text-[13px] font-medium text-mc-600 underline"
            onClick={() => setPickerOpen(false)}
          >
            Cerrar buscador
          </button>
        </div>
      )}
    </div>
  )
}
