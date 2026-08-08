import { useEffect, useState } from 'react'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { ProductoDescuentoEditor, parseProductoDescuentoDraft, productoDescuentoDraftFromProduct } from '@/components/producto/ProductoDescuentoEditor'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import { ProductoImagenesEditor } from '@/components/producto/ProductoImagenesEditor'
import { ProductoOpcionToggle } from '@/components/producto/ProductoOpcionToggle'
import { ProductoTallasEditor } from '@/components/producto/ProductoTallasEditor'
import { ProductoRopaSkuMatrixEditor } from '@/components/producto/ProductoRopaSkuMatrixEditor'
import { ProductoZapatosColoresEditor } from '@/components/producto/ProductoZapatosColoresEditor'
import { ProductoVariantesEditor } from '@/components/producto/ProductoVariantesEditor'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb, getStorageApp, firebaseStorageConfigured } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import { productSaveErrorMessage } from '@/lib/mcSaveError'
import {
  imagenDraftFromProducto,
  resolveImagenesFromDrafts,
  uploadProductoImagenes,
  uploadVarianteImagen,
  type ProductoImagenDraft,
} from '@/lib/productoImagenes'
import { formatIntegerEsCo } from '@/lib/formatCop'
import {
  buildRopaStockPayload,
  ensureSkuDraftMatrix,
  ropaUsaMatrizEnForm,
  skusDraftFromProducto,
  type SkuDraft,
} from '@/lib/productoSkus'
import {
  buildTallasFromDrafts,
  createCurvaTallasDraft,
  createCurvaZapatosDraft,
  getTallaModoFromProducto,
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
import { ProductoCategoriasPicker } from '@/components/producto/ProductoCategoriasPicker'
import { ProductoReferenciaPreview } from '@/components/producto/ProductoReferenciaPreview'
import { useTenantCategorias } from '@/hooks/useTenantCategorias'
import { categoriasNavFromProductForm, clearQuickAddDraft } from '@/lib/productFormCategoriaNav'
import { isProductoBorrador } from '@/lib/productoFormDraft'
import { resolveProductoReferencia } from '@/lib/productoReferencia'
import {
  buildZapatosStockPayload,
  coloresZapatosDraftFromProducto,
  coloresZapatosTienenStock,
  colorZapatoToVariante,
  productImageFromZapatosVariantes,
  resolveImagenPrincipalColorId,
  uploadColoresZapatosVariantes,
  type ColorZapatoDraft,
} from '@/lib/productoZapatos'
import { markPosProductPublished, refreshComboCatalogStocksUsingComponent } from '@/pos/lib/posCatalogSync'

export function EditProductModal({
  tenantId,
  product,
  onClose,
  initialCategoriaIds,
}: {
  tenantId: string
  product: McProducto & { id: string }
  onClose: () => void
  initialCategoriaIds?: string[]
}) {
  const initialImagenes = imagenDraftFromProducto(product)
  const [esRopa] = useState(!!product.esRopa)
  const [tallaModo] = useState(() => getTallaModoFromProducto(product))
  const esZapatosForm = esRopa && tallaModo === 'zapatos'
  const esRopaForm = esRopa && tallaModo === 'ropa'
  const [nombre, setNombre] = useState(product.nombre)
  const referenciaPreview = resolveProductoReferencia(nombre, {
    referenciaActual: product.referencia,
  })
  const [descripcion, setDescripcion] = useState(product.descripcion ?? '')
  const [precio, setPrecio] = useState(
    product.precioCop > 0 ? formatIntegerEsCo(product.precioCop) : '',
  )
  const [precioCosto, setPrecioCosto] = useState(
    product.precioCostoCop != null && product.precioCostoCop > 0
      ? formatIntegerEsCo(product.precioCostoCop)
      : '',
  )
  const [stock, setStock] = useState(String(product.stock ?? 0))
  const [marcarNovedad, setMarcarNovedad] = useState(!!product.marcarNovedad)
  const [mostrarDescargaImagen, setMostrarDescargaImagen] = useState(!!product.mostrarDescargaImagen)
  const [mostrarBotonDocena, setMostrarBotonDocena] = useState(!!product.mostrarBotonDocena)
  const [mostrarStockCatalogo, setMostrarStockCatalogo] = useState(!!product.mostrarStockCatalogo)
  const [imagenes, setImagenes] = useState<ProductoImagenDraft[]>(initialImagenes.items)
  const [coverId, setCoverId] = useState<string | null>(initialImagenes.coverId)
  const [tallas, setTallas] = useState<TallaDraft[]>(() => {
    if (!product.esRopa) return []
    const fromProduct = tallasDraftFromProducto(product)
    if (fromProduct.length > 0) return fromProduct
    return getTallaModoFromProducto(product) === 'zapatos'
      ? createCurvaZapatosDraft()
      : createCurvaTallasDraft()
  })
  const [coloresZapatos, setColoresZapatos] = useState<ColorZapatoDraft[]>(() =>
    esRopa && getTallaModoFromProducto(product) === 'zapatos'
      ? coloresZapatosDraftFromProducto(product)
      : [],
  )
  const [imagenPrincipalColorId, setImagenPrincipalColorId] = useState<string | null>(() =>
    esRopa && getTallaModoFromProducto(product) === 'zapatos'
      ? resolveImagenPrincipalColorId(
          coloresZapatosDraftFromProducto(product),
          product.imagenPrincipalColorId ?? null,
        )
      : null,
  )
  const [variantes, setVariantes] = useState(() => variantesDraftFromProducto(product))
  const [skuMatrix, setSkuMatrix] = useState<SkuDraft[]>(() => skusDraftFromProducto(product))
  const [descuento, setDescuento] = useState(() => productoDescuentoDraftFromProduct(product))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [categoriaIds, setCategoriaIds] = useState<string[]>(
    () => initialCategoriaIds ?? product.categoriaIds ?? [],
  )

  const { categorias } = useTenantCategorias(tenantId)

  const esBorrador = isProductoBorrador(product)

  const createCategoriasNav = categoriasNavFromProductForm(
    { mode: 'edit', productId: product.id, categoriaIds },
    '← Editar producto',
  )

  const { showSaveSuccess } = useSaveSuccess()
  const tieneVariantes = variantes.length > 0
  const colorRows = variantes.filter((v) => v.nombre.trim())
  const usaMatrizRopa = ropaUsaMatrizEnForm(esRopaForm, colorRows.length)
  const colorMatrixKey = colorRows.map((v) => `${v.id}:${v.nombre.trim()}`).join('|')
  const tallaMatrixKey = tallas.map((t) => `${t.id}:${t.nombre}`).join('|')

  useEffect(() => {
    if (!usaMatrizRopa) return
    const builtTallas = buildTallasFromDrafts(tallas)
    const builtVar = colorRows
      .map((v) => buildVarianteFromDraft(v))
      .filter((v): v is McProductoVariante => v != null)
    setSkuMatrix((prev) => ensureSkuDraftMatrix(builtVar, builtTallas, prev))
  }, [usaMatrizRopa, tallaMatrixKey, colorMatrixKey])

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

  function onPrecioCostoChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits === '') {
      setPrecioCosto('')
      return
    }
    const n = Number(digits)
    if (!Number.isFinite(n)) {
      setPrecioCosto('')
      return
    }
    setPrecioCosto(formatIntegerEsCo(n))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const precioNum = Number(precio.replace(/\D/g, ''))
    const precioCostoNum = precioCosto.replace(/\D/g, '') ? Number(precioCosto.replace(/\D/g, '')) : undefined
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
    let builtVarPreview: McProductoVariante[] = []
    let stockPayload: ReturnType<typeof buildRopaStockPayload> | null = null

    if (esZapatosForm) {
      const coloresConNombre = coloresZapatos.filter((c) => c.nombre.trim())
      if (coloresConNombre.length === 0) {
        setErr('Agregá al menos un color con su curva de tallas.')
        return
      }
      for (const c of coloresConNombre) {
        if (c.tallas.some((t) => !t.nombre.trim())) {
          setErr(`Completá el número de todas las tallas del color «${c.nombre.trim()}».`)
          return
        }
      }
      builtVarPreview = coloresConNombre
        .map((c) => colorZapatoToVariante(c))
        .filter((v): v is McProductoVariante => v != null)
      stockPayload = buildZapatosStockPayload(coloresConNombre)
      if (!coloresZapatosTienenStock(coloresConNombre)) {
        setErr('Indicá stock en al menos una talla de algún color.')
        return
      }
    } else if (esRopaForm) {
      const builtTallas = buildTallasFromDrafts(tallas)
      builtVarPreview = varianteRows
        .map((v) => buildVarianteFromDraft(v))
        .filter((v): v is McProductoVariante => v != null)
        .map((item) => {
          delete item.stock
          return item
        })
      stockPayload = buildRopaStockPayload({ tallas: builtTallas, variantes: builtVarPreview, skuDrafts: skuMatrix })
      const tallasSinNombre = tallas.filter((t) => !t.nombre.trim())
      if (tallasSinNombre.length > 0) {
        setErr('Completá el nombre de todas las tallas antes de guardar.')
        return
      }
      if (stockPayload.usaMatriz && stockPayload.stockFinal <= 0) {
        setErr('Indicá stock en al menos una combinación color × talla.')
        return
      }
      if (!stockPayload.usaMatriz && sumarStockTallas(builtTallas) <= 0) {
        setErr('Indicá stock en al menos una talla.')
        return
      }
    }

    const hasNewUploads =
      (!esZapatosForm && imagenes.some((i) => i.kind === 'new')) ||
      (esZapatosForm
        ? coloresZapatos.some((c) => c.imagenes.some((i) => i.kind === 'new'))
        : varianteRows.some((v) => v.file))
    if (hasNewUploads && !firebaseStorageConfigured) {
      setErr('Firebase Storage no está configurado; no se pueden subir imágenes.')
      return
    }

    setBusy(true)
    try {
      const db = getDb()
      const refDoc = doc(db, mcProductosCollection(tenantId), product.id)
      const storage = firebaseStorageConfigured ? getStorageApp() : null

      let imageUrl: string | undefined = esZapatosForm ? product.imageUrl : product.imageUrl
      let galeriaImagenes: string[] | undefined = product.galeriaImagenes

      if (!esZapatosForm) {
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
      }

      const builtVariantes: McProductoVariante[] = []
      if (esZapatosForm) {
        const coloresConNombre = coloresZapatos.filter((row) => row.nombre.trim())
        if (storage) {
          builtVariantes.push(
            ...(await uploadColoresZapatosVariantes(storage, tenantId, product.id, coloresConNombre)),
          )
        } else {
          for (const c of coloresConNombre) {
            const imgs = c.imagenes.length > 0 ? resolveImagenesFromDrafts(c.imagenes, c.coverId) : {}
            const item = colorZapatoToVariante(c, imgs)
            if (item) builtVariantes.push(item)
          }
        }
      } else {
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
      }

      if (esZapatosForm) {
        galeriaImagenes = undefined
        const principalId = resolveImagenPrincipalColorId(
          coloresZapatos.filter((c) => c.nombre.trim()),
          imagenPrincipalColorId,
        )
        const prodImg = productImageFromZapatosVariantes(builtVariantes, principalId)
        imageUrl = prodImg.imageUrl
      }

      const principalColorIdZapatos = esZapatosForm
        ? resolveImagenPrincipalColorId(
            coloresZapatos.filter((c) => c.nombre.trim()),
            imagenPrincipalColorId,
          )
        : null

      let stockFinal = Number.isFinite(stockNum) ? stockNum : 0
      if (stockPayload) {
        stockFinal = stockPayload.stockFinal
      } else if (builtVariantes.length > 0 && variantesConStockDefinido(builtVariantes)) {
        stockFinal = sumarStockVariantes(builtVariantes)
      }

      await updateDoc(refDoc, {
        nombre: nombre.trim(),
        ...(referenciaPreview
          ? { referencia: referenciaPreview }
          : product.referencia
            ? { referencia: product.referencia }
            : {}),
        descripcion: descripcion.trim() ? descripcion.trim() : deleteField(),
        precioCop: precioNum,
        ...(precioCostoNum != null && Number.isFinite(precioCostoNum)
          ? { precioCostoCop: precioCostoNum }
          : { precioCostoCop: deleteField() }),
        stock: stockFinal,
        updatedAt: Date.now(),
        imageUrl: imageUrl ?? deleteField(),
        marcarNovedad,
        mostrarDescargaImagen,
        mostrarBotonDocena,
        mostrarStockCatalogo,
        esRopa: esRopa ? true : deleteField(),
        tallaModo: esRopa ? tallaModo : deleteField(),
        ...(esZapatosForm
          ? {
              imagenPrincipalColorId: principalColorIdZapatos ?? deleteField(),
              galeriaImagenes: deleteField(),
            }
          : {
              galeriaImagenes: galeriaImagenes && galeriaImagenes.length > 0 ? galeriaImagenes : deleteField(),
            }),
        tallas:
          esRopa && stockPayload && stockPayload.tallas.length > 0 ? stockPayload.tallas : deleteField(),
        skus:
          esRopa && stockPayload?.skus?.length ? stockPayload.skus : deleteField(),
        ...(descParsed.fields.descuentoActivo
          ? descParsed.fields
          : {
              descuentoActivo: false,
              descuentoTipo: deleteField(),
              descuentoValor: deleteField(),
            }),
        variantes: builtVariantes.length > 0 ? builtVariantes : deleteField(),
        categoriaIds: categoriaIds.length > 0 ? categoriaIds : deleteField(),
        ...(esBorrador
          ? {
              esBorrador: deleteField(),
              activo: true,
              enCatalogo: true,
            }
          : {}),
      })

      const clearingPosPendiente =
        product.origenPos &&
        product.posPendientePublicar &&
        (Boolean(imageUrl?.trim()) || esBorrador)
      if (clearingPosPendiente) {
        await markPosProductPublished(tenantId, product.id, product.posProductoId)
      }

      await refreshComboCatalogStocksUsingComponent(tenantId, product.id)

      showSaveSuccess({
        title: esBorrador ? 'Producto publicado' : 'Cambios guardados',
        message: esBorrador
          ? 'El borrador ya está en tu inventario y visible según la configuración del catálogo.'
          : 'El producto se actualizó correctamente.',
      })
      if (esBorrador) clearQuickAddDraft()
      onClose()
    } catch (e) {
      setErr(
        productSaveErrorMessage(e, 'No se pudo guardar. Revisá conexión e intentá de nuevo.'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div
        className={
          esBorrador
            ? 'relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-amber-200/70 bg-neutral-50 shadow-2xl sm:rounded-2xl'
            : 'relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-neutral-200/50 bg-neutral-50 p-5 sm:rounded-2xl'
        }
      >
        <div className={esBorrador ? 'shrink-0 border-b border-neutral-200/60 bg-white/90 px-5 py-4 backdrop-blur-sm sm:px-8' : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="ios-headline">{esBorrador ? 'Continuar borrador' : 'Editar artículo'}</h2>
            <p className="ios-footnote mt-1.5 text-mc-600">
              {esBorrador
                ? 'Completá los datos y publicá cuando esté listo.'
                : esRopa
                  ? tallaModo === 'zapatos'
                    ? usaMatrizRopa
                      ? 'Calzado: stock por color y talla.'
                      : 'Calzado: stock por talla numérica y variantes de color.'
                    : usaMatrizRopa
                      ? 'Prenda de vestir: stock por color y talla.'
                      : 'Prenda de vestir: stock por talla y variantes de color o tela.'
                  : 'Actualizá datos, fotos y variantes.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {esBorrador ? (
              <span className="rounded-full bg-amber-200/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                Borrador
              </span>
            ) : null}
            {esRopa ? (
              <span className="rounded-full bg-mc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                {tallaModo === 'zapatos' ? 'Zapatos' : 'Ropa'}
              </span>
            ) : null}
          </div>
        </div>
        </div>
        <form
          onSubmit={onSubmit}
          className={
            esBorrador
              ? 'min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6'
              : 'mt-4 space-y-4'
          }
        >
          {!esZapatosForm ? (
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
          ) : null}

          <ProductoFormSection title="Información básica">
            <div className="space-y-3">
              <div>
                <label className="ios-footnote font-medium text-mc-700">Nombre</label>
                <input className="mc-input bg-white" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                <ProductoReferenciaPreview referencia={referenciaPreview || product.referencia || ''} />
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
            {esZapatosForm ? (
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
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Precio de costo (opcional)</label>
                  <input
                    className="mc-input mt-1.5 bg-white"
                    inputMode="numeric"
                    value={precioCosto}
                    onChange={(e) => onPrecioCostoChange(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <ProductoZapatosColoresEditor
                  colores={coloresZapatos}
                  onChange={setColoresZapatos}
                  imagenPrincipalColorId={imagenPrincipalColorId}
                  onImagenPrincipalColorIdChange={setImagenPrincipalColorId}
                  disabled={busy}
                />
              </div>
            ) : esRopaForm ? (
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
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Precio de costo (opcional)</label>
                  <input
                    className="mc-input mt-1.5 bg-white"
                    inputMode="numeric"
                    value={precioCosto}
                    onChange={(e) => onPrecioCostoChange(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <ProductoTallasEditor
                  tallas={tallas}
                  onChange={setTallas}
                  modo="ropa"
                  disabled={busy}
                  hideStock={usaMatrizRopa}
                />
                {usaMatrizRopa ? (
                  <ProductoRopaSkuMatrixEditor
                    variantes={colorRows.map((v) => ({
                      id: v.id,
                      nombre: v.nombre.trim(),
                      hex: v.hex,
                      tipo: v.tipo,
                    }))}
                    tallas={tallas}
                    skus={skuMatrix}
                    onChange={setSkuMatrix}
                    disabled={busy}
                  />
                ) : null}
              </div>
            ) : (
              <div className={tieneVariantes ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'grid grid-cols-2 gap-3'}>
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
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Precio de costo (opcional)</label>
                  <input
                    className="mc-input mt-1.5 bg-white"
                    inputMode="numeric"
                    value={precioCosto}
                    onChange={(e) => onPrecioCostoChange(e.target.value)}
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

          <ProductoFormSection title="Categorías">
            <ProductoCategoriasPicker
              categorias={categorias}
              selectedIds={categoriaIds}
              onChange={setCategoriaIds}
              disabled={busy}
              createCategoriasNav={createCategoriasNav}
            />
          </ProductoFormSection>

          <ProductoDescuentoEditor
            draft={descuento}
            onChange={setDescuento}
            precioBaseCop={Number(precio.replace(/\D/g, '')) || 0}
            disabled={busy}
          />

          {!esZapatosForm ? (
            <ProductoVariantesEditor
              variantes={variantes}
              onChange={setVariantes}
              allowImage
              esRopa={esRopaForm}
              tallaModo={esRopaForm ? 'ropa' : undefined}
              disabled={busy}
            />
          ) : null}

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
              <ProductoOpcionToggle
                checked={mostrarBotonDocena}
                onChange={setMostrarBotonDocena}
                disabled={busy}
                title="Mostrar botón «Añadir 1 docena»"
                description="Permite a tus clientes agregar 12 unidades de una sola vez en la ficha del producto."
              />
              <ProductoOpcionToggle
                checked={mostrarStockCatalogo}
                onChange={setMostrarStockCatalogo}
                disabled={busy}
                title="Mostrar cantidad en stock"
                description="En la ficha pública se ve cuántas unidades hay disponibles."
              />
            </div>
          </ProductoFormSection>

          {err && <p className="ios-subhead text-red-800">{err}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" className="mc-btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="mc-btn-primary flex-1">
              {busy ? 'Guardando…' : esBorrador ? 'Publicar producto' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
