import { useState } from 'react'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { getDb, getStorageApp, firebaseStorageConfigured } from '@/lib/firebase'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { formatIntegerEsCo } from '@/lib/formatCop'
import { mcProductosCollection } from '@/lib/mcCollections'
import type { McProducto, McProductoVariante } from '@/types/mc'

type VarianteDraft = {
  id: string
  nombre: string
  hex: string
  precio: string
  file: File | null
  imageUrl?: string
}

function parsePrecioVariante(raw: string): number | undefined {
  const d = raw.replace(/\D/g, '')
  if (!d) return undefined
  const n = Number(d)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function EditProductModal({
  tenantId,
  product,
  onClose,
}: {
  tenantId: string
  product: McProducto & { id: string }
  onClose: () => void
}) {
  const [nombre, setNombre] = useState(product.nombre)
  const [precio, setPrecio] = useState(
    product.precioCop > 0 ? formatIntegerEsCo(product.precioCop) : '',
  )
  const [stock, setStock] = useState(String(product.stock ?? 0))
  const [marcarNovedad, setMarcarNovedad] = useState(!!product.marcarNovedad)
  const [mainFile, setMainFile] = useState<File | null>(null)
  const [galeriaFiles, setGaleriaFiles] = useState<File[]>([])
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>(product.galeriaImagenes ?? [])
  const [variantes, setVariantes] = useState<VarianteDraft[]>(
    (product.variantes ?? []).map((v) => ({
      id: v.id,
      nombre: v.nombre,
      hex: v.hex ?? '#525252',
      precio: v.precioCop != null && v.precioCop > 0 ? formatIntegerEsCo(v.precioCop) : '',
      file: null,
      imageUrl: v.imageUrl,
    })),
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

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

  function patchVariante(i: number, partial: Partial<VarianteDraft>) {
    setVariantes((prev) => prev.map((v, j) => (j === i ? { ...v, ...partial } : v)))
  }

  function addVariante() {
    setVariantes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nombre: '', hex: '#525252', precio: '', file: null },
    ])
  }

  function removeVariante(i: number) {
    setVariantes((prev) => prev.filter((_, j) => j !== i))
  }

  function removeGaleriaUrl(url: string) {
    setGaleriaUrls((prev) => prev.filter((u) => u !== url))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const precioNum = Number(precio.replace(/\D/g, ''))
    const stockNum = Number(stock.replace(/\D/g, ''))
    if (!nombre.trim()) {
      setErr('Poné un nombre.')
      return
    }
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      setErr('Precio inválido.')
      return
    }

    const varianteRows = variantes.filter((v) => v.nombre.trim())
    for (const v of varianteRows) {
      if (v.precio.trim() && parsePrecioVariante(v.precio) == null) {
        setErr(`Precio opcional inválido en «${v.nombre.trim()}».`)
        return
      }
    }

    if (!firebaseStorageConfigured && (mainFile || galeriaFiles.length || varianteRows.some((v) => v.file))) {
      setErr('Firebase Storage no está configurado; no se pueden subir imágenes.')
      return
    }

    setBusy(true)
    try {
      const db = getDb()
      const refDoc = doc(db, mcProductosCollection(tenantId), product.id)
      const storage = firebaseStorageConfigured ? getStorageApp() : null

      let imageUrl: string | undefined = product.imageUrl
      if (mainFile && storage) {
        const pathRef = ref(storage, `mc_tenants/${tenantId}/productos/${product.id}.jpg`)
        const optimized = await compressImageForUpload(mainFile)
        await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
        imageUrl = await getDownloadURL(pathRef)
      }

      const nextGaleria = [...galeriaUrls]
      if (galeriaFiles.length && storage) {
        for (const file of galeriaFiles) {
          const token = crypto.randomUUID()
          const pathRef = ref(storage, `mc_tenants/${tenantId}/productos/${product.id}_g_${token}.jpg`)
          const optimized = await compressImageForUpload(file)
          await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
          const url = await getDownloadURL(pathRef)
          nextGaleria.push(url)
        }
      }

      const builtVariantes: McProductoVariante[] = []
      for (const v of varianteRows) {
        let vImg = v.imageUrl
        if (v.file && storage) {
          const pathRef = ref(storage, `mc_tenants/${tenantId}/productos/${product.id}_v_${v.id}.jpg`)
          const optimized = await compressImageForUpload(v.file)
          await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
          vImg = await getDownloadURL(pathRef)
        }
        const pc = parsePrecioVariante(v.precio)
        const item: McProductoVariante = {
          id: v.id,
          nombre: v.nombre.trim(),
          hex: v.hex?.trim() || undefined,
        }
        if (pc != null) item.precioCop = pc
        if (vImg) item.imageUrl = vImg
        builtVariantes.push(item)
      }

      await updateDoc(refDoc, {
        nombre: nombre.trim(),
        precioCop: precioNum,
        stock: Number.isFinite(stockNum) ? stockNum : 0,
        updatedAt: Date.now(),
        imageUrl: imageUrl ?? deleteField(),
        marcarNovedad,
        galeriaImagenes: nextGaleria.length > 0 ? nextGaleria : deleteField(),
        variantes: builtVariantes.length > 0 ? builtVariantes : deleteField(),
      })

      onClose()
    } catch {
      setErr('No se pudo guardar. Revisá conexión y permisos.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-lg border border-neutral-200/50 bg-white p-5 sm:rounded-lg">
        <h2 className="ios-headline">Editar artículo</h2>
        <p className="ios-footnote mt-1.5 text-mc-600">
          Actualizá datos, fotos extra, y colores u opciones con precio propio si hace falta.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-5">
          <div>
            <label className="ios-footnote font-medium text-mc-700">Nombre</label>
            <input className="mc-input mt-1.5" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ios-footnote font-medium text-mc-700">Precio base (COP)</label>
              <input
                className="mc-input mt-1.5"
                inputMode="numeric"
                value={precio}
                onChange={(e) => onPrecioChange(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Stock</label>
              <input
                className="mc-input mt-1.5"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
                autoComplete="off"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300"
              checked={marcarNovedad}
              onChange={(e) => setMarcarNovedad(e.target.checked)}
            />
            <span className="ios-footnote text-mc-700">Destacar siempre como novedad</span>
          </label>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Nueva foto principal (opcional)</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1.5 w-full text-[15px] text-mc-600 file:mr-3 file:rounded-md file:border file:border-neutral-200/70 file:bg-neutral-50 file:px-3 file:py-2 file:text-[13px]"
              onChange={(e) => setMainFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Galería — fotos actuales</label>
            <ul className="mt-2 space-y-1.5">
              {galeriaUrls.length === 0 ? (
                <li className="text-[13px] text-mc-500">Ninguna</li>
              ) : (
                galeriaUrls.map((url) => (
                  <li key={url} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 truncate text-mc-700">{url.slice(-28)}</span>
                    <button type="button" className="shrink-0 text-red-700 underline" onClick={() => removeGaleriaUrl(url)}>
                      Quitar
                    </button>
                  </li>
                ))
              )}
            </ul>
            <label className="mt-2 block ios-footnote font-medium text-mc-700">Agregar fotos a la galería</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-1.5 w-full text-[15px] text-mc-600 file:mr-3 file:rounded-md file:border file:border-neutral-200/70 file:bg-neutral-50 file:px-3 file:py-2 file:text-[13px]"
              onChange={(e) => setGaleriaFiles(Array.from(e.target.files ?? []))}
            />
          </div>

          <div className="rounded-md border border-neutral-200/60 bg-mc-50/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="ios-footnote font-semibold text-mc-800">Variantes (color / opción)</p>
              <button type="button" className="text-[13px] font-medium text-mc-900 underline" onClick={addVariante}>
                + Añadir
              </button>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
              Nombre obligatorio por fila. Color y precio propio opcionales. Podés subir una foto por variante.
            </p>
            <ul className="mt-3 space-y-4">
              {variantes.map((v, i) => (
                <li key={v.id} className="rounded-md border border-neutral-200/50 bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Nombre</label>
                      <input
                        className="mc-input mt-1 py-2 text-[14px]"
                        value={v.nombre}
                        onChange={(e) => patchVariante(i, { nombre: e.target.value })}
                        placeholder="Ej. Azul marino"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Muestra de color</label>
                      <input
                        type="color"
                        className="mt-1 h-10 w-full cursor-pointer rounded-md border border-neutral-200/70"
                        value={v.hex}
                        onChange={(e) => patchVariante(i, { hex: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Precio COP (opcional)</label>
                      <input
                        className="mc-input mt-1 py-2 text-[14px]"
                        inputMode="numeric"
                        value={v.precio}
                        onChange={(e) => onPrecioVariante(i, e.target.value)}
                        placeholder="Vacío = precio base"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-mc-600">Foto variante (opcional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-1 w-full text-[13px] file:rounded file:border file:bg-neutral-50 file:px-2 file:py-1"
                        onChange={(e) => patchVariante(i, { file: e.target.files?.[0] ?? null })}
                      />
                      {v.imageUrl && !v.file && (
                        <p className="mt-1 text-[11px] text-mc-500">Hay imagen guardada para esta variante.</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-[12px] text-mc-500 underline"
                    onClick={() => removeVariante(i)}
                  >
                    Eliminar variante
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {err && <p className="ios-subhead text-red-800">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" className="mc-btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="mc-btn-primary flex-1">
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
