import { useEffect, useRef, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { Link, useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { mcProductosCollection, MC } from '@/lib/mcCollections'
import { formatCop } from '@/lib/formatCop'
import type { McPlatformSettings, McProducto } from '@/types/mc'
import { BulkAddProductsModal } from '@/app/BulkAddProductsModal'
import { EditProductModal } from '@/app/EditProductModal'
import { QuickAddProductModal } from '@/app/QuickAddProductModal'
import { billingPlanOf } from '@/lib/catalogTheme'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { hasExpertFeatureAccess } from '@/lib/billingAccess'
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
import { IconPlus } from '@/icons/McIcons'

export function InventarioPage() {
  const { profile, tenant } = useMcAuth()
  const nav = useNavigate()
  const [rows, setRows] = useState<(McProducto & { id: string })[]>([])
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<(McProducto & { id: string }) | null>(null)
  const [limitHint, setLimitHint] = useState<string | null>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const syncRef = useRef(false)

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
    if (!firebaseConfigured || !profile?.tenantId) return
    const db = getDb()
    const q = query(collection(db, mcProductosCollection(profile.tenantId)), orderBy('orden', 'asc'))
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
  }, [profile?.tenantId])

  useEffect(() => {
    if (!profile?.tenantId || !tenant || syncRef.current) return
    if (typeof tenant.productCount === 'number') return
    if (rows.length === 0) return
    syncRef.current = true
    void mcSyncProductCount(profile.tenantId, rows.length).finally(() => {
      syncRef.current = false
    })
  }, [profile?.tenantId, tenant, tenant?.productCount, rows.length])

  async function toggleCatalogo(p: McProducto & { id: string }) {
    if (!profile?.tenantId) return
    await mcToggleProductoCatalogo(profile.tenantId, p)
  }

  async function toggleActivo(p: McProducto & { id: string }) {
    if (!profile?.tenantId) return
    await mcToggleProductoActivo(profile.tenantId, p)
  }

  async function toggleNovedad(p: McProducto & { id: string }) {
    if (!profile?.tenantId) return
    await mcToggleProductoNovedad(profile.tenantId, p)
  }

  async function removeProduct(p: McProducto & { id: string }) {
    if (!profile?.tenantId || !window.confirm(`¿Eliminar «${p.nombre}»?`)) return
    if (firebaseStorageConfigured && p.imageUrl?.includes('firebasestorage')) {
      try {
        const storage = getStorageApp()
        const pathRef = ref(storage, `mc_tenants/${profile.tenantId}/productos/${p.id}.jpg`)
        await deleteObject(pathRef)
      } catch {
        /* no file */
      }
    }
    await mcDeleteProductoDoc(profile.tenantId, p.id)
  }

  const expert = tenant ? billingPlanOf(tenant) === 'expert' : false
  const expertAccess = hasExpertFeatureAccess(tenant)
  const planConfig = resolvePlanConfig(platformSettings)
  const productMax = tenant ? maxProductosForTenant(tenant, planConfig) : planConfig.freeMaxProductos
  const atLimit = rows.length >= productMax
  const limitMsg = tenant ? productLimitMessage(tenant, planConfig, rows.length) : null

  function openAddModal() {
    if (atLimit && limitMsg) {
      setLimitHint(limitMsg)
      return
    }
    setLimitHint(null)
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

  return (
    <div className="mc-shell">
      <h1 className="ios-large-title">Inventario</h1>
      <p className="ios-subhead mt-2 max-w-2xl leading-relaxed">
        {rows.length} de {productMax} productos
        {expert ? ' · plan Expert' : ' · plan Free'}.
      </p>
      {atLimit && limitMsg && (
        <div className="mt-4 border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-[13px] leading-relaxed text-amber-950">
          {limitMsg}
          {!expert && (
            <>
              {' '}
              <Link to="/app/plan" className="font-semibold underline underline-offset-2">
                Ver plan Expert
              </Link>
            </>
          )}
        </div>
      )}
      {limitHint && !atLimit && (
        <p className="mt-3 text-[13px] text-[var(--cat-muted)]">{limitHint}</p>
      )}
      <p className="ios-subhead mt-2 max-w-2xl leading-relaxed">
        Tocá el botón <strong className="font-medium text-[var(--cat-text)]">+</strong> para agregar un artículo con foto, nombre, precio y stock.
        {' '}
        Con <ExpertStar className="mx-0.5 inline" /> podés usar{' '}
        <button
          type="button"
          className="font-semibold text-[var(--cat-accent)] underline decoration-transparent underline-offset-2 hover:decoration-current"
          onClick={() => (expertAccess ? openBulkModal() : nav('/app/plan'))}
        >
          carga masiva desde la galería
        </button>
        .
      </p>
      <button
        type="button"
        className="mc-btn-secondary mt-4 inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-[15px] sm:w-auto"
        onClick={() => (expertAccess ? setBulkOpen(true) : nav('/app/plan'))}
      >
        <ExpertStar />
        Carga masiva (varias fotos)
      </button>

      <ul className="mt-8 space-y-4">
        {rows.map((p) => (
          <li key={p.id} className="mc-card flex gap-4 py-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200/40 bg-mc-100">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-mc-400">Sin foto</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="ios-headline">{p.nombre}</p>
              <p className="ios-subhead tabular-nums">
                {formatCop(p.precioCop)} · stock {p.stock}
                {isProductNovedad(p) && (
                  <span className="ml-2 inline-block border border-neutral-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mc-600">
                    Novedad
                  </span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--cat-accent)]/35 bg-[color-mix(in_srgb,var(--cat-accent)_8%,transparent)] px-3 py-1.5 text-[13px] font-semibold text-[var(--cat-text)] transition duration-200 ease-in-out hover:opacity-90"
                  onClick={() => setEditProduct(p)}
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
        <p className="mt-8 text-center ios-footnote">Todavía no cargaste artículos.</p>
      )}

      <button
        ref={fabRef}
        type="button"
        className="mc-fab"
        aria-label="Agregar artículo"
        onClick={() => openAddModal()}
      >
        <IconPlus size={24} className="text-[var(--cat-accent-text)]" />
      </button>

      {modalOpen && profile?.tenantId && tenant && (
        <QuickAddProductModal
          tenantId={profile.tenantId}
          tenant={tenant}
          platformSettings={platformSettings}
          currentCount={rows.length}
          onClose={() => setModalOpen(false)}
          nextOrden={rows.length}
        />
      )}

      {editProduct && profile?.tenantId && (
        <EditProductModal
          tenantId={profile.tenantId}
          product={editProduct}
          onClose={() => setEditProduct(null)}
        />
      )}

      {bulkOpen && profile?.tenantId && expertAccess && tenant && (
        <BulkAddProductsModal
          tenantId={profile.tenantId}
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
