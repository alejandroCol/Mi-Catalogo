import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ProductoDescuentoEditor, parseProductoDescuentoDraft, productoDescuentoDraftFromProduct } from '@/components/producto/ProductoDescuentoEditor'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import { ProductoImagenesEditor } from '@/components/producto/ProductoImagenesEditor'
import { ProductoCategoriasPicker } from '@/components/producto/ProductoCategoriasPicker'
import { ComboComponentesEditor } from '@/components/producto/ComboComponentesEditor'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { useTenantCategorias } from '@/hooks/useTenantCategorias'
import { useTenantProductos } from '@/hooks/useTenantProductos'
import { formatCop, formatIntegerEsCo } from '@/lib/formatCop'
import { getDb, getStorageApp, firebaseStorageConfigured } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import { mcCreateProducto, ProductLimitError } from '@/lib/mcWrites'
import { productSaveErrorMessage } from '@/lib/mcSaveError'
import {
  comboCostoUnitario,
  comboPrecioSeparado,
  comboReferenciasValidas,
  comboStockDisponible,
  comboComponentesForFirestore,
  normalizeComboComponentesForSave,
  type ProductoLookup,
} from '@/lib/comboProducto'
import { syncComboToPosProductos } from '@/lib/comboPosSync'
import {
  imagenDraftFromProducto,
  uploadProductoImagenes,
  type ProductoImagenDraft,
} from '@/lib/productoImagenes'
import { categoriasNavFromProductForm } from '@/lib/productFormCategoriaNav'
import { usePosProductos } from '@/pos/hooks/usePosProductos'
import { usePosStock } from '@/pos/hooks/usePosStock'
import { ensureCatalogDraftsForPosProducts } from '@/pos/lib/posCatalogSync'
import { comboStockDisponiblePosMaxSedes } from '@/pos/lib/posVentasCatalog'
import { doc, updateDoc, deleteField } from 'firebase/firestore'
import type { McComboComponente, McProducto } from '@/types/mc'

function parseCop(raw: string): number {
  const n = Number(raw.replace(/\D/g, ''))
  return Number.isFinite(n) ? n : 0
}

function onCopChange(raw: string, set: (v: string) => void) {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') {
    set('')
    return
  }
  const n = Number(digits)
  set(Number.isFinite(n) ? formatIntegerEsCo(n) : '')
}

type Props = {
  tenantId: string
  product?: McProducto & { id: string }
  nextOrden?: number
  initialCategoriaIds?: string[]
  /** Desde inventario POS: vincula productos POS al catálogo para poder armar combos. */
  posInventoryMode?: boolean
  onClose: () => void
}

