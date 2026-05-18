import { useEffect, useRef, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import { formatCop } from '@/lib/formatCop'
import type { McProducto } from '@/types/mc'
import { BulkAddProductsModal } from '@/app/BulkAddProductsModal'
import { EditProductModal } from '@/app/EditProductModal'
import { QuickAddProductModal } from '@/app/QuickAddProductModal'
import { billingPlanOf } from '@/lib/catalogTheme'
import {
  mcDeleteProductoDoc,
  mcToggleProductoActivo,
  mcToggleProductoCatalogo,
  mcToggleProductoNovedad,
} from '@/lib/mcWrites'
import { isProductNovedad } from '@/lib/catalogNovedad'
import { IconPlus } from '@/icons/McIcons'

export function InventarioPage() {
  const { profile, tenant } = useMcAuth()
  const [rows, setRows] = useState<(McProducto & { id: string })[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<(McProducto & { id: string }) | null>(null)
  const fabRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!firebaseConfigured || !profile?.tenantId) return
    const db = getDb()
    const q = query(collection(db, mcProductosCollection(profile.tenantId)), orderBy('orden', 'asc'))
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
  }, [profile?.tenantId])

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

  return (
    <div className="mc-shell">
      <h1 className="ios-large-title">Inventario</h1>
      <p className="ios-subhead mt-2 max-w-2xl leading-relaxed">
        Tocá el botón <strong className="font-medium text-[var(--cat-text)]">+</strong> para agregar un artículo con foto, nombre, precio y stock.
        {expert && (
          <>
            {' '}
            Con <strong className="font-semibold text-[var(--cat-text)]">Expert</strong> podés usar{' '}
            <button
              type="button"
              className="font-semibold text-[var(--cat-accent)] underline decoration-transparent underline-offset-2 hover:decoration-current"
              onClick={() => setBulkOpen(true)}
            >
              carga masiva desde la galería
            </button>
            .
          </>
        )}
      </p>
      {expert && (
        <button
          type="button"
          className="mc-btn-secondary mt-4 w-full px-5 py-3 text-[15px] sm:w-auto"
          onClick={() => setBulkOpen(true)}
        >
          Carga masiva (varias fotos)
        </button>
      )}

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
        onClick={() => setModalOpen(true)}
      >
        <IconPlus size={24} className="text-[var(--cat-accent-text)]" />
      </button>

      {modalOpen && profile?.tenantId && (
        <QuickAddProductModal
          tenantId={profile.tenantId}
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

      {bulkOpen && profile?.tenantId && expert && (
        <BulkAddProductsModal
          tenantId={profile.tenantId}
          onClose={() => setBulkOpen(false)}
          nextOrden={rows.length}
        />
      )}
    </div>
  )
}
