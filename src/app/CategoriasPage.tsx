import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { collection, doc, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { CrearCategoriaModal } from '@/components/categoria/CrearCategoriaModal'
import { CategoriaImagePicker } from '@/components/categoria/CategoriaImagePicker'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import {
  buildCategoriaTree,
  contarProductosEnCategoria,
  hermanosDe,
  nextOrdenEntreHermanos,
  puedeTenerSubcategorias,
  type CategoriaTreeNode,
} from '@/lib/catalogCategorias'
import {
  mapCategoriaImageError,
  removeCategoriaImage,
  uploadCategoriaImage,
} from '@/lib/categoriaImage'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC, mcCategoriasCollection, mcProductosCollection } from '@/lib/mcCollections'
import {
  mcCreateCategoria,
  mcDeleteCategoria,
  mcUpdateCategoria,
} from '@/lib/mcWrites'
import { clearQuickAddDraft, type CategoriasPageNavState } from '@/lib/productFormCategoriaNav'
import type { McCategoria, McProducto } from '@/types/mc'
import { IconChevronLeft, IconPlus, IconTrash } from '@/icons/McIcons'

function CategoriaRowActions({
  cat,
  busy,
  siblingIndex,
  siblingCount,
  onMove,
  onToggle,
  onEdit,
  onDelete,
  onAddSub,
  showAddSub,
}: {
  cat: McCategoria & { id: string }
  busy: boolean
  siblingIndex: number
  siblingCount: number
  onMove: (dir: -1 | 1) => void
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddSub?: () => void
  showAddSub?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
      <div className="flex rounded-lg border border-neutral-200/70 bg-neutral-50/80 p-0.5">
        <button
          type="button"
          className="rounded-md px-2 py-1.5 text-[12px] font-medium text-mc-600 hover:bg-white disabled:opacity-40"
          disabled={busy || siblingIndex === 0}
          onClick={() => onMove(-1)}
          aria-label="Subir"
        >
          ↑
        </button>
        <button
          type="button"
          className="rounded-md px-2 py-1.5 text-[12px] font-medium text-mc-600 hover:bg-white disabled:opacity-40"
          disabled={busy || siblingIndex >= siblingCount - 1}
          onClick={() => onMove(1)}
          aria-label="Bajar"
        >
          ↓
        </button>
      </div>
      {showAddSub && onAddSub ? (
        <button
          type="button"
          className="rounded-md border border-neutral-200/70 bg-white px-3 py-1.5 text-[13px] font-medium text-mc-700"
          onClick={onAddSub}
          disabled={busy}
        >
          + Sub
        </button>
      ) : null}
      <button
        type="button"
        className="rounded-md border border-neutral-200/70 px-3 py-1.5 text-[13px] font-medium"
        onClick={onToggle}
        disabled={busy}
      >
        {cat.activa ? 'Visible' : 'Oculta'}
      </button>
      <button
        type="button"
        className="rounded-md border border-[var(--cat-accent)]/35 bg-[color-mix(in_srgb,var(--cat-accent)_8%,transparent)] px-3 py-1.5 text-[13px] font-semibold"
        onClick={onEdit}
        disabled={busy}
      >
        Editar
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md border border-transparent px-3 py-1.5 text-[13px] font-medium text-red-700 hover:bg-red-50"
        onClick={onDelete}
        disabled={busy}
      >
        <IconTrash size={16} />
        Borrar
      </button>
    </div>
  )
}

