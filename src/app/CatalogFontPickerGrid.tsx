import clsx from 'clsx'
import {
  CATALOG_FONT_IDS,
  CATALOG_FONT_LABELS,
  CATALOG_FONT_SAMPLES,
  CATALOG_FONT_TAGLINES,
  catalogFontStack,
} from '@/lib/catalogFonts'
import type { McCatalogFontId } from '@/types/mc'

export function CatalogFontPickerGrid({
  value,
  onChange,
  disabled,
}: {
  value: McCatalogFontId
  onChange: (id: McCatalogFontId) => void
  disabled?: boolean
}) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      role="radiogroup"
      aria-label="Fuente de la tienda"
    >
      {CATALOG_FONT_IDS.map((id) => {
        const selected = value === id
        const sample = CATALOG_FONT_SAMPLES[id]
        const stack = catalogFontStack(id)

        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            title={`${CATALOG_FONT_LABELS[id]} — ${CATALOG_FONT_TAGLINES[id]}`}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={clsx(
              'group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-[var(--cat-surface)] p-0 text-left transition duration-200 ease-in-out',
              selected
                ? 'border-[var(--cat-accent)] ring-2 ring-[color-mix(in_srgb,var(--cat-accent)_28%,transparent)]'
                : 'border-neutral-200/60 hover:border-neutral-300/90 hover:shadow-sm',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <div
              className="relative flex min-h-[7.5rem] flex-col justify-end overflow-hidden px-4 pb-3.5 pt-4"
              style={{
                background: selected
                  ? 'linear-gradient(145deg, color-mix(in srgb, var(--cat-accent) 8%, var(--cat-surface) 92%), var(--cat-bg))'
                  : 'linear-gradient(180deg, color-mix(in srgb, var(--cat-bg) 55%, var(--cat-surface) 45%), var(--cat-surface))',
              }}
            >
              <div
                className="pointer-events-none absolute -right-3 -top-2 select-none text-[4.5rem] font-bold leading-none opacity-[0.06]"
                aria-hidden
                style={{ fontFamily: stack }}
              >
                Aa
              </div>
              <p
                className="relative text-[1.35rem] font-semibold leading-tight tracking-tight text-[var(--cat-text)] sm:text-[1.45rem]"
                style={{ fontFamily: stack }}
              >
                {sample.title}
              </p>
              <p
                className="relative mt-1 text-[13px] leading-snug text-[var(--cat-muted)]"
                style={{ fontFamily: stack }}
              >
                {sample.body}
              </p>
            </div>
            <div className="flex items-start justify-between gap-2 border-t border-neutral-200/50 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-tight text-[var(--cat-text)]">
                  {CATALOG_FONT_LABELS[id]}
                </p>
                <p className="ios-footnote mt-0.5 line-clamp-2 leading-relaxed text-[var(--cat-muted)]">
                  {CATALOG_FONT_TAGLINES[id]}
                </p>
              </div>
              <span
                className={clsx(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                  selected
                    ? 'border-[var(--cat-accent)] bg-[var(--cat-accent)]'
                    : 'border-neutral-300/80 bg-transparent group-hover:border-neutral-400/80',
                )}
                aria-hidden
              >
                {selected ? (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-[var(--cat-accent-text)]" fill="currentColor">
                    <path d="M4.5 8.2 2.3 6l-.8.8L4.5 9.8l7-7-.8-.8z" />
                  </svg>
                ) : null}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
