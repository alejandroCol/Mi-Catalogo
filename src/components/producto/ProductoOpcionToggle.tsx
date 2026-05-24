import clsx from 'clsx'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  description?: string
  disabled?: boolean
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

/** Opción tipo toggle-card para formularios de producto. */
export function ProductoOpcionToggle({ checked, onChange, title, description, disabled = false }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'flex w-full items-start gap-3 rounded-xl border-2 px-3.5 py-3.5 text-left transition active:scale-[0.99]',
        disabled && 'cursor-not-allowed opacity-60',
        checked
          ? 'border-mc-900 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-mc-900/10'
          : 'border-neutral-300/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-neutral-400',
      )}
    >
      <span
        className={clsx(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition',
          checked ? 'border-mc-900 bg-mc-900 text-white' : 'border-neutral-300 bg-neutral-50 text-transparent',
        )}
        aria-hidden
      >
        <IconCheck className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-snug text-mc-900">{title}</span>
        {description ? (
          <span className="mt-1 block text-[12px] leading-relaxed text-mc-600">{description}</span>
        ) : null}
      </span>
    </button>
  )
}
