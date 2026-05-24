import { useState } from 'react'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { ProductoDescuentoEditor, parseProductoDescuentoDraft, productoDescuentoDraftFromProduct } from '@/components/producto/ProductoDescuentoEditor'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import { ProductoImagenesEditor } from '@/components/producto/ProductoImagenesEditor'
import { ProductoOpcionToggle } from '@/components/producto/ProductoOpcionToggle'
import { ProductoTallasEditor } from '@/components/producto/ProductoTallasEditor'
import { ProductoVariantesEditor } from '@/components/producto/ProductoVariantesEditor'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb, getStorageApp, firebaseStorageConfigured } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import {
  imagenDraftFromProducto,
  uploadProductoImagenes,
  uploadVarianteImagen,
  type ProductoImagenDraft,
} from '@/lib/productoImagenes'
import { formatIntegerEsCo } from '@/lib/formatCop'
import {
  buildTallasFromDrafts,
  createCurvaTallasDraft,
  sumarStockTallas,
  tallasDraftFromProducto,
  type TallaDraft,
} from '@/lib/productoTallas'
import {
  buildVarianteFromDraft,
  parsePrecioVarianteOpcional,
  sumarStockVariantes,
  variantesConStockDefinido,
  variantesDraftFromProducto,
} from '@/lib/productoVariantes'
import type { McProducto, McProductoVariante } from '@/types/mc'

