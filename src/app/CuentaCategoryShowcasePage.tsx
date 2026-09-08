import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { collection, deleteField, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import {
  buildCategoriaTree,
  categoriasPublicasVisibles,
  contarProductosEnCategoria,
  type CategoriaConId,
  type CategoriaTreeNode,
} from '@/lib/catalogCategorias'
import {
  CATEGORY_SHOWCASE_LIMITS,
  buildCategoryShowcaseForSave,
  selectCategoryShowcaseProducts,
} from '@/lib/categoryShowcase'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC, mcProductosCollection } from '@/lib/mcCollections'
import { useTenantCategorias } from '@/hooks/useTenantCategorias'
import { CategoryShowcaseBanner } from '@/public/categoryShowcase/CategoryShowcaseBanner'
import type { McProducto, McTenant } from '@/types/mc'

function previewTenant(
  base: McTenant,
  draft: { enabled: boolean; categoriaId: string; title: string },
): McTenant {
  const categoryShowcase = buildCategoryShowcaseForSave(draft.enabled, {
    categoriaId: draft.categoriaId,
    title: draft.title,
  })
  return {
    ...base,
    ...(categoryShowcase ? { categoryShowcase } : { categoryShowcase: undefined }),
  }
}

export function CuentaCategoryShowcasePage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel } = useConfigSubpageNav()
  const { showSaveSuccess } = useSaveSuccess()
  const { categorias, loading: categoriasLoading } = useTenantCategorias(effectiveTenantId)

  const [enabled, setEnabled] = useState(false)
  const [categoriaId, setCategoriaId] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [products, setProducts] = useState<(McProducto & { id: string })[]>([])

  useEffect(() => {
    if (!tenant) return
    const raw = tenant.categoryShowcase
    setEnabled(raw?.enabled === true)
    setCategoriaId(raw?.categoriaId ?? '')
    setTitle(raw?.title ?? '')
  }, [tenant?.id, tenant?.categoryShowcase])

  useEffect(() => {
    if (!firebaseConfigured || !effectiveTenantId) {
      setProducts([])
      return
    }
    const q = query(
      collection(getDb(), mcProductosCollection(effectiveTenantId)),
      where('activo', '==', true),
      where('enCatalogo', '==', true),
      orderBy('orden', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
  }, [effectiveTenantId])

  const visibles = useMemo(() => categoriasPublicasVisibles(categorias), [categorias])
  const tree = useMemo(() => buildCategoriaTree(visibles), [visibles])
  const draftTenant = useMemo(() => {
    if (!tenant) return null
    return previewTenant(tenant, { enabled, categoriaId, title })
  }, [tenant, enabled, categoriaId, title])
  const previewCount = useMemo(
    () => (categoriaId ? selectCategoryShowcaseProducts(products, categoriaId, visibles).length : 0),
    [categoriaId, products, visibles],
  )

  async function guardar() {
    if (!effectiveTenantId || !tenant) return
    setBusy(true)
    setErr(null)
    const categoryShowcase = buildCategoryShowcaseForSave(enabled, { categoriaId, title })
    if (enabled && !categoryShowcase) {
      setErr('Elegí una categoría para mostrar el carrusel.')
      setBusy(false)
      return
    }
    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        categoryShowcase: categoryShowcase ?? deleteField(),
      })
      showSaveSuccess({
        message: categoryShowcase
          ? 'El carrusel de categoría ya aparece debajo del banner principal.'
          : 'El carrusel de categoría ya no aparece en el catálogo.',
      })
    } catch {
      setErr('No se pudo guardar. Revisá tu conexión.')
    } finally {
      setBusy(false)
    }
  }

  if (!tenant) {
    return (
      <ConfiguracionesSubpageLayout
        title="Carrusel de categoría"
        backTo={returnTo}
        backLabel={returnLabel}
      >
        <p className="ios-footnote text-[var(--cat-muted)]">Cargando…</p>
      </ConfiguracionesSubpageLayout>
    )
  }

  return (
    <ConfiguracionesSubpageLayout
      title="Carrusel de categoría"
      backTo={returnTo}
      backLabel={returnLabel}
      headerExtra={
        <p className="ios-subhead max-w-2xl leading-relaxed text-[var(--cat-muted)]">
          Un carrusel horizontal debajo del banner principal. Al pasar el mouse se ve la segunda
          foto del producto, las tallas y compra rápida.
        </p>
      }
    >
      <div className="mc-card space-y-5">
        <McToggleSwitch
          id="mc-category-showcase-enabled"
          checked={enabled}
          disabled={busy}
          onChange={setEnabled}
          label="Mostrar carrusel debajo del banner"
          description="Aparece en el home del catálogo, justo después del banner de temporada o la landing interactiva."
        />

        {enabled ? (
          <>
            <ProductoFormSection
              title="Categoría"
              description="Los productos activos de esta categoría (y sus subcategorías) se muestran en el carrusel."
            >
              {categoriasLoading ? (
                <p className="ios-footnote text-[var(--cat-muted)]">Cargando categorías…</p>
              ) : tree.length === 0 ? (
                <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
                  Todavía no tenés categorías activas. Crealas en Inventario → Categorías.
                </p>
              ) : (
                <div className="space-y-3" role="radiogroup" aria-label="Categoría del carrusel">
                  {tree.map((node) => (
                    <CategoryPickGroup
                      key={node.id}
                      node={node}
                      selectedId={categoriaId}
                      disabled={busy}
                      products={products}
                      categorias={visibles}
                      onSelect={setCategoriaId}
                    />
                  ))}
                </div>
              )}
            </ProductoFormSection>

            <ProductoFormSection
              title="Título"
              description="Si lo dejás vacío, se usa el nombre de la categoría."
            >
              <input
                className="mc-input"
                value={title}
                maxLength={CATEGORY_SHOWCASE_LIMITS.title}
                disabled={busy}
                placeholder="Ej. Camisetas"
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
                {title.length}/{CATEGORY_SHOWCASE_LIMITS.title}
              </p>
            </ProductoFormSection>
          </>
        ) : null}

        {err ? <p className="text-[15px] text-red-600">{err}</p> : null}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar carrusel
        </button>
      </div>

      {enabled && draftTenant && categoriaId ? (
        <div className="space-y-3">
          <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Vista previa</p>
          <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white px-4 py-5 sm:px-6">
            {previewCount === 0 ? (
              <p className="py-10 text-center text-sm leading-relaxed text-[var(--cat-muted)]">
                Esta categoría todavía no tiene productos en el catálogo.
              </p>
            ) : (
              <CategoryShowcaseBanner
                tenant={draftTenant}
                products={products}
                categorias={visibles}
                productPath={() => '#'}
                preview
              />
            )}
          </div>
        </div>
      ) : null}
    </ConfiguracionesSubpageLayout>
  )
}

