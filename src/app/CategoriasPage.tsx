import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { collection, doc, onSnapshot, orderBy, query, writeBatch } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { contarProductosPorCategoria } from '@/lib/catalogCategorias'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcCategoriasCollection, mcProductosCollection } from '@/lib/mcCollections'
import {
  mcCreateCategoria,
  mcDeleteCategoria,
  mcUpdateCategoria,
} from '@/lib/mcWrites'
import type { McCategoria, McProducto } from '@/types/mc'
import { IconChevronLeft, IconPlus, IconTrash } from '@/icons/McIcons'

export function CategoriasPage() {
  const { effectiveTenantId } = useMcAuth()
  const [categorias, setCategorias] = useState<(McCategoria & { id: string })[]>([])
  const [productos, setProductos] = useState<(McProducto & { id: string })[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  useEffect(() => {
    if (!firebaseConfigured || !effectiveTenantId) return
    const db = getDb()
    const qCat = query(collection(db, mcCategoriasCollection(effectiveTenantId)), orderBy('orden', 'asc'))
    const qProd = query(collection(db, mcProductosCollection(effectiveTenantId)), orderBy('orden', 'asc'))
    const unsubCat = onSnapshot(qCat, (snap) => {
      setCategorias(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McCategoria, 'id'>) })))
    })
    const unsubProd = onSnapshot(qProd, (snap) => {
      setProductos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
    return () => {
      unsubCat()
      unsubProd()
    }
  }, [effectiveTenantId])

  const conConteo = useMemo(
    () => contarProductosPorCategoria(productos, categorias),
    [productos, categorias],
  )

  async function crearCategoria(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveTenantId) return
    const nombre = nuevoNombre.trim()
    if (!nombre) {
      setErr('Escribí un nombre para la categoría.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await mcCreateCategoria(effectiveTenantId, {
        nombre,
        orden: categorias.length,
        activa: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      setNuevoNombre('')
      showSaveSuccess({ message: `Categoría «${nombre}» creada.` })
    } catch {
      setErr('No se pudo crear la categoría.')
    } finally {
      setBusy(false)
    }
  }

  async function guardarEdicion(id: string) {
    if (!effectiveTenantId) return
    const nombre = editNombre.trim()
    if (!nombre) {
      setErr('El nombre no puede estar vacío.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await mcUpdateCategoria(effectiveTenantId, id, { nombre })
      setEditingId(null)
      showSaveSuccess({ message: 'Categoría actualizada.' })
    } catch {
      setErr('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActiva(cat: McCategoria & { id: string }) {
    if (!effectiveTenantId) return
    await mcUpdateCategoria(effectiveTenantId, cat.id, { activa: !cat.activa })
  }

  async function moverOrden(id: string, dir: -1 | 1) {
    if (!effectiveTenantId) return
    const idx = categorias.findIndex((c) => c.id === id)
    const swapIdx = idx + dir
    if (idx < 0 || swapIdx < 0 || swapIdx >= categorias.length) return
    const a = categorias[idx]!
    const b = categorias[swapIdx]!
    setBusy(true)
    try {
      await Promise.all([
        mcUpdateCategoria(effectiveTenantId, a.id, { orden: b.orden }),
        mcUpdateCategoria(effectiveTenantId, b.id, { orden: a.orden }),
      ])
    } finally {
      setBusy(false)
    }
  }

  async function eliminarCategoria(cat: McCategoria & { id: string }) {
    if (!effectiveTenantId) return
    const count = conConteo.find((c) => c.id === cat.id)?.productCount ?? 0
    const msg =
      count > 0
        ? `¿Eliminar «${cat.nombre}»? Se quitará de ${count} producto${count === 1 ? '' : 's'}.`
        : `¿Eliminar «${cat.nombre}»?`
    if (!window.confirm(msg)) return
    setBusy(true)
    setErr(null)
    try {
      const db = getDb()
      const afectados = productos.filter((p) => (p.categoriaIds ?? []).includes(cat.id))
      if (afectados.length > 0) {
        const batch = writeBatch(db)
        for (const p of afectados) {
          const nextIds = (p.categoriaIds ?? []).filter((x) => x !== cat.id)
          batch.update(doc(db, mcProductosCollection(effectiveTenantId), p.id), {
            categoriaIds: nextIds.length > 0 ? nextIds : [],
            updatedAt: Date.now(),
          })
        }
        await batch.commit()
      }
      await mcDeleteCategoria(effectiveTenantId, cat.id)
      showSaveSuccess({ message: 'Categoría eliminada.' })
    } catch {
      setErr('No se pudo eliminar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell">
      <Link
        to="/app/inventario"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-mc-600 transition hover:text-mc-900"
      >
        <IconChevronLeft size={18} />
        Inventario
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ios-large-title">Categorías</h1>
          <p className="ios-subhead mt-2 max-w-xl leading-relaxed">
            Organizá tu catálogo en secciones. Aparecen en un lateral elegante para tus clientes.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-200/70 bg-white px-4 py-2 text-[13px] text-mc-600 shadow-sm">
          <span className="font-semibold tabular-nums text-mc-900">{categorias.length}</span>
          <span>categoría{categorias.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <form
        onSubmit={crearCategoria}
        className="mc-card mt-8 overflow-hidden border border-neutral-200/60 p-0 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
      >
        <div className="border-b border-neutral-200/50 bg-gradient-to-br from-neutral-50 to-white px-5 py-4">
          <h2 className="ios-headline text-[17px]">Nueva categoría</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-mc-600">
            Ej: Pantalón, Sets, Shorts, Accesorios…
          </p>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="ios-footnote font-medium text-mc-700">Nombre</label>
            <input
              className="mc-input mt-1.5 bg-white"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nombre de la categoría"
              maxLength={48}
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !nuevoNombre.trim()}
            className="mc-btn-primary inline-flex shrink-0 items-center justify-center gap-2 px-5 py-3 sm:min-w-[160px]"
          >
            <IconPlus size={18} className="text-[var(--cat-accent-text)]" />
            Crear
          </button>
        </div>
      </form>

      {err ? <p className="mt-4 text-[13px] text-red-800">{err}</p> : null}

      <ul className="mt-8 space-y-3">
        {conConteo.map((cat, idx) => (
          <li
            key={cat.id}
            className={clsx(
              'mc-card flex flex-col gap-4 py-4 transition sm:flex-row sm:items-center',
              !cat.activa && 'opacity-70',
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className={clsx(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[15px] font-bold',
                  cat.activa
                    ? 'bg-mc-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                    : 'bg-neutral-200 text-mc-600',
                )}
              >
                {cat.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                {editingId === cat.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      className="mc-input bg-white py-2 text-[15px]"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      autoFocus
                      maxLength={48}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="mc-btn-primary px-4 py-2 text-[13px]"
                        disabled={busy}
                        onClick={() => void guardarEdicion(cat.id)}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="mc-btn-secondary px-4 py-2 text-[13px]"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="ios-headline truncate">{cat.nombre}</p>
                    <p className="ios-subhead mt-0.5">
                      {cat.productCount} producto{cat.productCount === 1 ? '' : 's'}
                      {!cat.activa ? ' · Oculta en catálogo' : ''}
                    </p>
                  </>
                )}
              </div>
            </div>

            {editingId !== cat.id ? (
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <div className="flex rounded-lg border border-neutral-200/70 bg-neutral-50/80 p-0.5">
                  <button
                    type="button"
                    className="rounded-md px-2 py-1.5 text-[12px] font-medium text-mc-600 hover:bg-white disabled:opacity-40"
                    disabled={busy || idx === 0}
                    onClick={() => void moverOrden(cat.id, -1)}
                    aria-label="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1.5 text-[12px] font-medium text-mc-600 hover:bg-white disabled:opacity-40"
                    disabled={busy || idx === conConteo.length - 1}
                    onClick={() => void moverOrden(cat.id, 1)}
                    aria-label="Bajar"
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-neutral-200/70 px-3 py-1.5 text-[13px] font-medium"
                  onClick={() => void toggleActiva(cat)}
                >
                  {cat.activa ? 'Visible' : 'Oculta'}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--cat-accent)]/35 bg-[color-mix(in_srgb,var(--cat-accent)_8%,transparent)] px-3 py-1.5 text-[13px] font-semibold"
                  onClick={() => {
                    setEditingId(cat.id)
                    setEditNombre(cat.nombre)
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-transparent px-3 py-1.5 text-[13px] font-medium text-red-700 hover:bg-red-50"
                  onClick={() => void eliminarCategoria(cat)}
                >
                  <IconTrash size={16} />
                  Borrar
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {categorias.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-neutral-300/80 bg-neutral-50/50 px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-mc-800">Sin categorías todavía</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-mc-600">
            Creá la primera arriba y asignalas a tus productos desde el inventario.
          </p>
        </div>
      )}
    </div>
  )
}
