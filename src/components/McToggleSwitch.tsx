import clsx from 'clsx'

export function McToggleSwitch({
  checked,
  onChange,
  disabled,
  id,
  label,
  description,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  id?: string
  label: string
  description?: string
}) {
  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition',
        checked
          ? 'border-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_6%,var(--cat-surface)_94%)]'
          : 'border-neutral-200/70 bg-[var(--cat-surface)] hover:border-neutral-300/80',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden
          className={clsx(
            'block h-7 w-12 rounded-full transition-colors duration-200',
            checked ? 'bg-[var(--cat-accent)]' : 'bg-neutral-300',
          )}
        />
        <span
          aria-hidden
          className={clsx(
            'pointer-events-none absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="ios-subhead block font-medium text-[var(--cat-text)]">{label}</span>
        {description ? (
          <span className="ios-footnote mt-1 block leading-relaxed text-[var(--cat-muted)]">{description}</span>
        ) : null}
      </span>
    </label>
  )
}