function CategoriaAdminCard({
  cat,
  productCount,
  depth,
  busy,
  imageBusy,
  siblingIndex,
  siblingCount,
  editingId,
  editNombre,
  onEditNombreChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onMove,
  onToggle,
  onDelete,
  onAddSub,
  showAddSub,
  onPickImage,
  onRemoveImage,
}: {
  cat: McCategoria & { id: string }
  productCount: number
  depth: 0 | 1
  busy: boolean
  imageBusy: boolean
  siblingIndex: number
  siblingCount: number
  editingId: string | null
  editNombre: string
  onEditNombreChange: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onStartEdit: () => void
  onMove: (dir: -1 | 1) => void
  onToggle: () => void
  onDelete: () => void
  onAddSub?: () => void
  showAddSub?: boolean
  onPickImage: (file: File) => void
  onRemoveImage: () => void
}) {
  const isSub = depth === 1

  return (
    <div
      className={clsx(
        'mc-card flex flex-col gap-4 py-4 transition sm:flex-row sm:items-center',
        !cat.activa && 'opacity-70',
        isSub && 'ml-4 border-l-2 border-neutral-200/80 sm:ml-6',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <CategoriaImagePicker
          previewUrl={cat.imageUrl ?? null}
          fallbackLetter={cat.nombre.charAt(0).toUpperCase()}
          disabled={busy}
          uploading={imageBusy}
          size={isSub ? 'sm' : 'md'}
          onPick={onPickImage}
          onRemove={cat.imageUrl ? onRemoveImage : undefined}
        />
        <div className="min-w-0 flex-1">
          {isSub ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mc-400">Subcategoría</p>
          ) : null}
          {editingId === cat.id ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="mc-input bg-white py-2 text-[15px]"
                value={editNombre}
                onChange={(e) => onEditNombreChange(e.target.value)}
                autoFocus
                maxLength={48}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="mc-btn-primary px-4 py-2 text-[13px]"
                  disabled={busy}
                  onClick={onSaveEdit}
                >
                  Guardar
                </button>
                <button type="button" className="mc-btn-secondary px-4 py-2 text-[13px]" onClick={onCancelEdit}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="ios-headline truncate">{cat.nombre}</p>
              <p className="ios-subhead mt-0.5">
                {productCount} producto{productCount === 1 ? '' : 's'}
                {!cat.activa ? ' · Oculta en catálogo' : ''}
              </p>
            </>
          )}
        </div>
      </div>

      {editingId !== cat.id ? (
        <CategoriaRowActions
          cat={cat}
          busy={busy}
          siblingIndex={siblingIndex}
          siblingCount={siblingCount}
          onMove={onMove}
          onToggle={onToggle}
          onEdit={onStartEdit}
          onDelete={onDelete}
          onAddSub={onAddSub}
          showAddSub={showAddSub}
        />
      ) : null}
    </div>
  )
}

function TreeAdminList({
  nodes,
  productos,
  categorias,
  busy,
  imageBusyId,
  editingId,
  editNombre,
  onEditNombreChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onMove,
  onToggle,
  onDelete,
  onAddSub,
  onPickImage,
  onRemoveImage,
}: {
  nodes: CategoriaTreeNode[]
  productos: (McProducto & { id: string })[]
  categorias: (McCategoria & { id: string })[]
  busy: boolean
  imageBusyId: string | null
  editingId: string | null
  editNombre: string
  onEditNombreChange: (v: string) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  onStartEdit: (cat: McCategoria & { id: string }) => void
  onMove: (id: string, dir: -1 | 1) => void
  onToggle: (cat: McCategoria & { id: string }) => void
  onDelete: (cat: McCategoria & { id: string }) => void
  onAddSub: (parent: McCategoria & { id: string }) => void
  onPickImage: (cat: McCategoria & { id: string }, file: File) => void
  onRemoveImage: (cat: McCategoria & { id: string }) => void
}) {
  return (
    <ul className="space-y-3">
      {nodes.map((node, rootIdx) => {
        const rootSiblings = hermanosDe(node.id, categorias)
        const rootCount = contarProductosEnCategoria(productos, node.id, categorias)
        return (
          <li key={node.id} className="space-y-2">
            <CategoriaAdminCard
              cat={node}
              productCount={rootCount}
              depth={0}
              busy={busy}
              imageBusy={imageBusyId === node.id}
              siblingIndex={rootIdx}
              siblingCount={rootSiblings.length}
              editingId={editingId}
              editNombre={editNombre}
              onEditNombreChange={onEditNombreChange}
              onSaveEdit={() => onSaveEdit(node.id)}
              onCancelEdit={onCancelEdit}
              onStartEdit={() => onStartEdit(node)}
              onMove={(dir) => onMove(node.id, dir)}
              onToggle={() => onToggle(node)}
              onDelete={() => onDelete(node)}
              onAddSub={() => onAddSub(node)}
              showAddSub={puedeTenerSubcategorias(node)}
              onPickImage={(file) => onPickImage(node, file)}
              onRemoveImage={() => onRemoveImage(node)}
            />
            {node.children.map((sub, subIdx) => {
              const subSiblings = hermanosDe(sub.id, categorias)
              const subCount = contarProductosEnCategoria(productos, sub.id, categorias)
              return (
                <CategoriaAdminCard
                  key={sub.id}
                  cat={sub}
                  productCount={subCount}
                  depth={1}
                  busy={busy}
                  imageBusy={imageBusyId === sub.id}
                  siblingIndex={subIdx}
                  siblingCount={subSiblings.length}
                  editingId={editingId}
                  editNombre={editNombre}
                  onEditNombreChange={onEditNombreChange}
                  onSaveEdit={() => onSaveEdit(sub.id)}
                  onCancelEdit={onCancelEdit}
                  onStartEdit={() => onStartEdit(sub)}
                  onMove={(dir) => onMove(sub.id, dir)}
                  onToggle={() => onToggle(sub)}
                  onDelete={() => onDelete(sub)}
                  onPickImage={(file) => onPickImage(sub, file)}
                  onRemoveImage={() => onRemoveImage(sub)}
                />
              )
            })}
          </li>
        )
      })}
    </ul>
  )
}

