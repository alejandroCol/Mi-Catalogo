import clsx from 'clsx'
import { Link } from 'react-router-dom'
import {
  buildCategoriaTree,
  type CategoriaTreeNode,
} from '@/lib/catalogCategorias'
import type { McCategoria } from '@/types/mc'

type Props = {
  categorias: (McCategoria & { id: string })[]
  selectedId: string | null
  onSelect: (categoriaId: string | null) => void
  counts: { todos: number; byId: Record<string, number> }
}

function IconGridSmall({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="1.5" y="1.5" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  )
}

function CategoryPill({
  active,
  label,
  count,
  icon,
  size = 'md',
  onClick,
}: {
  active: boolean
  label: string
  count: number
  icon?: React.ReactNode
  size?: 'md' | 'sm'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'mc-cat-sidebar-pill group flex w-full items-center gap-2.5 rounded-full text-left font-medium transition duration-200',
        size === 'sm' ? 'px-3 py-2 text-[13px]' : 'px-3.5 py-2.5 text-[14px]',
        active
          ? 'bg-[var(--cat-text)] text-[var(--cat-bg)] shadow-[0_2px_12px_rgba(0,0,0,0.12)]'
          : 'bg-[color-mix(in_srgb,var(--cat-surface)_92%,var(--cat-bg)_8%)] text-[var(--cat-text)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
      )}
    >
      {icon ? (
        <span
          className={clsx(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
            active ? 'text-[var(--cat-bg)]' : 'text-[var(--cat-muted)]',
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={clsx(
          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
          active
            ? 'bg-[color-mix(in_srgb,var(--cat-bg)_18%,transparent)] text-[var(--cat-bg)]'
            : 'bg-[color-mix(in_srgb,var(--cat-muted)_12%,var(--cat-surface)_88%)] text-[var(--cat-muted)]',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function SidebarTreeNode({
  node,
  selectedId,
  counts,
  onSelect,
  depth = 0,
}: {
  node: CategoriaTreeNode
  selectedId: string | null
  counts: { todos: number; byId: Record<string, number> }
  onSelect: (id: string | null) => void
  depth?: number
}) {
  const hasChildren = node.children.length > 0
  const rootCount = counts.byId[node.id] ?? 0

  return (
    <li className={clsx(depth > 0 && 'mt-1.5')}>
      <div style={depth > 0 ? { paddingLeft: `${depth * 14}px` } : undefined}>
        <CategoryPill
          active={selectedId === node.id}
          label={node.nombre}
          count={rootCount}
          size={depth > 0 ? 'sm' : 'md'}
          onClick={() => onSelect(node.id)}
        />
      </div>
      {hasChildren ? (
        <ul className="mt-1.5 space-y-1 border-l border-[color-mix(in_srgb,var(--cat-muted)_16%,transparent)] pl-2">
          {node.children.map((sub) => (
            <SidebarTreeNode
              key={sub.id}
              node={sub}
              selectedId={selectedId}
              counts={counts}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function CatalogCategorySidebar({ categorias, selectedId, onSelect, counts }: Props) {
  const tree = buildCategoriaTree(categorias)
  if (tree.length === 0) return null

  return (
    <aside className="mc-cat-sidebar hidden w-[220px] shrink-0 md:block xl:w-[248px]">
      <nav aria-label="Categorías del catálogo" className="sticky top-[calc(3.75rem+1.5rem)] space-y-6">
        <div>
          <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
            Explorar
          </p>
          <CategoryPill
            active={selectedId == null}
            label="Todos"
            count={counts.todos}
            icon={<IconGridSmall />}
            onClick={() => onSelect(null)}
          />
        </div>
        <div>
          <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
            Categorías
          </p>
          <ul className="space-y-2">
            {tree.map((node) => (
              <SidebarTreeNode
                key={node.id}
                node={node}
                selectedId={selectedId}
                counts={counts}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  )
}

function MobileChip({
  active,
  label,
  count,
  sub,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  sub?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex shrink-0 items-center gap-2 rounded-full font-medium transition',
        sub ? 'px-3 py-1.5 text-[12px]' : 'px-3.5 py-2 text-[13px]',
        active
          ? 'bg-[var(--cat-text)] text-[var(--cat-bg)] shadow-sm'
          : 'border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] bg-[var(--cat-surface)] text-[var(--cat-text)]',
      )}
    >
      {label}
      <span
        className={clsx(
          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
          active
            ? 'bg-[color-mix(in_srgb,var(--cat-bg)_20%,transparent)]'
            : 'bg-[color-mix(in_srgb,var(--cat-muted)_10%,var(--cat-surface)_90%)] text-[var(--cat-muted)]',
        )}
      >
        {count}
      </span>
    </button>
  )
}

export function CatalogCategoryMobileBar({ categorias, selectedId, onSelect, counts }: Props) {
  const tree = buildCategoriaTree(categorias)
  if (tree.length === 0) return null

  return (
    <div className="mc-cat-mobile-bar -mx-1 mb-5 md:hidden">
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MobileChip
            active={selectedId == null}
            label="Todos"
            count={counts.todos}
            onClick={() => onSelect(null)}
          />
          {tree.map((node) => (
            <MobileChip
              key={node.id}
              active={selectedId === node.id}
              label={node.nombre}
              count={counts.byId[node.id] ?? 0}
              onClick={() => onSelect(node.id)}
            />
          ))}
        </div>
        {tree.some((n) => n.children.length > 0) ? (
          <div className="flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tree.flatMap((node) =>
              node.children.map((sub) => (
                <MobileChip
                  key={sub.id}
                  active={selectedId === sub.id}
                  label={sub.nombre}
                  count={counts.byId[sub.id] ?? 0}
                  sub
                  onClick={() => onSelect(sub.id)}
                />
              )),
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function CatalogCategoryHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <header className="mb-6 sm:mb-8">
      <h1 className="mc-pc-display text-2xl font-bold tracking-tight text-[var(--cat-text)] sm:text-3xl">
        {title}
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--cat-muted)] sm:text-sm">{subtitle}</p>
    </header>
  )
}

export function InventarioCategoriasLink({ className }: { className?: string }) {
  return (
    <Link
      to="/app/inventario/categorias"
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-white px-3 py-1.5 text-[13px] font-medium text-[var(--cat-text)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition hover:border-neutral-300/90 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      <IconGridSmall className="text-[var(--cat-muted)]" />
      Categorías
    </Link>
  )
}
