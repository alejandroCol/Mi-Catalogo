import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { ProductoDescuentoEditor, parseProductoDescuentoDraft, type ProductoDescuentoDraft } from '@/components/producto/ProductoDescuentoEditor'
import { ProductoEsRopaStep } from '@/components/producto/ProductoEsRopaStep'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import { ProductoImagenesEditor } from '@/components/producto/ProductoImagenesEditor'
import { ProductoOpcionToggle } from '@/components/producto/ProductoOpcionToggle'
import { ProductoTallasEditor } from '@/components/producto/ProductoTallasEditor'
import { ProductoRopaSkuMatrixEditor } from '@/components/producto/ProductoRopaSkuMatrixEditor'
import { ProductoVariantesEditor } from '@/components/producto/ProductoVariantesEditor'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import type { VarianteDraftConArchivo } from '@/lib/productoVariantes'
import { getDb, getStorageApp, firebaseStorageConfigured } from '@/lib/firebase'
import { formatIntegerEsCo } from '@/lib/formatCop'
import { mcProductosCollection } from '@/lib/mcCollections'
import { productSaveErrorMessage } from '@/lib/mcSaveError'
import { mcCreateProducto, mcCreateProductoBorrador, mcUpdateProductoBorrador, ProductLimitError } from '@/lib/mcWrites'
import {
  buildProductoPayloadFromQuickAddForm,
  quickAddFormHasDraftContent,
  type QuickAddFormSnapshot,
} from '@/lib/productoFormDraft'
import { uploadProductoImagenes, uploadVarianteImagen, type ProductoImagenDraft } from '@/lib/productoImagenes'
import {
  buildRopaStockPayload,
  ensureSkuDraftMatrix,
  ropaUsaMatrizEnForm,
  type SkuDraft,
} from '@/lib/productoSkus'
import {
  buildTallasFromDrafts,
  createCurvaTallasDraft,
  sumarStockTallas,
  type TallaDraft,
} from '@/lib/productoTallas'
import {
  buildVarianteFromDraft,
  parsePrecioVarianteOpcional,
  sumarStockVariantes,
  variantesConStockDefinido,
} from '@/lib/productoVariantes'
import type { McPlatformSettings, McProducto, McProductoVariante, McTenant } from '@/types/mc'
import { ProductoCategoriasPicker } from '@/components/producto/ProductoCategoriasPicker'
import { McErrorDialog } from '@/components/McErrorDialog'
import { useTenantCategorias } from '@/hooks/useTenantCategorias'
import {
  categoriasNavFromProductForm,
  clearQuickAddDraft,
  saveQuickAddDraft,
  type QuickAddProductDraft,
} from '@/lib/productFormCategoriaNav'

type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error'

const DRAFT_AUTOSAVE_MS = 1200

