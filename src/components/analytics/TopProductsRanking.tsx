import clsx from 'clsx'
import type { McTopProductRow } from '@/types/mc'

type TopProductsRankingProps = {
  rows: McTopProductRow[]
  loading: boolean
  slug: string
  periodLabel: string
  className?: string
}

export function TopProductsRanking({
  rows,
  loading,
  slug,
  periodLabel,
  className,
}: TopProductsRankingProps) {
  const maxViews = rows[0]?.views ?? 1

  return (
    <section className={clsx('border border-neutral-200/50 bg-[var(--cat-surface)] p-5 sm:p-7', className)}>
      <div className="mb-5">
        <h2 className="text-[15px] font-medium tracking-tight text-[var(--cat-text)]">
          Productos más visitados
        </h2>
        <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
          Ranking por vistas al detalle en los últimos {periodLabel.toLowerCase()}
        </p>
      </div>

      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse bg-neutral-100" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse bg-neutral-100" />
                <div className="h-2 w-full animate-pulse bg-neutral-100" />
              </div>
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-[14px] leading-relaxed text-[var(--cat-muted)]">
          Todavía no hay vistas a productos en este periodo. Cuando alguien abra un artículo en tu catálogo,
          aparecerá acá.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => (
            <li key={row.productId}>
              <a
                href={`/c/${slug}/p/${row.productId}`}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 border border-transparent px-2 py-2 transition hover:border-neutral-200/60 hover:bg-neutral-50/50 sm:gap-4 sm:px-3"
              >
                <span
                  className={clsx(
                    'flex h-8 w-8 shrink-0 items-center justify-center text-[12px] font-semibold tabular-nums',
                    index === 0
                      ? 'bg-[var(--cat-accent)] text-[var(--cat-accent-text)]'
                      : 'border border-neutral-200/70 text-[var(--cat-muted)]',
                  )}
                >
                  {index + 1}
                </span>
                {row.imageUrl ? (
                  <img
                    src={row.imageUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 border border-neutral-200/50 object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-neutral-200/50 bg-neutral-50 text-[10px] font-semibold uppercase tracking-wide text-[var(--cat-muted)]">
                    Sin foto
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium tracking-tight text-[var(--cat-text)] group-hover:underline">
                    {row.productTitle}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden bg-neutral-100">
                      <div
                        className="h-full bg-[var(--cat-accent)] transition-all duration-500"
                        style={{ width: `${Math.max(8, Math.round((row.views / maxViews) * 100))}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[12px] tabular-nums text-[var(--cat-muted)]">
                      {row.views} {row.views === 1 ? 'vista' : 'vistas'}
                      {row.sharePercent > 0 ? ` · ${row.sharePercent}%` : ''}
                    </span>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

      {!loading && rows.length > 0 ? (
        <p className="mt-4 text-[12px] text-[var(--cat-muted)]">
          Tip: los productos con más vistas suelen ser buenos candidatos para destacar en historias o WhatsApp.
        </p>
      ) : null}
    </section>
  )
}
