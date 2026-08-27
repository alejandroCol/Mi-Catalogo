import clsx from 'clsx'
import { Link } from 'react-router-dom'
import {
  buildCategoriaTree,
  categoriaEtiquetaProducto,
  type CategoriaTreeNode,
} from '@/lib/catalogCategorias'
import { CATEGORIAS_PATH, type CategoriasPageNavState } from '@/lib/productFormCategoriaNav'
import type { McCategoria } from '@/types/mc'

type Props = {
  categorias: (McCategoria & { id: string })[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  createCategoriasNav?: CategoriasPageNavState
  onBeforeCreateCategorias?: () => void
}

function CategoriaPillButton({
  label,
  selected,
  disabled,
  indent,
  onClick,
}: {
  label: string
  selected: boolean
  disabled?: boolean
  indent?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition duration-200',
        indent && 'ml-1 border-l-2 border-neutral-200/80 pl-3',
        selected
          ? 'bg-mc-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
          : 'border border-neutral-200/80 bg-white text-mc-800 hover:border-neutral-300',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      {label}
      {selected ? (
        <span className="text-[11px] opacity-80" aria-hidden>
          ✓
        </span>
      ) : null}
    </button>
  )
}

function PickerTreeGroup({
  node,
  selectedIds,
  disabled,
  onToggle,
}: {
  node: CategoriaTreeNode
  selectedIds: string[]
  disabled?: boolean
  onToggle: (id: string) => void
}) {
  const hasChildren = node.children.length > 0
  const rootSelectable = node.activa && !hasChildren

  return (
    <div className="space-y-2">
      {hasChildren ? (
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-mc-500">{node.nombre}</p>
      ) : rootSelectable ? (
        <CategoriaPillButton
          label={node.nombre}
          selected={selectedIds.includes(node.id)}
          disabled={disabled}
          onClick={() => onToggle(node.id)}
        />
      ) : !node.activa ? (
        <p className="px-1 text-[12px] text-mc-400">{node.nombre} (oculta)</p>
      ) : null}

      {hasChildren ? (
        <div className="flex flex-wrap gap-2">
          {node.children.map((sub) =>
            sub.activa ? (
              <CategoriaPillButton
                key={sub.id}
                label={sub.nombre}
                selected={selectedIds.includes(sub.id)}
                disabled={disabled}
                indent
                onClick={() => onToggle(sub.id)}
              />
            ) : null,
          )}
          {node.activa ? (
            <CategoriaPillButton
              label={`Todo ${node.nombre}`}
              selected={selectedIds.includes(node.id)}
              disabled={disabled}
              indent
              onClick={() => onToggle(node.id)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ProductoCategoriasPicker({
  categorias,
  selectedIds,
  onChange,
  disabled,
  createCategoriasNav,
  onBeforeCreateCategorias,
}: Props) {
  const tree = buildCategoriaTree(categorias.filter((c) => c.activa || selectedIds.includes(c.id)))

  function toggle(id: string) {
    if (disabled) return
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  if (categorias.length === 0) {
    const fromProductForm = !!createCategoriasNav
    return (
      <div className="rounded-xl border border-dashed border-neutral-300/80 bg-gradient-to-br from-white/80 to-neutral-50/60 px-4 py-5 text-center">
        <p className="text-[13px] font-medium leading-relaxed text-mc-800">
          Todavía no tenés categorías
        </p>
        <p className="mx-auto mt-1.5 max-w-[16rem] text-[12px] leading-relaxed text-mc-500">
          {fromProductForm
            ? 'Creá la primera y volvé al producto con la categoría ya asignada.'
            : 'Organizá tu catálogo en categorías y subcategorías.'}
        </p>
        <Link
          to={CATEGORIAS_PATH}
          state={createCategoriasNav}
          onClick={() => onBeforeCreateCategorias?.()}
          className={clsx(
            'mt-3 inline-flex items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition duration-200',
            fromProductForm
              ? 'bg-mc-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:opacity-95'
              : 'text-[var(--cat-text)] underline underline-offset-2',
          )}
        >
          {fromProductForm ? 'Crear categoría' : 'Crear categorías'}
        </Link>
      </div>
    )
  }

  const inactiveSelected = selectedIds.filter((id) => {
    const c = categorias.find((x) => x.id === id)
    return c && !c.activa
  })

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border border-neutral-200/70 bg-white/70 p-4">
        {tree.map((node) => (
          <PickerTreeGroup
            key={node.id}
            node={node}
            selectedIds={selectedIds}
            disabled={disabled}
            onToggle={toggle}
          />
        ))}
      </div>

      {inactiveSelected.length > 0 ? (
        <p className="text-[12px] text-amber-800">
          Hay categorías inactivas asignadas (
          {inactiveSelected.map((id) => categoriaEtiquetaProducto(id, categorias)).join(', ')}); no se verán en el
          catálogo.
        </p>
      ) : null}

      <p className="text-[12px] leading-relaxed text-mc-500">
        Elegí categoría o subcategoría.{' '}
        <Link
          to={CATEGORIAS_PATH}
          state={createCategoriasNav}
          onClick={() => onBeforeCreateCategorias?.()}
          className="font-medium text-mc-800 underline underline-offset-2"
        >
          {createCategoriasNav ? 'Crear o gestionar categorías' : 'Gestionar categorías'}
        </Link>
      </p>
    </div>
  )
}
