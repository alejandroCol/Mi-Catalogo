import clsx from 'clsx'

export type CatalogViewTab = 'todos' | 'descuentos'

export function CatalogViewTabs({
  active,
  onChange,
  descuentosLabel,
  descuentosCount,
}: {
  active: CatalogViewTab
  onChange: (tab: CatalogViewTab) => void
  descuentosLabel: string
  descuentosCount: number
}) {
  const tabs: { id: CatalogViewTab; label: string; count?: number }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'descuentos', label: descuentosLabel, count: descuentosCount },
  ]

  return (
    <div
      className="flex gap-1 overflow-x-auto rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_18%,var(--cat-surface)_82%)] bg-[color-mix(in_srgb,var(--cat-bg)_40%,var(--cat-surface)_60%)] p-1 shadow-sm"
      role="tablist"
      aria-label="Secciones del catálogo"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={clsx(
              'relative flex min-h-[44px] min-w-[7rem] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
              selected
                ? 'bg-[var(--cat-surface)] text-[var(--cat-text)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--cat-muted)_12%,transparent)]'
                : 'text-[var(--cat-muted)] hover:text-[var(--cat-text)]',
            )}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span
                className={clsx(
                  'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  selected
                    ? 'bg-[color-mix(in_srgb,var(--cat-accent)_14%,var(--cat-surface)_86%)] text-[var(--cat-accent)]'
                    : 'bg-[color-mix(in_srgb,var(--cat-text)_8%,transparent)] text-[var(--cat-muted)]',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
