import { useEffect, useRef, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import { formatCop } from '@/lib/formatCop'
import type { McProducto } from '@/types/mc'
import { BulkAddProductsModal } from '@/app/BulkAddProductsModal'
import { QuickAddProductModal } from '@/app/QuickAddProductModal'
import { billingPlanOf } from '@/lib/catalogTheme'
import { mcDeleteProductoDoc, mcToggleProductoActivo, mcToggleProductoCatalogo } from '@/lib/mcWrites'
import { IconPlus } from '@/icons/McIcons'

export function InventarioPage() {
  const { profile, tenant } = useMcAuth()
  const [rows, setRows] = useState<(McProducto & { id: string })[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
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
      <p className="ios-subhead mt-1.5">
        Tocá el botón azul para agregar un artículo con foto, nombre, precio y stock.
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
          className="mt-3 w-full rounded-[12px] border border-[color-mix(in_srgb,var(--cat-muted)_35%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_92%,var(--cat-accent)_8%)] px-4 py-3 text-[15px] font-semibold text-[var(--cat-text)] active:opacity-90 sm:w-auto"
          onClick={() => setBulkOpen(true)}
        >
          Carga masiva (varias fotos)
        </button>
      )}

      <ul className="mt-6 space-y-3">
        {rows.map((p) => (
          <li key={p.id} className="mc-card flex gap-3 py-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[10px] bg-mc-100">
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
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[color-mix(in_srgb,var(--cat-surface)_82%,var(--cat-muted)_18%)] px-3 py-1.5 text-[13px] font-medium text-[var(--cat-accent)]"
                  onClick={() => void toggleCatalogo(p)}
                >
                  {p.enCatalogo ? 'En catálogo' : 'Oculto'}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-mc-100 px-3 py-1.5 text-[13px] font-medium text-mc-700"
                  onClick={() => void toggleActivo(p)}
                >
                  {p.activo ? 'Activo' : 'Pausado'}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-ios-red/10 px-3 py-1.5 text-[13px] font-medium text-ios-red"
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
        <IconPlus size={26} className="text-white" />
      </button>

      {modalOpen && profile?.tenantId && (
        <QuickAddProductModal
          tenantId={profile.tenantId}
          onClose={() => setModalOpen(false)}
          nextOrden={rows.length}
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