export function ComboProductModal({
  tenantId,
  product,
  nextOrden = 0,
  initialCategoriaIds,
  posInventoryMode = false,
  onClose,
}: Props) {
  const isEdit = Boolean(product)
  const { productos: inventario, loading: loadingCatalog } = useTenantProductos(tenantId)
  const { productos: posProductos, loading: loadingPos } = usePosProductos(
    posInventoryMode ? tenantId : undefined,
  )
  const { stock: posStockGlobal, loading: loadingPosStock } = usePosStock(
    posInventoryMode ? tenantId : undefined,
  )
  const { categorias } = useTenantCategorias(tenantId)
  const { showSaveSuccess } = useSaveSuccess()
  const ensuredRef = useRef(false)
  const [posSyncing, setPosSyncing] = useState(false)
  const [posSyncErr, setPosSyncErr] = useState<string | null>(null)

  useEffect(() => {
    if (!posInventoryMode || !tenantId || loadingPos || loadingPosStock || ensuredRef.current) return
    ensuredRef.current = true
    setPosSyncing(true)
    setPosSyncErr(null)
    void ensureCatalogDraftsForPosProducts(tenantId, posProductos, posStockGlobal)
      .catch(() => setPosSyncErr('No se pudo preparar el inventario para el combo.'))
      .finally(() => setPosSyncing(false))
  }, [posInventoryMode, tenantId, posProductos, posStockGlobal, loadingPos, loadingPosStock])

  const comboPickerProducts = useMemo(() => {
    const base = inventario.filter((p) => p.tipoProducto !== 'combo' && p.activo !== false)
    if (!posInventoryMode) {
      return base.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    }

    const activePosIds = new Set(
      posProductos.filter((p) => p.activo !== false).map((p) => p.id),
    )
    const activeCatalogIds = new Set(
      posProductos
        .filter((p) => p.activo !== false && p.catalogProductoId)
        .map((p) => p.catalogProductoId!),
    )

    return base
      .filter(
        (p) =>
          (p.posProductoId && activePosIds.has(p.posProductoId)) ||
          activeCatalogIds.has(p.id),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [inventario, posInventoryMode, posProductos])

  const productsMap: ProductoLookup = useMemo(() => {
    const m = new Map<string, McProducto & { id: string }>()
    const source = posInventoryMode
      ? comboPickerProducts
      : inventario.filter((p) => p.tipoProducto !== 'combo')
    for (const p of source) m.set(p.id, p)
    return m
  }, [inventario, comboPickerProducts, posInventoryMode])

  const initialImagenes = product ? imagenDraftFromProducto(product) : { items: [] as ProductoImagenDraft[], coverId: null as string | null }

  const [nombre, setNombre] = useState(product?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(product?.descripcion ?? '')
  const [precio, setPrecio] = useState(
    product && product.precioCop > 0 ? formatIntegerEsCo(product.precioCop) : '',
  )
  const [componentes, setComponentes] = useState<McComboComponente[]>(product?.comboComponentes ?? [])
  const [comboPermiteElegirColor, setComboPermiteElegirColor] = useState(
    () => product?.comboPermiteElegirColor ?? false,
  )
  const [comboPermiteElegirTalla, setComboPermiteElegirTalla] = useState(
    () => product?.comboPermiteElegirTalla ?? false,
  )
  const [imagenes, setImagenes] = useState<ProductoImagenDraft[]>(initialImagenes.items)
  const [coverId, setCoverId] = useState<string | null>(initialImagenes.coverId)
  const [descuento, setDescuento] = useState(() =>
    product ? productoDescuentoDraftFromProduct(product) : { activo: false, tipo: 'porcentaje' as const, valor: '' },
  )
  const [categoriaIds, setCategoriaIds] = useState<string[]>(
    () => initialCategoriaIds ?? product?.categoriaIds ?? [],
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const createCategoriasNav = categoriasNavFromProductForm(
    isEdit && product
      ? { mode: 'edit', productId: product.id, categoriaIds }
      : { mode: 'add' },
    isEdit ? '← Editar combo' : '← Nuevo combo',
  )

  const precioNum = parseCop(precio)
  const precioSeparado = useMemo(
    () =>
      comboPrecioSeparado(
        { tipoProducto: 'combo', comboComponentes: componentes },
        productsMap,
      ),
    [componentes, productsMap],
  )
  const costoCombo = useMemo(
    () =>
      comboCostoUnitario(
        { tipoProducto: 'combo', comboComponentes: componentes },
        productsMap,
      ),
    [componentes, productsMap],
  )
  const stockCombo = useMemo(() => {
    const comboDraft = { tipoProducto: 'combo' as const, comboComponentes: componentes }
    if (posInventoryMode && posProductos.length > 0 && posStockGlobal.length > 0) {
      const posStock = comboStockDisponiblePosMaxSedes(
        comboDraft,
        posProductos,
        inventario,
        posStockGlobal,
      )
      if (posStock > 0) return posStock
    }
    return comboStockDisponible(comboDraft, productsMap)
  }, [componentes, productsMap, posInventoryMode, posProductos, posStockGlobal, inventario])
  const gananciaEst = costoCombo != null && precioNum > 0 ? precioNum - costoCombo : null
  const ahorroCliente = precioSeparado > precioNum && precioNum > 0 ? precioSeparado - precioNum : 0
  const inventarioLoading = posInventoryMode && (loadingCatalog || loadingPos || loadingPosStock || posSyncing)

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErr(null)
      if (!nombre.trim()) {
        setErr('Poné un nombre al combo.')
        return
      }
      if (!Number.isFinite(precioNum) || precioNum < 1) {
        setErr('Indicá el precio del combo.')
        return
      }
      const componentesSave = comboComponentesForFirestore(
        normalizeComboComponentesForSave(
          componentes,
          comboPermiteElegirColor,
          comboPermiteElegirTalla,
          productsMap,
        ),
      )
      const refErr = comboReferenciasValidas(
        componentesSave,
        productsMap,
        product?.id,
        comboPermiteElegirColor,
        comboPermiteElegirTalla,
      )
      if (refErr) {
        setErr(refErr)
        return
      }
      const descParsed = parseProductoDescuentoDraft(descuento, precioNum)
      if (!descParsed.ok) {
        setErr(descParsed.error)
        return
      }
      if (imagenes.some((i) => i.kind === 'new') && !firebaseStorageConfigured) {
        setErr('Firebase Storage no está configurado; no se pueden subir imágenes.')
        return
      }

      setBusy(true)
      try {
        const db = getDb()
        const now = Date.now()
        const storage = firebaseStorageConfigured ? getStorageApp() : null

        let productId = product?.id ?? ''
        if (!isEdit) {
          const { id } = await mcCreateProducto(tenantId, {
            nombre: nombre.trim(),
            ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
            precioCop: precioNum,
            stock: stockCombo,
            tipoProducto: 'combo',
            comboComponentes: componentesSave,
            comboPrecioSeparadoCop: precioSeparado,
            activo: true,
            enCatalogo: true,
            orden: nextOrden,
            createdAt: now,
            updatedAt: now,
            ...(comboPermiteElegirColor ? { comboPermiteElegirColor: true } : {}),
            ...(comboPermiteElegirTalla ? { comboPermiteElegirTalla: true } : {}),
            ...(categoriaIds.length > 0 ? { categoriaIds } : {}),
            ...(descParsed.fields.descuentoActivo ? descParsed.fields : {}),
          })
          productId = id
        }

        let imageUrl: string | undefined = product?.imageUrl
        let galeriaImagenes: string[] | undefined = product?.galeriaImagenes
        if (imagenes.length === 0) {
          imageUrl = undefined
          galeriaImagenes = undefined
        } else if (storage) {
          const uploaded = await uploadProductoImagenes(storage, tenantId, productId, imagenes, coverId)
          imageUrl = uploaded.imageUrl
          galeriaImagenes = uploaded.galeriaImagenes
        }

        const patch: Record<string, unknown> = {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() ? descripcion.trim() : deleteField(),
          precioCop: precioNum,
          stock: stockCombo,
          tipoProducto: 'combo',
          comboComponentes: componentesSave,
          comboPrecioSeparadoCop: precioSeparado,
          updatedAt: now,
          imageUrl: imageUrl ?? deleteField(),
          galeriaImagenes: galeriaImagenes?.length ? galeriaImagenes : deleteField(),
          categoriaIds: categoriaIds.length > 0 ? categoriaIds : deleteField(),
          ...(comboPermiteElegirColor
            ? { comboPermiteElegirColor: true }
            : { comboPermiteElegirColor: deleteField() }),
          ...(comboPermiteElegirTalla
            ? { comboPermiteElegirTalla: true }
            : { comboPermiteElegirTalla: deleteField() }),
          ...(descParsed.fields.descuentoActivo
            ? descParsed.fields
            : {
                descuentoActivo: false,
                descuentoTipo: deleteField(),
                descuentoValor: deleteField(),
              }),
        }

        await updateDoc(doc(db, mcProductosCollection(tenantId), productId), patch)

        const saved: McProducto & { id: string } = {
          id: productId,
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          precioCop: precioNum,
          stock: stockCombo,
          tipoProducto: 'combo',
          comboComponentes: componentesSave,
          comboPermiteElegirColor: comboPermiteElegirColor || undefined,
          comboPermiteElegirTalla: comboPermiteElegirTalla || undefined,
          comboPrecioSeparadoCop: precioSeparado,
          activo: product?.activo ?? true,
          enCatalogo: product?.enCatalogo ?? true,
          orden: product?.orden ?? nextOrden,
          createdAt: product?.createdAt ?? now,
          updatedAt: now,
          imageUrl,
          galeriaImagenes,
          categoriaIds: categoriaIds.length > 0 ? categoriaIds : undefined,
        }
        await syncComboToPosProductos(tenantId, saved)

        showSaveSuccess({
          title: isEdit ? 'Combo actualizado' : 'Combo creado',
          message: 'El combo ya está listo para vender en tienda y POS.',
        })
        onClose()
      } catch (e) {
        if (e instanceof ProductLimitError) {
          setErr(e.message)
        } else {
          setErr(productSaveErrorMessage(e, 'No se pudo guardar el combo. Revisá los datos e intentá de nuevo.'))
        }
      } finally {
        setBusy(false)
      }
    },
    [
      nombre,
      descripcion,
      precioNum,
      componentes,
      comboPermiteElegirColor,
      comboPermiteElegirTalla,
      productsMap,
      product,
      descuento,
      imagenes,
      coverId,
      categoriaIds,
      isEdit,
      tenantId,
      nextOrden,
      precioSeparado,
      stockCombo,
      showSaveSuccess,
      onClose,
    ],
  )

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[color-mix(in_srgb,var(--mc-landing-gold-dark)_28%,white)] bg-neutral-50 shadow-2xl sm:rounded-2xl">
        <div className="shrink-0 border-b border-neutral-200/60 bg-white/90 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="ios-headline">{isEdit ? 'Editar combo' : 'Nuevo combo'}</h2>
              <p className="ios-footnote mt-1.5 text-mc-600">
                Armá un pack con productos de tu inventario. Al vender, se descuenta el stock de cada componente.
              </p>
            </div>
            <span className="rounded-full bg-[var(--mc-landing-gold-dark)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Combo
            </span>
          </div>
        </div>

        {inventarioLoading ? (
          <div className="px-5 py-10 text-center text-[14px] text-mc-600 sm:px-8">
            Cargando inventario…
          </div>
        ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <div className="space-y-4">
            <ProductoFormSection>
              <ProductoImagenesEditor
                items={imagenes}
                coverId={coverId}
                onChange={(items, nextCover) => {
                  setImagenes(items)
                  setCoverId(nextCover)
                }}
                disabled={busy}
              />
            </ProductoFormSection>

            <ProductoFormSection title="Información básica">
              <div className="space-y-3">
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Nombre</label>
                  <input
                    className="mc-input mt-1.5 bg-white"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Promo 3 camisetas"
                    required
                  />
                </div>
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Descripción (opcional)</label>
                  <textarea
                    className="mc-input mt-1.5 min-h-[5.5rem] resize-y bg-white py-2.5 text-[15px] leading-relaxed"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    placeholder="Detalle visible en la tienda…"
                  />
                </div>
              </div>
            </ProductoFormSection>

            <ProductoFormSection title="Precio del combo">
              <div className="space-y-3">
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Precio de venta (COP)</label>
                  <input
                    className="mc-input mt-1.5 bg-white"
                    inputMode="numeric"
                    value={precio}
                    onChange={(e) => onCopChange(e.target.value, setPrecio)}
                    placeholder="40.000"
                    autoComplete="off"
                  />
                </div>
                <ProductoDescuentoEditor draft={descuento} onChange={setDescuento} precioBaseCop={precioNum} />
              </div>
            </ProductoFormSection>

            <ProductoFormSection title="Categorías">
              <ProductoCategoriasPicker
                categorias={categorias}
                selectedIds={categoriaIds}
                onChange={setCategoriaIds}
                createCategoriasNav={createCategoriasNav}
              />
            </ProductoFormSection>

            <ProductoFormSection title="Productos incluidos">
              <ComboComponentesEditor
                componentes={componentes}
                onChange={setComponentes}
                products={comboPickerProducts}
                comboPermiteElegirColor={comboPermiteElegirColor}
                onComboPermiteElegirColorChange={setComboPermiteElegirColor}
                comboPermiteElegirTalla={comboPermiteElegirTalla}
                onComboPermiteElegirTallaChange={setComboPermiteElegirTalla}
                defaultPickerOpen
              />
            </ProductoFormSection>

            {componentes.length > 0 && (
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--mc-landing-gold-dark)_22%,white)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_10%,white)] p-4 text-[13px] leading-relaxed text-[var(--mc-landing-gold-dark)]">
                <p className="font-semibold">Resumen</p>
                <p className="mt-1.5 text-[12px] leading-snug text-mc-600">
                  El stock del combo se calcula solo: miramos cuántas unidades hay de cada componente y
                  dividimos por la cantidad que lleva el pack. Ejemplo: 3 camisas en el combo y 5 camisas
                  en inventario → podés armar 1 combo.
                </p>
                <ul className="mt-2 space-y-1">
                  <li>Precio por separado: {formatCop(precioSeparado)}</li>
                  {ahorroCliente > 0 ? (
                    <li className="text-emerald-700">Ahorro para el cliente: {formatCop(ahorroCliente)}</li>
                  ) : null}
                  {costoCombo != null ? <li>Tu costo (componentes): {formatCop(costoCombo)}</li> : null}
                  {gananciaEst != null ? (
                    <li className="font-medium">Ganancia estimada por combo: {formatCop(gananciaEst)}</li>
                  ) : null}
                  <li className="font-medium">Combos disponibles ahora: {stockCombo}</li>
                </ul>
              </div>
            )}

            {err || posSyncErr ? (
              <p className="text-[13px] text-red-600" role="alert">
                {err ?? posSyncErr}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="mc-btn-secondary px-5 py-3" onClick={onClose} disabled={busy}>
                Cancelar
              </button>
              <button type="submit" className="mc-btn-primary px-5 py-3" disabled={busy}>
                {busy ? 'Guardando…' : isEdit ? 'Guardar combo' : 'Crear combo'}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
