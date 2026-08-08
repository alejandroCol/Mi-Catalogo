import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { McCatalogFontScope } from '@/types/mc'

const OPTIONS: { id: McCatalogFontScope; title: string; description: string; icon: ReactNode }[] = [
  {
    id: 'store',
    title: 'Toda la tienda',
    description: 'Títulos, productos, textos y barra de anuncio',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'banner',
    title: 'Banner principal',
    description: 'Título y descripción del hero de temporada',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 14h6M7 16.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'announcement',
    title: 'Barra de anuncio',
    description: 'Solo el texto del marquee superior',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="3" y="4" width="18" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 5.75h4M12.5 5.75h5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="3" y="10" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
]

export function CatalogFontScopeToggle({
  value,
  onChange,
  disabled,
}: {
  value: McCatalogFontScope
  onChange: (scope: McCatalogFontScope) => void
  disabled?: boolean
}) {
  return (
    <div
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
      role="radiogroup"
      aria-label="Dónde aplicar la fuente"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={clsx(
              'flex items-start gap-3 rounded-xl border px-3.5 py-3.5 text-left transition duration-200 sm:flex-col sm:gap-2.5 sm:px-3',
              selected
                ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_6%,var(--cat-surface)_94%)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_22%,transparent)]'
                : 'border-neutral-200/60 bg-[var(--cat-surface)] hover:border-neutral-300/90',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <span
              className={clsx(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition',
                selected
                  ? 'bg-[var(--cat-accent)] text-[var(--cat-accent-text)]'
                  : 'bg-[color-mix(in_srgb,var(--cat-bg)_70%,var(--cat-surface)_30%)] text-[var(--cat-muted)]',
              )}
            >
              {opt.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold tracking-tight text-[var(--cat-text)] sm:text-[15px]">
                {opt.title}
              </span>
              <span className="ios-footnote mt-0.5 block leading-relaxed text-[var(--cat-muted)]">
                {opt.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
