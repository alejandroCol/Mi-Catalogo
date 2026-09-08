/**
 * Opción compacta frente a las tarjetas de cotización/manual.
 * Solo se muestra cuando el cobro es WhatsApp (política en `envioSinEnvio.ts`).
 */
export function EnvioSinEnvioCheckbox({
  checked,
  disabled,
  busy,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  busy?: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition ${
        checked
          ? 'border-neutral-300 bg-neutral-50/80'
          : 'border-neutral-200/70 bg-[var(--cat-surface)] hover:border-neutral-300'
      } ${disabled || busy ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--cat-text)]"
        checked={checked}
        disabled={disabled || busy}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 leading-snug">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-medium text-[var(--cat-text)]">Sin envío</span>
          {checked ? (
            <span className="inline-flex rounded-full bg-neutral-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-text)]">
              Activo
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[var(--cat-muted)]">
          El cliente no carga dirección al pedir por WhatsApp.
        </span>
      </span>
    </label>
  )
}