export function CategoriasPage() {
  const { effectiveTenantId, tenant } = useMcAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const navState = (location.state ?? null) as CategoriasPageNavState | null
  const fromProductForm = !!navState?.productFormContext
  const backTo = navState?.returnTo ?? '/app/inventario'
  const backLabel = navState?.returnLabel ?? 'Inventario'
  const [categorias, setCategorias] = useState<(McCategoria & { id: string })[]>([])
  const [productos, setProductos] = useState<(McProducto & { id: string })[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [busy, setBusy] = useState(false)
  const [imageBusyId, setImageBusyId] = useState<string | null>(null)
  const [showWithImages, setShowWithImages] = useState(false)
  const [toggleBusy, setToggleBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  useEffect(() => {
    setShowWithImages(tenant?.mostrarCategoriasConImagenes === true)
  }, [tenant?.mostrarCategoriasConImagenes])

  useEffect(() => {
    if (fromProductForm) {
      setCreateErr(null)
      setNuevoNombre('')
      setCreateParentId(null)
      setCreateModalOpen(true)
    }
  }, [fromProductForm])

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

  const tree = useMemo(() => buildCategoriaTree(categorias), [categorias])
  const createParent = createParentId ? categorias.find((c) => c.id === createParentId) : null

  function openCreateModal(parentId: string | null) {
    setCreateErr(null)
    setNuevoNombre('')
    setCreateParentId(parentId)
    setCreateModalOpen(true)
  }

  function closeCreateModal() {
    if (busy) return
    setCreateModalOpen(false)
    setCreateErr(null)
    setNuevoNombre('')
    setCreateParentId(null)
  }

  async function crearCategoria(_e: React.FormEvent, imageFile: File | null) {
    if (!effectiveTenantId) return
    const nombre = nuevoNombre.trim()
    if (!nombre) {
      setCreateErr('Escribí un nombre.')
      return
    }
    setBusy(true)
    setCreateErr(null)
    try {
      const parentId = createParentId ?? undefined
      const { id } = await mcCreateCategoria(effectiveTenantId, {
        nombre,
        parentId: parentId ?? null,
        orden: nextOrdenEntreHermanos(parentId ?? null, categorias),
        activa: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      if (imageFile) {
        try {
          await uploadCategoriaImage(effectiveTenantId, id, imageFile)
        } catch (imgErr) {
          setCreateErr(mapCategoriaImageError(imgErr))
        }
      }
      setNuevoNombre('')
      setCreateModalOpen(false)
      setCreateParentId(null)
      if (navState?.productFormContext) {
        showSaveSuccess({ message: `Categoría «${nombre}» creada.` })
        navigate(backTo, {
          replace: true,
          state: {
            reopenProductForm: navState.productFormContext,
            newCategoriaId: id,
          },
        })
        return
      }
      showSaveSuccess({
        message: parentId ? `Subcategoría «${nombre}» creada.` : `Categoría «${nombre}» creada.`,
      })
    } catch {
      setCreateErr('No se pudo crear.')
    } finally {
      setBusy(false)
    }
  }

  async function pickCategoriaImage(cat: McCategoria & { id: string }, file: File) {
    if (!effectiveTenantId) return
    setImageBusyId(cat.id)
    setErr(null)
    try {
      await uploadCategoriaImage(effectiveTenantId, cat.id, file)
      showSaveSuccess({ message: 'Foto de categoría actualizada.' })
    } catch (e) {
      setErr(mapCategoriaImageError(e))
    } finally {
      setImageBusyId(null)
    }
  }

  async function clearCategoriaImage(cat: McCategoria & { id: string }) {
    if (!effectiveTenantId) return
    setImageBusyId(cat.id)
    setErr(null)
    try {
      await removeCategoriaImage(effectiveTenantId, cat.id, cat.imageUrl)
      showSaveSuccess({ message: 'Foto quitada.' })
    } catch (e) {
      setErr(mapCategoriaImageError(e))
    } finally {
      setImageBusyId(null)
    }
  }

  async function setMostrarConImagenes(next: boolean) {
    if (!effectiveTenantId) return
    setShowWithImages(next)
    setToggleBusy(true)
    setErr(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        mostrarCategoriasConImagenes: next,
      })
      showSaveSuccess({
        message: next
          ? 'El catálogo mostrará categorías con imagen.'
          : 'El catálogo volverá a chips de texto.',
      })
    } catch {
      setShowWithImages(!next)
      setErr('No se pudo guardar la preferencia.')
    } finally {
      setToggleBusy(false)
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
      showSaveSuccess({ message: 'Nombre actualizado.' })
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
    const siblings = hermanosDe(id, categorias)
    const idx = siblings.findIndex((c) => c.id === id)
    const swapIdx = idx + dir
    if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return
    const a = siblings[idx]!
    const b = siblings[swapIdx]!
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

  async function quitarCategoriaDeProductos(ids: string[]) {
    if (!effectiveTenantId || ids.length === 0) return
    const idSet = new Set(ids)
    const afectados = productos.filter((p) => (p.categoriaIds ?? []).some((x) => idSet.has(x)))
    if (afectados.length === 0) return
    const db = getDb()
    const batch = writeBatch(db)
    for (const p of afectados) {
      const nextIds = (p.categoriaIds ?? []).filter((x) => !idSet.has(x))
      batch.update(doc(db, mcProductosCollection(effectiveTenantId), p.id), {
        categoriaIds: nextIds.length > 0 ? nextIds : [],
        updatedAt: Date.now(),
      })
    }
    await batch.commit()
  }

  async function eliminarCategoria(cat: McCategoria & { id: string }) {
    if (!effectiveTenantId) return
    const subs = categorias.filter((c) => c.parentId === cat.id)
    const idsToRemove = [cat.id, ...subs.map((s) => s.id)]
    const count = contarProductosEnCategoria(productos, cat.id, categorias)
    const msg =
      subs.length > 0
        ? `¿Eliminar «${cat.nombre}» y sus ${subs.length} subcategoría${subs.length === 1 ? '' : 's'}? Afecta productos asociados.`
        : count > 0
          ? `¿Eliminar «${cat.nombre}»? Se quitará de ${count} producto${count === 1 ? '' : 's'}.`
          : `¿Eliminar «${cat.nombre}»?`
    if (!window.confirm(msg)) return
    setBusy(true)
    setErr(null)
    try {
      await quitarCategoriaDeProductos(idsToRemove)
      for (const sub of subs) await mcDeleteCategoria(effectiveTenantId, sub.id)
      await mcDeleteCategoria(effectiveTenantId, cat.id)
      showSaveSuccess({ message: 'Eliminada correctamente.' })
    } catch {
      setErr('No se pudo eliminar.')
    } finally {
      setBusy(false)
    }
  }

  const totalCount = categorias.length

  return (
    <div className="mc-shell">
      <Link
        to={backTo}
        state={navState ?? undefined}
        onClick={() => {
          if (navState?.productFormContext?.mode === 'add') clearQuickAddDraft()
        }}
        className="inline-flex items-center gap-1 text-[13px] font-medium text-mc-600 transition hover:text-mc-900"
      >
        <IconChevronLeft size={18} />
        {backLabel}
      </Link>

      {fromProductForm ? (
        <div className="mt-4 rounded-2xl border border-[var(--cat-accent)]/25 bg-[color-mix(in_srgb,var(--cat-accent)_6%,transparent)] px-4 py-3.5">
          <p className="text-[13px] font-medium text-mc-900">Creá la categoría para tu producto</p>
          <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
            Podés crear una categoría raíz o volver después y agregar subcategorías.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ios-large-title">Categorías</h1>
          <p className="ios-subhead mt-2 max-w-xl leading-relaxed">
            Organizá tu catálogo en categorías y subcategorías. Tus clientes las ven en un lateral claro y fácil de
            navegar.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            className="mc-btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-[15px]"
            onClick={() => openCreateModal(null)}
            disabled={busy}
          >
            <IconPlus size={18} className="text-[var(--cat-accent-text)]" />
            Nueva categoría
          </button>
          <div className="flex items-center justify-center gap-2 rounded-full border border-neutral-200/70 bg-white px-4 py-2 text-[13px] text-mc-600 shadow-sm sm:justify-end">
            <span className="font-semibold tabular-nums text-mc-900">{totalCount}</span>
            <span>en total</span>
          </div>
        </div>
      </div>

      {err ? <p className="mt-4 text-[13px] text-red-800">{err}</p> : null}

      <div className="mc-card mt-6 space-y-1">
        <McToggleSwitch
          id="mc-categorias-con-imagenes"
          checked={showWithImages}
          disabled={toggleBusy || !effectiveTenantId}
          onChange={(v) => void setMostrarConImagenes(v)}
          label="Mostrar categorías con imágenes"
          description="En la tienda se ven círculos con foto y el nombre abajo. Si está apagado, se usan los chips de texto."
        />
      </div>

      <div className="mt-8">
        <TreeAdminList
          nodes={tree}
          productos={productos}
          categorias={categorias}
          busy={busy}
          imageBusyId={imageBusyId}
          editingId={editingId}
          editNombre={editNombre}
          onEditNombreChange={setEditNombre}
          onSaveEdit={(id) => void guardarEdicion(id)}
          onCancelEdit={() => setEditingId(null)}
          onStartEdit={(cat) => {
            setEditingId(cat.id)
            setEditNombre(cat.nombre)
          }}
          onMove={(id, dir) => void moverOrden(id, dir)}
          onToggle={(cat) => void toggleActiva(cat)}
          onDelete={(cat) => void eliminarCategoria(cat)}
          onAddSub={(parent) => openCreateModal(parent.id)}
          onPickImage={(cat, file) => void pickCategoriaImage(cat, file)}
          onRemoveImage={(cat) => void clearCategoriaImage(cat)}
        />
      </div>

      {categorias.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-neutral-300/80 bg-neutral-50/50 px-6 py-14 text-center">
          <p className="text-[15px] font-medium text-mc-800">Sin categorías todavía</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-mc-600">
            Creá una categoría raíz y después agregá subcategorías con el botón «+ Sub».
          </p>
          <button
            type="button"
            className="mc-btn-primary mt-5 inline-flex items-center justify-center gap-2 px-5 py-3 text-[15px]"
            onClick={() => openCreateModal(null)}
            disabled={busy}
          >
            <IconPlus size={18} className="text-[var(--cat-accent-text)]" />
            Crear categoría
          </button>
        </div>
      )}

      <CrearCategoriaModal
        open={createModalOpen}
        nombre={nuevoNombre}
        busy={busy}
        error={createErr}
        parentNombre={createParent?.nombre ?? null}
        onNombreChange={setNuevoNombre}
        onClose={closeCreateModal}
        onSubmit={(e, file) => void crearCategoria(e, file)}
      />
    </div>
  )
}
