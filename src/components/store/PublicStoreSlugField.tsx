import clsx from 'clsx'
import {
  formatPublicSlugHostPreview,
  publicSlugValidationMessage,
  type PublicSlugAvailabilityStatus,
  type PublicSlugValidationIssue,
} from '@/lib/publicSlug'
import { StorePublicHostDisplay } from '@/components/store/StorePublicHostDisplay'
import { mcPlatformPublicHost } from '@/lib/storePublicUrl'

type Props = {
  value: string
  onChange: (value: string) => void
  status: PublicSlugAvailabilityStatus
  issue?: PublicSlugValidationIssue
  disabled?: boolean
  autoFocus?: boolean
}

export function PublicStoreSlugField({
  value,
  onChange,
  status,
  issue,
  disabled = false,
  autoFocus = false,
}: Props) {
  const normalizedPreview = value.trim().toLowerCase().replace(/^-|-$/g, '')
  const hostPreview =
    normalizedPreview.length >= 3 ? formatPublicSlugHostPreview(normalizedPreview) : null

  const showError = status === 'invalid' || status === 'reserved' || status === 'taken'

  let hint: string | null = null
  if (status === 'checking') {
    hint = 'Comprobando disponibilidad…'
  } else if (status === 'available' && hostPreview) {
    hint = '¡Enlace disponible!'
  } else if (status === 'taken') {
    hint = 'Ese enlace ya está en uso. Probá con otro.'
  } else if (status === 'reserved') {
    hint = publicSlugValidationMessage('reserved')
  } else if (status === 'invalid' && issue) {
    hint = publicSlugValidationMessage(issue)
  }

  return (
    <div className="space-y-2">
      <label className="ios-footnote font-medium text-mc-700" htmlFor="mc-store-slug">
        Enlace de tu catálogo
      </label>
      <div className="flex items-center gap-0 overflow-hidden rounded-md border border-neutral-200/80 bg-white focus-within:border-mc-900/30 focus-within:ring-2 focus-within:ring-mc-900/10">
        <input
          id="mc-store-slug"
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 font-mono text-[14px] text-mc-900 outline-none placeholder:text-mc-400"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          placeholder="mi-tienda"
          aria-describedby="mc-store-slug-hint"
        />
        <span className="shrink-0 border-l border-neutral-200/80 bg-mc-50/80 px-3 py-2.5 text-[13px] text-mc-600">
          .{mcPlatformPublicHost()}
        </span>
      </div>
      {hostPreview ? (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-mc-600">
          <span>Vista previa:</span>
          <StorePublicHostDisplay host={hostPreview} variant="highlight" />
        </p>
      ) : null}
      {hint ? (
        <p
          id="mc-store-slug-hint"
          className={clsx(
            'text-[13px] leading-relaxed',
            showError ? 'text-red-800' : 'text-mc-600',
            status === 'available' && 'font-medium text-emerald-800',
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}
