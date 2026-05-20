import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { getDb, getStorageApp, firebaseStorageConfigured } from '@/lib/firebase'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { formatIntegerEsCo } from '@/lib/formatCop'
import { mcProductosCollection } from '@/lib/mcCollections'
import { mcCreateProducto, ProductLimitError } from '@/lib/mcWrites'
import type { McPlatformSettings, McProductoVariante, McTenant } from '@/types/mc'

type VarianteDraft = {
  id: string
  nombre: string
  hex: string
  precio: string
}

function parsePrecioOpcional(raw: string): number | undefined {
  const d = raw.replace(/\D/g, '')
  if (!d) return undefined
  const n = Number(d)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function QuickAddProductModal({
  tenantId,
  platformSettings,
  nextOrden,
  onClose,
}: {
  tenantId: string
  tenant: McTenant
  platformSettings: McPlatformSettings | null
  currentCount: number
  nextOrden: number
  onClose: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [marcarNovedad, setMarcarNovedad] = useState(false)
  const [variantes, setVariantes] = useState<VarianteDraft[]>([])

  function onPrecioChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') {
      setPrecio('')
      return
    }
    const n = Number(digits)
    if (!Number.isFinite(n)) {
      setPrecio('')
      return
    }
    setPrecio(formatIntegerEsCo(n))
  }

  function onStockChange(raw: string) {
    setStock(raw.replace(/\D/g, ''))
  }

  function patchVariante(i: number, partial: Partial<VarianteDraft>) {
    setVariantes((prev) => prev.map((v, j) => (j === i ? { ...v, ...partial } : v)))
  }

  function onPrecioVariante(i: number, raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') {
      patchVariante(i, { precio: '' })
      return
    }
    const n = Number(digits)
    if (!Number.isFinite(n)) {
      patchVariante(i, { precio: '' })
      return
    }
    patchVariante(i, { precio: formatIntegerEsCo(n) })
  }

  function addVariante() {
    setVariantes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nombre: '', hex: '#525252', precio: '' },
    ])
  }

  function removeVariante(i: number) {
    setVariantes((prev) => prev.filter((_, j) => j !== i))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const precioNum = Number(precio.replace(/\D/g, ''))
    const stockNum = Number(stock.replace(/\D/g, ''))
    if (!nombre.trim()) {
      setErr('Poné un nombre corto.')
      return
    }
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setErr('Precio inválido.')
      return
    }

    const varianteRows = variantes.filter((v) => v.nombre.trim())
    for (const v of varianteRows) {
      if (v.precio.trim() && parsePrecioOpcional(v.precio) == null) {
        setErr(`Precio opcional inválido en variante «${v.nombre.trim()}».`)
        return
      }
    }

    setBusy(true)
    try {
      const builtVar: McProductoVariante[] = varianteRows.map((v) => {
        const pc = parsePrecioOpcional(v.precio)
        const item: McProductoVariante = {
          id: v.id,
          nombre: v.nombre.trim(),
          hex: v.hex?.trim() || undefined,
        }
        if (pc != null) item.precioCop = pc
        return item
      })

      const { id: productId } = await mcCreateProducto(
        tenantId,
        {
          nombre: nombre.trim(),
          precioCop: precioNum,
          stock: Number.isFinite(stockNum) ? stockNum : 0,
          activo: true,
          enCatalogo: true,
          orden: nextOrden,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...(marcarNovedad ? { marcarNovedad: true } : {}),
          ...(builtVar.length > 0 ? { variantes: builtVar } : {}),
        },
        platformSettings,
      )

      if (file && firebaseStorageConfigured) {
        const storage = getStorageApp()
        const pathRef = ref(storage, `mc_tenants/${tenantId}/productos/${productId}.jpg`)
        const optimized = await compressImageForUpload(file)
        await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
        const imageUrl = await getDownloadURL(pathRef)
        await updateDoc(doc(getDb(), mcProductosCollection(tenantId), productId), { imageUrl })
      }

      onClose()
    } catch (e) {
      if (e instanceof ProductLimitError) {
        setErr(e.message)
      } else {
        setErr('No se pudo guardar. Revisá conexión y reglas de Firebase.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-lg border border-neutral-200/50 bg-white p-5 sm:rounded-lg">
        <h2 className="ios-headline">Agregar artículo</h2>
        <p className="ios-footnote mt-1.5 text-mc-600">
          Ideal desde el celular: sacá la foto o elegí de la galería. La imagen se optimiza al subir para ocupar menos
          espacio.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="ios-footnote font-medium text-mc-700">Foto</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1.5 w-full text-[15px] text-mc-600 file:mr-3 file:rounded-md file:border file:border-neutral-200/70 file:bg-neutral-50 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-mc-900"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Nombre</label>
            <input className="mc-input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300"
              checked={marcarNovedad}
              onChange={(e) => setMarcarNovedad(e.target.checked)}
            />
            <span className="ios-footnote leading-relaxed text-mc-700">
              Destacar como novedad siempre (además del período automático de 3 semanas desde el alta)
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ios-footnote font-medium text-mc-700">Precio (COP)</label>
              <input
                className="mc-input"
                inputMode="numeric"
                value={precio}
                onChange={(e) => onPrecioChange(e.target.value)}
                placeholder="25.000"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Stock</label>
              <input
                className="mc-input"
                inputMode="numeric"
                value={stock}
                onChange={(e) => onStockChange(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="rounded-md border border-neutral-200/60 bg-mc-50/40 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <label className="ios-footnote font-semibold text-mc-800">Colores u opciones (opcional)</label>
              <button type="button" className="text-[13px] font-medium text-mc-900 underline" onClick={addVariante}>
                + Añadir
              </button>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
              Cada variante lleva nombre (ej. «Negro»), muestra de color y, si querés, otro precio. En el catálogo el
              cliente elige antes de comprar.
            </p>
            {variantes.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {variantes.map((v, i) => (
                  <li key={v.id} className="rounded-md border border-neutral-200/50 bg-white p-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="sm:col-span-1">
                        <span className="text-[11px] font-medium text-mc-600">Nombre</span>
                        <input
                          className="mc-input mt-1 py-2 text-[14px]"
                          value={v.nombre}
                          onChange={(e) => patchVariante(i, { nombre: e.target.value })}
                          placeholder="Rojo"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-mc-600">Color</span>
                        <input
                          type="color"
                          className="mt-1 h-10 w-full cursor-pointer rounded-md border border-neutral-200/70"
                          value={v.hex}
                          onChange={(e) => patchVariante(i, { hex: e.target.value })}
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-mc-600">Precio (opc.)</span>
                        <input
                          className="mc-input mt-1 py-2 text-[14px]"
                          inputMode="numeric"
                          value={v.precio}
                          onChange={(e) => onPrecioVariante(i, e.target.value)}
                          placeholder="Igual al base"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-[12px] text-mc-500 underline"
                      onClick={() => removeVariante(i)}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {err && <p className="ios-subhead text-red-800">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" className="mc-btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="mc-btn-primary flex-1">
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
