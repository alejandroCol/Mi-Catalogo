import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useActiveLiveSession } from '@/live/hooks/useActiveLiveSession'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicStore } from '@/public/PublicStoreContext'

export function CatalogLiveNowBadge({ className }: { className?: string }) {
  const { tenantId } = useCatalogTenant()
  const { to } = usePublicStore()
  const { session } = useActiveLiveSession(tenantId ?? undefined)

  if (!session) return null

  return (
    <Link
      to={to(`/live/${session.id}`)}
      className={clsx(
        'mc-pc-live-now group inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-[color-mix(in_srgb,#ef4444_10%,var(--cat-surface)_90%)] px-3 py-1.5 text-[12px] font-semibold text-[var(--cat-text)] shadow-sm transition hover:border-red-500/40 hover:bg-[color-mix(in_srgb,#ef4444_14%,var(--cat-surface)_86%)]',
        className,
      )}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="mc-pc-live-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      <span>En vivo ahora</span>
      {session.title?.trim() ? (
        <span className="max-w-[10rem] truncate font-medium text-[var(--cat-muted)] group-hover:text-[var(--cat-text)] sm:max-w-[14rem]">
          · {session.title.trim()}
        </span>
      ) : null}
    </Link>
  )
}
