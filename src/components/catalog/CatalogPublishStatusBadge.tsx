import {
  catalogPublishStatusLabel,
  catalogPublishStatusTone,
  isLegacyGrandfatheredStore,
} from '@/lib/catalogPublish'
import type { McTenant } from '@/types/mc'

const TONE_STYLES = {
  published: 'border-emerald-200/70 bg-emerald-50/80 text-emerald-800',
  paused: 'border-amber-200/70 bg-amber-50/80 text-amber-900',
  draft: 'border-neutral-200/70 bg-neutral-50/80 text-[var(--cat-muted)]',
} as const

type Props = {
  tenant: McTenant
  className?: string
}

export function CatalogPublishStatusBadge({ tenant, className = '' }: Props) {
  const tone = catalogPublishStatusTone(tenant)
  const statusLabel = catalogPublishStatusLabel(tenant)
  const isGrandfathered = isLegacyGrandfatheredStore(tenant)

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${TONE_STYLES[tone]}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            tone === 'published' ? 'bg-emerald-500' : tone === 'paused' ? 'bg-amber-400' : 'bg-neutral-400'
          }`}
          aria-hidden
        />
        {statusLabel}
      </span>
      {isGrandfathered ? (
        <span className="text-[11px] text-[var(--cat-muted)]">Tienda activa desde antes del nuevo modelo</span>
      ) : null}
    </div>
  )
}
