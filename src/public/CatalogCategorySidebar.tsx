import clsx from 'clsx'
import { Link } from 'react-router-dom'
import type { McCategoria } from '@/types/mc'

type Props = {
  categorias: (McCategoria & { id: string })[]
  selectedId: string | null
  onSelect: (categoriaId: string | null) => void
  counts: { todos: number; byId: Record<string, number> }
  /** Solo categorías activas en catálogo público. */
  publicMode?: boolean
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
  onClick,
}: {
  active: boolean
  label: string
  count: number
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'mc-cat-sidebar-pill group flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.5 text-left text-[14px] font-medium transition duration-200',
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

export function CatalogCategorySidebar({
  categorias,
  selectedId,
  onSelect,
  counts,
  publicMode = true,
}: Props) {
  const visible = publicMode ? categorias.filter((c) => c.activa) : categorias
  if (visible.length === 0) return null

  return (
    <aside className="mc-cat-sidebar hidden w-[220px] shrink-0 md:block xl:w-[240px]">
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
            {visible.map((cat) => (
              <li key={cat.id}>
                <CategoryPill
                  active={selectedId === cat.id}
                  label={cat.nombre}
                  count={counts.byId[cat.id] ?? 0}
                  onClick={() => onSelect(cat.id)}
                />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  )
}

/** Barra horizontal en móvil con las mismas opciones. */
export function CatalogCategoryMobileBar({
  categorias,
  selectedId,
  onSelect,
  counts,
  publicMode = true,
}: Props) {
  const visible = publicMode ? categorias.filter((c) => c.activa) : categorias
  if (visible.length === 0) return null

  return (
    <div className="mc-cat-mobile-bar -mx-1 mb-5 md:hidden">
      <div className="flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <MobileChip
          active={selectedId == null}
          label="Todos"
          count={counts.todos}
          onClick={() => onSelect(null)}
        />
        {visible.map((cat) => (
          <MobileChip
            key={cat.id}
            active={selectedId === cat.id}
            label={cat.nombre}
            count={counts.byId[cat.id] ?? 0}
            onClick={() => onSelect(cat.id)}
          />
        ))}
      </div>
    </div>
  )
}

function MobileChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition',
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

/** Enlace compacto al admin de categorías (solo inventario). */
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