export function QuickAddProductModal({
  tenantId,
  platformSettings,
  nextOrden,
  onClose,
  initialDraft,
}: {
  tenantId: string
  tenant: McTenant
  platformSettings: McPlatformSettings | null
  currentCount: number
  nextOrden: number
  onClose: () => void
  initialDraft?: QuickAddProductDraft | null
}) {
  const [step, setStep] = useState<'ropa' | 'form'>(initialDraft?.step ?? 'ropa')
  const [esRopa, setEsRopa] = useState(initialDraft?.esRopa ?? false)
  const [nombre, setNombre] = useState(initialDraft?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initialDraft?.descripcion ?? '')
  const [precio, setPrecio] = useState(initialDraft?.precio ?? '')
  const [precioCosto, setPrecioCosto] = useState(initialDraft?.precioCosto ?? '')
  const [stock, setStock] = useState(initialDraft?.stock ?? '')
  const [tallas, setTallas] = useState<TallaDraft[]>(
    () => initialDraft?.tallas ?? createCurvaTallasDraft(),
  )
  const [imagenes, setImagenes] = useState<ProductoImagenDraft[]>([])
  const [coverId, setCoverId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [marcarNovedad, setMarcarNovedad] = useState(initialDraft?.marcarNovedad ?? false)
  const [mostrarDescargaImagen, setMostrarDescargaImagen] = useState(
    initialDraft?.mostrarDescargaImagen ?? false,
  )
  const [mostrarBotonDocena, setMostrarBotonDocena] = useState(
    initialDraft?.mostrarBotonDocena ?? false,
  )
  const [descuento, setDescuento] = useState<ProductoDescuentoDraft>(
    () =>
      initialDraft?.descuento ?? {
        activo: false,
        tipo: 'porcentaje',
        valor: '',
      },
  )
  const [variantes, setVariantes] = useState<VarianteDraftConArchivo[]>(
    () => initialDraft?.variantes ?? [],
  )
  const [skuMatrix, setSkuMatrix] = useState<SkuDraft[]>(() => initialDraft?.skuMatrix ?? [])
  const [categoriaIds, setCategoriaIds] = useState<string[]>(initialDraft?.categoriaIds ?? [])
  const [draftProductId, setDraftProductId] = useState<string | null>(
    initialDraft?.draftProductId ?? null,
  )
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>('idle')
  const [errorDialog, setErrorDialog] = useState<{ title?: string; message: string } | null>(null)

  const showCreateError = useCallback((message: string, title?: string) => {
    setErr(message)
    setErrorDialog({ message, title })
  }, [])

  const draftProductIdRef = useRef(draftProductId)
  draftProductIdRef.current = draftProductId

  const { categorias } = useTenantCategorias(tenantId)

  const { showSaveSuccess } = useSaveSuccess()
  const tieneVariantes = variantes.length > 0
  const colorRows = variantes.filter((v) => v.nombre.trim())
  const usaMatrizRopa = ropaUsaMatrizEnForm(esRopa, colorRows.length)
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

  const createCategoriasNav = categoriasNavFromProductForm({ mode: 'add' }, '← Agregar producto')

  const getFormSnapshot = useCallback((): QuickAddFormSnapshot => {
    return {
      esRopa,
      nombre,
      descripcion,
      precio,
      precioCosto,
      stock,
      tallas,
      marcarNovedad,
      mostrarDescargaImagen,
      mostrarBotonDocena,
      descuento,
      variantes,
      skuMatrix,
      categoriaIds,
    }
  }, [
    esRopa,
    nombre,
    descripcion,
    precio,
    stock,
    tallas,
    marcarNovedad,
    mostrarDescargaImagen,
    mostrarBotonDocena,
    descuento,
    variantes,
    skuMatrix,
    categoriaIds,
  ])

  const persistSessionDraft = useCallback(() => {
    saveQuickAddDraft({
      step,
      esRopa,
      nombre,
      descripcion,
      precio,
      precioCosto,
      stock,
      tallas,
      marcarNovedad,
      mostrarDescargaImagen,
      mostrarBotonDocena,
      descuento,
      variantes: variantes.map(({ file: _file, ...rest }) => rest),
      skuMatrix,
      categoriaIds,
      ...(draftProductIdRef.current ? { draftProductId: draftProductIdRef.current } : {}),
    })
  }, [
    step,
    esRopa,
    nombre,
    descripcion,
    precio,
    stock,
    tallas,
    marcarNovedad,
    mostrarDescargaImagen,
    mostrarBotonDocena,
    descuento,
    variantes,
    categoriaIds,
  ])

  const saveDraftToFirestore = useCallback(async (): Promise<string | null> => {
    const form = getFormSnapshot()
    if (!quickAddFormHasDraftContent(form)) return draftProductIdRef.current

    const payload = buildProductoPayloadFromQuickAddForm(form, nextOrden)
    const existingId = draftProductIdRef.current

    if (existingId) {
      await mcUpdateProductoBorrador(tenantId, existingId, payload)
      return existingId
    }

    const { id } = await mcCreateProductoBorrador(tenantId, payload, platformSettings)
    setDraftProductId(id)
    draftProductIdRef.current = id
    return id
  }, [getFormSnapshot, nextOrden, platformSettings, tenantId])

  useEffect(() => {
    if (step !== 'form' || busy) return

    persistSessionDraft()

    const form = getFormSnapshot()
    if (!quickAddFormHasDraftContent(form)) {
      setDraftSaveState('idle')
      return
    }

    setDraftSaveState('saving')
    const timer = window.setTimeout(() => {
      void saveDraftToFirestore()
        .then((id) => {
          if (id) {
            persistSessionDraft()
            setDraftSaveState('saved')
          } else {
            setDraftSaveState('idle')
          }
        })
        .catch((e) => {
          if (e instanceof ProductLimitError) {
            showCreateError(e.message, 'Límite de productos')
          }
          setDraftSaveState('error')
        })
    }, DRAFT_AUTOSAVE_MS)

    return () => window.clearTimeout(timer)
  }, [step, busy, getFormSnapshot, persistSessionDraft, saveDraftToFirestore])

  function handleClose() {
    if (step === 'form') {
      persistSessionDraft()
      void saveDraftToFirestore().finally(onClose)
      return
    }
    onClose()
  }

  function handlePublishSuccess() {
    clearQuickAddDraft()
    onClose()
  }

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

  function onStockChange(raw: string) {
    setStock(raw.replace(/\D/g, ''))
  }

  function buildVariantesForSave(rows: VarianteDraftConArchivo[]): McProductoVariante[] {
    const built: McProductoVariante[] = []
    for (const v of rows) {
      const item = buildVarianteFromDraft(v)
      if (!item) continue
      if (esRopa) delete item.stock
      built.push(item)
    }
    return built
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const precioNum = Number(precio.replace(/\D/g, ''))
    const precioCostoNum = precioCosto.replace(/\D/g, '') ? Number(precioCosto.replace(/\D/g, '')) : undefined
    const stockNum = Number(stock.replace(/\D/g, ''))
    if (!nombre.trim()) {
      showCreateError('Poné un nombre corto.')
      return
    }
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      showCreateError('Precio inválido.')
      return
    }

    const descParsed = parseProductoDescuentoDraft(descuento, precioNum)
    if (!descParsed.ok) {
      showCreateError(descParsed.error)
      return
    }

    for (const v of variantes) {
      if (!v.nombre.trim()) continue
      if (v.precio.trim() && parsePrecioVarianteOpcional(v.precio) == null) {
        showCreateError(`Precio opcional inválido en variante «${v.nombre.trim()}».`)
        return
      }
    }

    const varianteRows = variantes.filter((v) => v.nombre.trim())
    const builtTallas = esRopa ? buildTallasFromDrafts(tallas) : []
    const builtVar = buildVariantesForSave(varianteRows)
    const ropaStock = esRopa
      ? buildRopaStockPayload({ tallas: builtTallas, variantes: builtVar, skuDrafts: skuMatrix })
      : null

    if (esRopa) {
      if (ropaStock!.usaMatriz && ropaStock!.stockFinal <= 0) {
        showCreateError('Indicá stock en al menos una combinación color × talla.')
        return
      }
      if (!ropaStock!.usaMatriz && sumarStockTallas(builtTallas) <= 0) {
        showCreateError('Indicá stock en al menos una talla.')
        return
      }
    }

    const needsStorage =
      imagenes.length > 0 || varianteRows.some((v) => v.file)
    if (needsStorage && !firebaseStorageConfigured) {
      showCreateError('Firebase Storage no está configurado; no se pueden subir imágenes.')
      return
    }

    let stockFinal = Number.isFinite(stockNum) ? stockNum : 0
    if (esRopa && ropaStock) {
      stockFinal = ropaStock.stockFinal
    } else if (builtVar.length > 0 && variantesConStockDefinido(builtVar)) {
      stockFinal = sumarStockVariantes(builtVar)
    }

    setBusy(true)
    try {
      let productId = draftProductId

      const publishFields = {
        nombre: nombre.trim(),
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
        precioCop: precioNum,
        ...(precioCostoNum != null && Number.isFinite(precioCostoNum) ? { precioCostoCop: precioCostoNum } : {}),
        stock: stockFinal,
        activo: true,
        enCatalogo: true,
        esBorrador: deleteField(),
        updatedAt: Date.now(),
        ...(esRopa && ropaStock
          ? {
              esRopa: true,
              tallas: ropaStock.tallas,
              ...(ropaStock.skus?.length ? { skus: ropaStock.skus } : {}),
            }
          : {}),
        ...(marcarNovedad ? { marcarNovedad: true } : {}),
        ...(mostrarDescargaImagen ? { mostrarDescargaImagen: true } : {}),
        ...(mostrarBotonDocena ? { mostrarBotonDocena: true } : {}),
        ...descParsed.fields,
        ...(builtVar.length > 0 ? { variantes: builtVar } : {}),
        ...(categoriaIds.length > 0 ? { categoriaIds } : {}),
      }

      if (productId) {
        await updateDoc(doc(getDb(), mcProductosCollection(tenantId), productId), publishFields)
      } else {
        const created = await mcCreateProducto(
          tenantId,
          {
            nombre: nombre.trim(),
            ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
            precioCop: precioNum,
            ...(precioCostoNum != null && Number.isFinite(precioCostoNum) ? { precioCostoCop: precioCostoNum } : {}),
            stock: stockFinal,
            activo: true,
            enCatalogo: true,
            orden: nextOrden,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...(esRopa && ropaStock
          ? {
              esRopa: true,
              tallas: ropaStock.tallas,
              ...(ropaStock.skus?.length ? { skus: ropaStock.skus } : {}),
            }
          : {}),
            ...(marcarNovedad ? { marcarNovedad: true } : {}),
            ...(mostrarDescargaImagen ? { mostrarDescargaImagen: true } : {}),
            ...(mostrarBotonDocena ? { mostrarBotonDocena: true } : {}),
            ...descParsed.fields,
            ...(builtVar.length > 0 ? { variantes: builtVar } : {}),
            ...(categoriaIds.length > 0 ? { categoriaIds } : {}),
          } satisfies Omit<McProducto, 'id'>,
          platformSettings,
        )
        productId = created.id
      }

      const patch: Record<string, unknown> = {}

      if (imagenes.length > 0 && firebaseStorageConfigured) {
        const storage = getStorageApp()
        const uploaded = await uploadProductoImagenes(storage, tenantId, productId, imagenes, coverId)
        if (uploaded.imageUrl) patch.imageUrl = uploaded.imageUrl
        if (uploaded.galeriaImagenes) patch.galeriaImagenes = uploaded.galeriaImagenes
      }

      const variantesConFoto = varianteRows.filter((v) => v.file)
      if (variantesConFoto.length > 0 && firebaseStorageConfigured) {
        const storage = getStorageApp()
        const nextVariantes = [...builtVar]
        for (const row of varianteRows) {
          if (!row.file) continue
          const idx = nextVariantes.findIndex((v) => v.id === row.id)
          if (idx < 0) continue
          const url = await uploadVarianteImagen(storage, tenantId, productId, row.id, row.file)
          nextVariantes[idx] = { ...nextVariantes[idx]!, imageUrl: url }
        }
        patch.variantes = nextVariantes
      }

      if (Object.keys(patch).length > 0) {
        await updateDoc(doc(getDb(), mcProductosCollection(tenantId), productId), patch)
      }

      showSaveSuccess({
        title: 'Producto agregado',
        message: 'Ya está en tu inventario y visible según la configuración del catálogo.',
      })
      handlePublishSuccess()
    } catch (e) {
      if (e instanceof ProductLimitError) {
        showCreateError(e.message, 'Límite de productos')
      } else {
        showCreateError(
          productSaveErrorMessage(
            e,
            'No se pudo guardar. Revisá conexión e intentá de nuevo.',
          ),
        )
      }
    } finally {
      setBusy(false)
    }
  }

  if (step === 'ropa') {
    return (
      <ProductoEsRopaStep
        onClose={handleClose}
        onSelect={(ropa) => {
          setEsRopa(ropa)
          if (ropa) setTallas(createCurvaTallasDraft())
          setStep('form')
        }}
      />
    )
  }

  const draftStatusLabel =
    draftSaveState === 'saving'
      ? 'Guardando borrador…'
      : draftSaveState === 'saved'
        ? 'Borrador guardado'
        : draftSaveState === 'error'
          ? 'No se pudo guardar el borrador'
          : quickAddFormHasDraftContent(getFormSnapshot())
            ? 'Se guardará al salir'
            : null

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={handleClose} />
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-neutral-200/50 bg-neutral-50 shadow-2xl sm:rounded-2xl">
        <div className="shrink-0 border-b border-neutral-200/60 bg-white/90 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="ios-headline text-[22px] sm:text-2xl">Agregar producto</h2>
              <p className="ios-footnote mt-1.5 max-w-2xl text-mc-600">
                {esRopa
                  ? 'Prenda de vestir: stock por talla y variantes de color o tela.'
                  : 'Subí fotos, completá los datos y guardá. Si cerrás el formulario, tu progreso queda como borrador.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {esRopa ? (
                <span className="rounded-full bg-mc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  Ropa
                </span>
              ) : null}
              {draftStatusLabel ? (
                <span
                  className={
                    draftSaveState === 'error'
                      ? 'text-[11px] font-medium text-red-700'
                      : draftSaveState === 'saved'
                        ? 'text-[11px] font-medium text-emerald-700'
                        : 'text-[11px] font-medium text-mc-500'
                  }
                >
                  {draftStatusLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <div className="grid gap-5 xl:grid-cols-2 xl:gap-6">
            <div className="space-y-5">
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
                      className="mc-input mt-1.5 min-h-[6.5rem] resize-y bg-white py-2.5 text-[15px] leading-relaxed"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Material, medidas, cuidados, variantes disponibles…"
                      rows={4}
                    />
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
                        placeholder="25.000"
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
                        placeholder="12.000"
                        autoComplete="off"
                      />
                      <p className="mt-1 text-[11px] leading-relaxed text-mc-500">
                        Para calcular ganancias en reportes. No afecta el precio de venta.
                      </p>
                    </div>
                    <ProductoTallasEditor
                      tallas={tallas}
                      onChange={setTallas}
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
                        placeholder="25.000"
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
                        placeholder="12.000"
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
                          onChange={(e) => onStockChange(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    ) : (
                      <p className="text-[12px] leading-relaxed text-mc-600">
                        Con variantes, el stock se define en cada opción abajo.
                      </p>
                    )}
                  </div>
                )}
              </ProductoFormSection>
            </div>

            <div className="space-y-5">
              <ProductoFormSection title="Categorías">
                <ProductoCategoriasPicker
                  categorias={categorias}
                  selectedIds={categoriaIds}
                  onChange={setCategoriaIds}
                  disabled={busy}
                  createCategoriasNav={createCategoriasNav}
                  onBeforeCreateCategorias={persistSessionDraft}
                />
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
                    title="Destacar como novedad siempre"
                    description="Además del período automático de 3 semanas desde el alta."
                  />
                  <ProductoOpcionToggle
                    checked={mostrarDescargaImagen}
                    onChange={setMostrarDescargaImagen}
                    disabled={busy}
                    title="Mostrar botón «Descargar imagen»"
                    description="Ideal para mayoristas que necesitan bajar la foto desde el catálogo."
                  />
                  <ProductoOpcionToggle
                    checked={mostrarBotonDocena}
                    onChange={setMostrarBotonDocena}
                    disabled={busy}
                    title="Mostrar botón «Añadir 1 docena»"
                    description="Permite a tus clientes agregar 12 unidades de una sola vez en la ficha del producto."
                  />
                </div>
              </ProductoFormSection>
            </div>
          </div>

          {err && <p className="ios-subhead mt-4 text-red-800">{err}</p>}

          <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t border-neutral-200/60 bg-neutral-50/95 px-5 py-4 backdrop-blur-sm sm:-mx-8 sm:px-8">
            <button type="button" className="mc-btn-secondary flex-1 sm:max-w-[180px]" onClick={() => setStep('ropa')}>
              Atrás
            </button>
            <button type="submit" disabled={busy} className="mc-btn-primary flex-1 sm:max-w-none">
              {busy ? 'Guardando…' : 'Publicar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>

      <McErrorDialog
        open={errorDialog != null}
        title={errorDialog?.title}
        message={errorDialog?.message ?? ''}
        onClose={() => setErrorDialog(null)}
      />
    </>
  )
}
