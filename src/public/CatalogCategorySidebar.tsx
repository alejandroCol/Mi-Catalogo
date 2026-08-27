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
  /** Círculo + nombre debajo (moderno). */
  showWithImages?: boolean
  /** Foto del círculo «Todos» (opcional). */
  todosImageUrl?: string | null
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

function CategoryAvatar({
  imageUrl,
  letter,
  active,
  size = 'md',
}: {
  imageUrl?: string | null
  letter: string
  active: boolean
  size?: 'md' | 'sm'
}) {
  const dim =
    size === 'sm'
      ? 'h-6 w-6 sm:h-7 sm:w-7'
      : 'h-[2.125rem] w-[2.125rem] sm:h-[2.375rem] sm:w-[2.375rem]'
  return (
    <span
      className={clsx(
        'relative block overflow-hidden rounded-full transition duration-300',
        dim,
        active
          ? 'ring-2 ring-[var(--cat-text)] ring-offset-1 ring-offset-[var(--cat-bg)] shadow-[0_4px_12px_-6px_rgba(0,0,0,0.3)]'
          : 'ring-1 ring-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] shadow-[0_2px_8px_-6px_rgba(0,0,0,0.22)] group-hover:ring-[color-mix(in_srgb,var(--cat-text)_28%,transparent)]',
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span
          className={clsx(
            'flex h-full w-full items-center justify-center font-semibold',
            size === 'sm' ? 'text-[10px]' : 'text-[11px]',
            active
              ? 'bg-[var(--cat-text)] text-[var(--cat-bg)]'
              : 'bg-[color-mix(in_srgb,var(--cat-muted)_10%,var(--cat-surface)_90%)] text-[var(--cat-text)]',
          )}
        >
          {letter}
        </span>
      )}
    </span>
  )
}

function CategoryImageItem({
  active,
  label,
  imageUrl,
  size = 'md',
  onClick,
}: {
  active: boolean
  label: string
  imageUrl?: string | null
  size?: 'md' | 'sm'
  onClick: () => void
}) {
  const letter = label.trim().charAt(0).toUpperCase() || '·'
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'mc-cat-image-item group flex shrink-0 flex-col items-center gap-1.5 text-center transition',
        size === 'sm' ? 'w-[2.75rem] sm:w-[3.25rem]' : 'w-[3.25rem] sm:w-[3.75rem]',
      )}
    >
      <CategoryAvatar imageUrl={imageUrl} letter={letter} active={active} size={size} />
      <span
        className={clsx(
          'line-clamp-2 w-full px-0.5 text-[10px] font-medium leading-snug tracking-tight transition sm:text-[11px]',
          active ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)] group-hover:text-[var(--cat-text)]',
        )}
      >
        {label}
      </span>
    </button>
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

export function CatalogCategorySidebar({
  categorias,
  selectedId,
  onSelect,
  counts,
  showWithImages = false,
  todosImageUrl = null,
}: Props) {
  const tree = buildCategoriaTree(categorias)
  if (tree.length === 0) return null

  if (showWithImages) {
    return (
      <aside className="mc-cat-sidebar hidden w-[100px] shrink-0 md:block xl:w-[108px]">
        <nav
          aria-label="Categorías del catálogo"
          className="sticky top-[calc(var(--mc-pc-announcement-h,0px)+var(--mc-pc-header-h,3.75rem)+1.5rem)]"
        >
          <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
            Explorar
          </p>
          <ul className="flex flex-col items-center gap-3">
            <li>
              <CategoryImageItem
                active={selectedId == null}
                label="Todos"
                imageUrl={todosImageUrl}
                onClick={() => onSelect(null)}
              />
            </li>
            {tree.map((node) => (
              <li key={node.id} className="flex flex-col items-center gap-2">
                <CategoryImageItem
                  active={selectedId === node.id}
                  label={node.nombre}
                  imageUrl={node.imageUrl}
                  onClick={() => onSelect(node.id)}
                />
                {node.children.length > 0 ? (
                  <ul className="flex flex-col items-center gap-2 border-t border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] pt-2">
                    {node.children.map((sub) => (
                      <li key={sub.id}>
                        <CategoryImageItem
                          active={selectedId === sub.id}
                          label={sub.nombre}
                          imageUrl={sub.imageUrl}
                          size="sm"
                          onClick={() => onSelect(sub.id)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    )
  }

  return (
    <aside className="mc-cat-sidebar hidden w-[220px] shrink-0 md:block xl:w-[248px]">
      <nav
        aria-label="Categorías del catálogo"
        className="sticky top-[calc(var(--mc-pc-announcement-h,0px)+var(--mc-pc-header-h,3.75rem)+1.5rem)] space-y-6"
      >
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

export function CatalogCategoryMobileBar({
  categorias,
  selectedId,
  onSelect,
  counts,
  showWithImages = false,
  todosImageUrl = null,
}: Props) {
  const tree = buildCategoriaTree(categorias)
  if (tree.length === 0) return null

  if (showWithImages) {
    return (
      <div className="mc-cat-mobile-bar -mx-1 mb-5 md:hidden">
        <div className="flex gap-2.5 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CategoryImageItem
            active={selectedId == null}
            label="Todos"
            imageUrl={todosImageUrl}
            onClick={() => onSelect(null)}
          />
          {tree.map((node) => (
            <CategoryImageItem
              key={node.id}
              active={selectedId === node.id}
              label={node.nombre}
              imageUrl={node.imageUrl}
              onClick={() => onSelect(node.id)}
            />
          ))}
        </div>
        {tree.some((n) => n.children.length > 0) ? (
          <div className="mt-2.5 flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tree.flatMap((node) =>
              node.children.map((sub) => (
                <CategoryImageItem
                  key={sub.id}
                  active={selectedId === sub.id}
                  label={sub.nombre}
                  imageUrl={sub.imageUrl}
                  size="sm"
                  onClick={() => onSelect(sub.id)}
                />
              )),
            )}
          </div>
        ) : null}
      </div>
    )
  }

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
