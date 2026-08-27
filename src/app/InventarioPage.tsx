import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { mcProductosCollection, MC } from '@/lib/mcCollections'
import { formatCop } from '@/lib/formatCop'
import { productoPrecioVentaDesde, productoTieneDescuento } from '@/lib/productoDescuento'
import { productoStockEfectivo, variantesValidas } from '@/lib/productoVariantes'
import { esProductoCombo } from '@/lib/comboProducto'
import type { McPlatformSettings, McProducto } from '@/types/mc'
import { BulkAddProductsModal } from '@/app/BulkAddProductsModal'
import { EditProductModal } from '@/app/EditProductModal'
import { ComboProductModal } from '@/app/ComboProductModal'
import { QuickAddProductModal } from '@/app/QuickAddProductModal'
import {
  maxProductosForTenant,
  productLimitMessage,
  resolvePlanConfig,
} from '@/lib/billingPlans'
import {
  mcDeleteProductoDoc,
  mcSyncProductCount,
  mcToggleProductoActivo,
  mcToggleProductoCatalogo,
  mcToggleProductoNovedad,
} from '@/lib/mcWrites'
import { isProductNovedad } from '@/lib/catalogNovedad'
import { isProductoBorrador } from '@/lib/productoFormDraft'
import { IconPlus } from '@/icons/McIcons'
import { InventarioCategoriasLink } from '@/public/CatalogCategorySidebar'
import { categoriaEtiquetaProducto } from '@/lib/catalogCategorias'
import { useTenantCategorias } from '@/hooks/useTenantCategorias'
import {
  clearQuickAddDraft,
  clearQuickAddMediaCache,
  INVENTARIO_PATH,
  loadQuickAddDraft,
  mergeCategoriaId,
  serializeImagenesForDraft,
  type InventarioResumeState,
  type QuickAddProductDraft,
} from '@/lib/productFormCategoriaNav'
import { imagenDraftFromProducto } from '@/lib/productoImagenes'