function CategoryPickGroup({
  node,
  selectedId,
  disabled,
  products,
  categorias,
  onSelect,
}: {
  node: CategoriaTreeNode
  selectedId: string
  disabled?: boolean
  products: McProducto[]
  categorias: CategoriaConId[]
  onSelect: (id: string) => void
}) {
  const count = contarProductosEnCategoria(products, node.id, categorias)
  const selected = selectedId === node.id

  return (
    <div className="space-y-2">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        onClick={() => onSelect(node.id)}
        className={clsx(
          'flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition',
          selected
            ? 'border-[var(--cat-text)] bg-white shadow-sm'
            : 'border-neutral-200/80 bg-white/70 hover:border-neutral-300',
        )}
      >
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-[var(--cat-text)]">{node.nombre}</span>
          <span className="ios-footnote text-[var(--cat-muted)]">
            {count === 1 ? '1 producto' : `${count} productos`}
          </span>
        </span>
        <span
          className={clsx(
            'h-4 w-4 shrink-0 rounded-full border',
            selected ? 'border-[var(--cat-text)] bg-[var(--cat-text)]' : 'border-neutral-300',
          )}
          aria-hidden
        />
      </button>
      {node.children.length > 0 ? (
        <div className="space-y-2 pl-4">
          {node.children.map((child) => (
            <CategoryPickGroup
              key={child.id}
              node={child}
              selectedId={selectedId}
              disabled={disabled}
              products={products}
              categorias={categorias}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