export function EditProductModal({
  tenantId,
  product,
  onClose,
}: {
  tenantId: string
  product: McProducto & { id: string }
  onClose: () => void
}) {
  const initialImagenes = imagenDraftFromProducto(product)
  const [esRopa] = useState(!!product.esRopa)
  const [nombre, setNombre] = useState(product.nombre)
  const [descripcion, setDescripcion] = useState(product.descripcion ?? '')
  const [precio, setPrecio] = useState(
    product.precioCop > 0 ? formatIntegerEsCo(product.precioCop) : '',
  )
  const [stock, setStock] = useState(String(product.stock ?? 0))
  const [marcarNovedad, setMarcarNovedad] = useState(!!product.marcarNovedad)
  const [mostrarDescargaImagen, setMostrarDescargaImagen] = useState(!!product.mostrarDescargaImagen)
  const [imagenes, setImagenes] = useState<ProductoImagenDraft[]>(initialImagenes.items)
  const [coverId, setCoverId] = useState<string | null>(initialImagenes.coverId)
  const [tallas, setTallas] = useState<TallaDraft[]>(() =>
    product.esRopa
      ? tallasDraftFromProducto(product).length > 0
        ? tallasDraftFromProducto(product)
        : createCurvaTallasDraft()
      : [],
  )
  const [variantes, setVariantes] = useState(() => variantesDraftFromProducto(product))
  const [descuento, setDescuento] = useState(() => productoDescuentoDraftFromProduct(product))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const { showSaveSuccess } = useSaveSuccess()
  const tieneVariantes = variantes.length > 0

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

    const descParsed = parseProductoDescuentoDraft(descuento, precioNum)
    if (!descParsed.ok) {
      setErr(descParsed.error)
      return
    }

    for (const v of variantes) {
      if (!v.nombre.trim()) continue
      if (v.precio.trim() && parsePrecioVarianteOpcional(v.precio) == null) {
        setErr(`Precio opcional inválido en «${v.nombre.trim()}».`)
        return
      }
    }

    const varianteRows = variantes.filter((v) => v.nombre.trim())
    const builtTallas = esRopa ? buildTallasFromDrafts(tallas) : []
    if (esRopa && sumarStockTallas(builtTallas) <= 0) {
      setErr('Indicá stock en al menos una talla.')
      return
    }

    const hasNewUploads = imagenes.some((i) => i.kind === 'new') || varianteRows.some((v) => v.file)
    if (hasNewUploads && !firebaseStorageConfigured) {
      setErr('Firebase Storage no está configurado; no se pueden subir imágenes.')
      return
    }

    setBusy(true)
    try {
      const db = getDb()
      const refDoc = doc(db, mcProductosCollection(tenantId), product.id)
      const storage = firebaseStorageConfigured ? getStorageApp() : null

      let imageUrl: string | undefined = product.imageUrl
      let galeriaImagenes: string[] | undefined = product.galeriaImagenes

      if (imagenes.length === 0) {
        imageUrl = undefined
        galeriaImagenes = undefined
      } else if (storage) {
        const uploaded = await uploadProductoImagenes(storage, tenantId, product.id, imagenes, coverId)
        imageUrl = uploaded.imageUrl
        galeriaImagenes = uploaded.galeriaImagenes
      } else {
        const effectiveCoverId = coverId && imagenes.some((i) => i.id === coverId) ? coverId : imagenes[0]!.id
        const coverItem = imagenes.find((i) => i.id === effectiveCoverId)
        if (coverItem?.kind === 'existing') {
          imageUrl = coverItem.url
          galeriaImagenes = imagenes
            .filter((i) => i.id !== effectiveCoverId && i.kind === 'existing')
            .map((i) => (i as { url: string }).url)
        }
      }

      const builtVariantes: McProductoVariante[] = []
      for (const v of varianteRows) {
        let vImg = v.imageUrl
        if (v.file && storage) {
          vImg = await uploadVarianteImagen(storage, tenantId, product.id, v.id, v.file)
        }
        const item = buildVarianteFromDraft(v)
        if (!item) continue
        if (esRopa) delete item.stock
        if (vImg) item.imageUrl = vImg
        builtVariantes.push(item)
      }

      let stockFinal = Number.isFinite(stockNum) ? stockNum : 0
      if (esRopa) {
        stockFinal = sumarStockTallas(builtTallas)
      } else if (builtVariantes.length > 0 && variantesConStockDefinido(builtVariantes)) {
        stockFinal = sumarStockVariantes(builtVariantes)
      }

      await updateDoc(refDoc, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() ? descripcion.trim() : deleteField(),
        precioCop: precioNum,
        stock: stockFinal,
        updatedAt: Date.now(),
        imageUrl: imageUrl ?? deleteField(),
        marcarNovedad,
        mostrarDescargaImagen,
        esRopa: esRopa ? true : deleteField(),
        tallas: esRopa && builtTallas.length > 0 ? builtTallas : deleteField(),
        ...(descParsed.fields.descuentoActivo
          ? descParsed.fields
          : {
              descuentoActivo: false,
              descuentoTipo: deleteField(),
              descuentoValor: deleteField(),
            }),
        galeriaImagenes: galeriaImagenes && galeriaImagenes.length > 0 ? galeriaImagenes : deleteField(),
        variantes: builtVariantes.length > 0 ? builtVariantes : deleteField(),
      })

      showSaveSuccess({
        title: 'Cambios guardados',
        message: 'El producto se actualizó correctamente.',
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
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-neutral-200/50 bg-neutral-50 p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="ios-headline">Editar artículo</h2>
            <p className="ios-footnote mt-1.5 text-mc-600">
              {esRopa
                ? 'Prenda de vestir: stock por talla y variantes de color o tela.'
                : 'Actualizá datos, fotos y variantes.'}
            </p>
          </div>
          {esRopa ? (
            <span className="shrink-0 rounded-full bg-mc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Ropa
            </span>
          ) : null}
        </div>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <ProductoFormSection>
            <ProductoImagenesEditor
              items={imagenes}
              coverId={coverId}
              onChange={(next, nextCover) => {
                setImagenes(next)
                setCoverId(nextCover)
              }}
              disabled={busy}
            />
          </ProductoFormSection>

          <ProductoFormSection title="Información básica">
            <div className="space-y-3">
              <div>
                <label className="ios-footnote font-medium text-mc-700">Nombre</label>
                <input className="mc-input bg-white" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div>
                <label className="ios-footnote font-medium text-mc-700">Descripción (opcional)</label>
                <textarea
                  className="mc-input mt-1.5 min-h-[5.5rem] resize-y bg-white py-2.5 text-[15px] leading-relaxed"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Material, medidas, cuidados, variantes disponibles…"
                  rows={3}
                />
                <p className="mt-1 text-[12px] leading-relaxed text-mc-500">
                  Se muestra en la ficha del producto en tu catálogo público.
                </p>
              </div>
            </div>
          </ProductoFormSection>

          <ProductoFormSection title="Precio y stock">
            {esRopa ? (
              <div className="space-y-4">
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Precio base (COP)</label>
                  <input
                    className="mc-input mt-1.5 bg-white"
                    inputMode="numeric"
                    value={precio}
                    onChange={(e) => onPrecioChange(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <ProductoTallasEditor tallas={tallas} onChange={setTallas} disabled={busy} />
              </div>
            ) : (
              <div className={tieneVariantes ? 'space-y-2' : 'grid grid-cols-2 gap-3'}>
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Precio base (COP)</label>
                  <input
                    className="mc-input mt-1.5 bg-white"
                    inputMode="numeric"
                    value={precio}
                    onChange={(e) => onPrecioChange(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                {!tieneVariantes ? (
                  <div>
                    <label className="ios-footnote font-medium text-mc-700">Stock</label>
                    <input
                      className="mc-input mt-1.5 bg-white"
                      inputMode="numeric"
                      value={stock}
                      onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
                      autoComplete="off"
                    />
                  </div>
                ) : (
                  <p className="text-[12px] leading-relaxed text-mc-600">
                    El stock total se calcula sumando el de cada variante.
                  </p>
                )}
              </div>
            )}
          </ProductoFormSection>

          <ProductoDescuentoEditor
            draft={descuento}
            onChange={setDescuento}
            precioBaseCop={Number(precio.replace(/\D/g, '')) || 0}
            disabled={busy}
          />

          <ProductoVariantesEditor
            variantes={variantes}
            onChange={setVariantes}
            allowImage
            esRopa={esRopa}
            disabled={busy}
          />

          <ProductoFormSection>
            <div className="space-y-2.5">
              <ProductoOpcionToggle
                checked={marcarNovedad}
                onChange={setMarcarNovedad}
                disabled={busy}
                title="Destacar siempre como novedad"
              />
              <ProductoOpcionToggle
                checked={mostrarDescargaImagen}
                onChange={setMostrarDescargaImagen}
                disabled={busy}
                title="Mostrar botón «Descargar imagen»"
                description="Ideal para mayoristas que necesitan bajar la foto del producto desde el catálogo."
              />
            </div>
          </ProductoFormSection>

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