export function InventarioPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [rows, setRows] = useState<(McProducto & { id: string })[]>([])
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [comboModalOpen, setComboModalOpen] = useState(false)
  const [editComboProduct, setEditComboProduct] = useState<(McProducto & { id: string }) | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<(McProducto & { id: string }) | null>(null)
  const [editInitialCategoriaIds, setEditInitialCategoriaIds] = useState<string[] | undefined>()
  const [quickAddDraft, setQuickAddDraft] = useState<QuickAddProductDraft | null>(null)
  const [pendingResume, setPendingResume] = useState<InventarioResumeState | null>(null)
  const [limitHint, setLimitHint] = useState<string | null>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const syncRef = useRef(false)
  const { categorias } = useTenantCategorias(effectiveTenantId)

  const categoriaLabel = (id: string) => categoriaEtiquetaProducto(id, categorias)

  useEffect(() => {
    if (!firebaseConfigured) return
    let cancelled = false
    void (async () => {
      try {
        const ps = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
        if (cancelled) return
        setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
      } catch {
        if (!cancelled) setPlatformSettings({})
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!firebaseConfigured || !effectiveTenantId) return
    const db = getDb()
    const q = query(collection(db, mcProductosCollection(effectiveTenantId)), orderBy('orden', 'asc'))
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
  }, [effectiveTenantId])

  useEffect(() => {
    if (!effectiveTenantId || !tenant || syncRef.current) return
    if (typeof tenant.productCount === 'number') return
    if (rows.length === 0) return
    syncRef.current = true
    void mcSyncProductCount(effectiveTenantId, rows.length).finally(() => {
      syncRef.current = false
    })
  }, [effectiveTenantId, tenant, tenant?.productCount, rows.length])

  useEffect(() => {
    const state = location.state as InventarioResumeState | null
    if (!state?.reopenProductForm) return
    setPendingResume(state)
    navigate(INVENTARIO_PATH, { replace: true, state: null })
  }, [location.state, navigate])

  useEffect(() => {
    if (!pendingResume?.reopenProductForm) return

    const { reopenProductForm, newCategoriaId } = pendingResume

    if (reopenProductForm.mode === 'add') {
      const draft = loadQuickAddDraft()
      if (draft) {
        if (newCategoriaId) {
          draft.categoriaIds = mergeCategoriaId(draft.categoriaIds, newCategoriaId)
        }
        if (!draft.imagenes?.length && draft.draftProductId) {
          const product = rows.find((p) => p.id === draft.draftProductId)
          if (product) {
            const fromProd = imagenDraftFromProducto(product)
            const serialized = serializeImagenesForDraft(fromProd.items, fromProd.coverId)
            draft.imagenes = serialized.imagenes
            draft.coverId = serialized.coverId
          }
        }
        setQuickAddDraft(draft)
        setModalOpen(true)
      }
      clearQuickAddDraft()
      setPendingResume(null)
      return
    }

    const product = rows.find((p) => p.id === reopenProductForm.productId)
    if (!product) return

    const categoriaIds = newCategoriaId
      ? mergeCategoriaId(reopenProductForm.categoriaIds, newCategoriaId)
      : reopenProductForm.categoriaIds
    setEditInitialCategoriaIds(categoriaIds)
    if (esProductoCombo(product)) {
      setEditComboProduct(product)
    } else {
      setEditProduct(product)
    }
    setPendingResume(null)
  }, [pendingResume, rows])

  async function toggleCatalogo(p: McProducto & { id: string }) {
    if (!effectiveTenantId) return
    await mcToggleProductoCatalogo(effectiveTenantId, p)
  }

  async function toggleActivo(p: McProducto & { id: string }) {
    if (!effectiveTenantId) return
    await mcToggleProductoActivo(effectiveTenantId, p)
  }

  async function toggleNovedad(p: McProducto & { id: string }) {
    if (!effectiveTenantId) return
    await mcToggleProductoNovedad(effectiveTenantId, p)
  }

  async function removeProduct(p: McProducto & { id: string }) {
    if (!effectiveTenantId || !window.confirm(`¿Eliminar «${p.nombre}»?`)) return
    if (firebaseStorageConfigured && p.imageUrl?.includes('firebasestorage')) {
      try {
        const storage = getStorageApp()
        const pathRef = ref(storage, `mc_tenants/${effectiveTenantId}/productos/${p.id}.jpg`)
        await deleteObject(pathRef)
      } catch {
        /* no file */
      }
    }
    await mcDeleteProductoDoc(effectiveTenantId, p.id)
  }

  const planConfig = resolvePlanConfig(platformSettings)
  const productMax = tenant ? maxProductosForTenant(tenant, planConfig) : planConfig.expertMaxProductos
  const atLimit = rows.length >= productMax
  const limitMsg = tenant ? productLimitMessage(tenant, planConfig, rows.length) : null

  function openAddModal() {
    if (atLimit && limitMsg) {
      setLimitHint(limitMsg)
      return
    }
    setLimitHint(null)
    const sessionDraft = loadQuickAddDraft()
    if (sessionDraft?.step === 'form') {
      setQuickAddDraft(sessionDraft)
    } else {
      clearQuickAddMediaCache()
      setQuickAddDraft(null)
    }
    setModalOpen(true)
  }

  function openBulkModal() {
    if (atLimit && limitMsg) {
      setLimitHint(limitMsg)
      return
    }
    setLimitHint(null)
    setBulkOpen(true)
  }

  function openComboModal() {
    if (atLimit && limitMsg) {
      setLimitHint(limitMsg)
      return
    }
    setLimitHint(null)
    setComboModalOpen(true)
  }

  const productsLookup = useMemo(() => {
    const m = new Map<string, McProducto & { id: string }>()
    for (const p of rows) m.set(p.id, p)
    return m
  }, [rows])

  function openEditProduct(p: McProducto & { id: string }) {
    setEditInitialCategoriaIds(undefined)
    if (esProductoCombo(p)) setEditComboProduct(p)
    else setEditProduct(p)
  }

  return (
    <div className="mc-shell">
      <h1 className="ios-large-title">Inventario</h1>
      <p className="ios-subhead mt-2 max-w-2xl leading-relaxed">
        {rows.length} de {productMax} productos.
      </p>
      {atLimit && limitMsg && (
        <div className="mt-4 border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-[13px] leading-relaxed text-amber-950">
          {limitMsg}
        </div>
      )}
      {limitHint && !atLimit && (
        <p className="mt-3 text-[13px] text-[var(--cat-muted)]">{limitHint}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <InventarioCategoriasLink />
      </div>

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-stretch">
        <button
          type="button"
          className="mc-btn-primary inline-flex w-full items-center justify-center gap-2 px-5 py-3.5 text-[16px] sm:min-w-[220px] sm:flex-1"
          onClick={() => openAddModal()}
        >
          <IconPlus size={20} className="text-[var(--cat-accent-text)]" />
          Agregar producto
        </button>
        <button
          type="button"
          className="mc-btn-secondary inline-flex w-full items-center justify-center px-5 py-3 text-[15px] sm:w-auto"
          onClick={() => openComboModal()}
        >
          Crear combo
        </button>
        <button
          type="button"
          className="mc-btn-secondary inline-flex w-full items-center justify-center px-5 py-3 text-[15px] sm:w-auto"
          onClick={() => openBulkModal()}
        >
          Carga masiva de fotos
        </button>
      </div>

      <ul className="mt-8 space-y-4">
        {[...rows]
          .sort((a, b) => {
            if (isProductoBorrador(a) && !isProductoBorrador(b)) return -1
            if (!isProductoBorrador(a) && isProductoBorrador(b)) return 1
            return a.orden - b.orden
          })
          .map((p) => (
          <li
            key={p.id}
            className={
              isProductoBorrador(p)
                ? 'mc-card flex gap-4 border-amber-200/80 bg-amber-50/40 py-4'
                : 'mc-card flex gap-4 py-4'
            }
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200/40 bg-mc-100">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-mc-400">Sin foto</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="ios-headline">{p.nombre}</p>
                {isProductoBorrador(p) ? (
                  <span className="inline-block rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                    Borrador
                  </span>
                ) : null}
                {esProductoCombo(p) ? (
                  <span className="inline-block rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Combo
                  </span>
                ) : null}
                {p.origenFulfillment === 'proveedor' ? (
                  <span className="mc-prov-badge mc-prov-badge--drop">
                    Proveedor{p.proveedorNombre ? ` · ${p.proveedorNombre}` : ''}
                    {p.leadTimeHoras ? ` · ${p.leadTimeHoras}h` : ''}
                  </span>
                ) : null}
              </div>
              <p className="ios-subhead tabular-nums">
                {productoTieneDescuento(p) ? (
                  <>
                    <span className="font-semibold text-red-700">{formatCop(productoPrecioVentaDesde(p))}</span>
                    <span className="ml-1.5 text-mc-500 line-through">{formatCop(p.precioCop)}</span>
                    <span className="ml-1.5 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      Oferta
                    </span>
                  </>
                ) : (
                  formatCop(p.precioCop)
                )}
                {' · '}
                {esProductoCombo(p)
                  ? `stock ${productoStockEfectivo(p, productsLookup)} (automático)`
                  : `stock ${productoStockEfectivo(p, productsLookup)}`}
                {variantesValidas(p).length > 0 ? (
                  <span className="text-mc-500"> · {variantesValidas(p).length} variantes</span>
                ) : null}
                {isProductNovedad(p) && (
                  <span className="ml-2 inline-block border border-neutral-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mc-600">
                    Novedad
                  </span>
                )}
                {(p.categoriaIds ?? []).length > 0 && (
                  <span className="ml-2 inline-flex flex-wrap gap-1">
                    {(p.categoriaIds ?? []).map((cid) => {
                      const nom = categoriaLabel(cid)
                      if (!nom) return null
                      return (
                        <span
                          key={cid}
                          className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-mc-700"
                        >
                          {nom}
                        </span>
                      )
                    })}
                  </span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.origenPos && p.posPendientePublicar && !p.enCatalogo && (
                  <span className="rounded-md border border-amber-200/80 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-900">
                    POS · Completar para publicar
                  </span>
                )}
                {p.origenPos && !p.posPendientePublicar && !p.enCatalogo && (
                  <button
                    type="button"
                    className="rounded-md border border-[color-mix(in_srgb,var(--mc-landing-gold)_40%,white)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_10%,white)] px-3 py-1.5 text-[13px] font-semibold text-mc-brand-gray transition hover:opacity-90"
                    onClick={() => openEditProduct(p)}
                  >
                    Publicar en tienda
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-md border border-[var(--cat-accent)]/35 bg-[color-mix(in_srgb,var(--cat-accent)_8%,transparent)] px-3 py-1.5 text-[13px] font-semibold text-[var(--cat-text)] transition duration-200 ease-in-out hover:opacity-90"
                  onClick={() => openEditProduct(p)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="rounded-md border border-neutral-200/70 bg-transparent px-3 py-1.5 text-[13px] font-medium text-[var(--cat-text)] transition duration-200 ease-in-out hover:border-neutral-300/90"
                  onClick={() => void toggleNovedad(p)}
                >
                  {p.marcarNovedad ? 'Novedad fija: sí' : 'Novedad fija: no'}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-neutral-200/70 bg-transparent px-3 py-1.5 text-[13px] font-medium text-[var(--cat-text)] transition duration-200 ease-in-out hover:border-neutral-300/90"
                  onClick={() => void toggleCatalogo(p)}
                >
                  {p.enCatalogo ? 'En catálogo' : 'Oculto'}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-neutral-200/70 bg-transparent px-3 py-1.5 text-[13px] font-medium text-mc-700 transition duration-200 ease-in-out hover:border-neutral-300/90"
                  onClick={() => void toggleActivo(p)}
                >
                  {p.activo ? 'Activo' : 'Pausado'}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-transparent px-3 py-1.5 text-[13px] font-medium text-mc-500 underline decoration-neutral-300 underline-offset-2 transition duration-200 ease-in-out hover:text-mc-900"
                  onClick={() => void removeProduct(p)}
                >
                  Borrar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {rows.length === 0 && (
        <p className="mt-8 text-center ios-footnote">Todavía no cargaste productos.</p>
      )}

      <button
        ref={fabRef}
        type="button"
        className="mc-fab"
        aria-label="Agregar producto"
        onClick={() => openAddModal()}
      >
        <IconPlus size={24} className="text-[var(--cat-accent-text)]" />
      </button>

      {modalOpen && effectiveTenantId && tenant && (
        <QuickAddProductModal
          tenantId={effectiveTenantId}
          tenant={tenant}
          platformSettings={platformSettings}
          currentCount={rows.length}
          onClose={() => {
            setModalOpen(false)
          }}
          nextOrden={rows.length}
          initialDraft={quickAddDraft}
        />
      )}

      {editProduct && effectiveTenantId && (
        <EditProductModal
          tenantId={effectiveTenantId}
          product={editProduct}
          initialCategoriaIds={editInitialCategoriaIds}
          onClose={() => {
            setEditProduct(null)
            setEditInitialCategoriaIds(undefined)
          }}
        />
      )}

      {(comboModalOpen || editComboProduct) && effectiveTenantId && (
        <ComboProductModal
          tenantId={effectiveTenantId}
          product={editComboProduct ?? undefined}
          nextOrden={rows.length}
          currentCount={rows.length}
          initialCategoriaIds={editInitialCategoriaIds}
          onClose={() => {
            setComboModalOpen(false)
            setEditComboProduct(null)
            setEditInitialCategoriaIds(undefined)
          }}
        />
      )}

      {bulkOpen && effectiveTenantId && tenant && (
        <BulkAddProductsModal
          tenantId={effectiveTenantId}
          tenant={tenant}
          platformSettings={platformSettings}
          currentCount={rows.length}
          onClose={() => setBulkOpen(false)}
          nextOrden={rows.length}
        />
      )}

    </div>
  )
}
