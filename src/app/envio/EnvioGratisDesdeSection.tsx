export function EnvioGratisDesdeSection({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-semibold text-[var(--cat-text)]">Envío gratis desde</h2>
      <div className="max-w-xs">
        <input
          className="mc-input py-2.5 text-[15px]"
          inputMode="numeric"
          placeholder="Ej. 150000 · opcional"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="text-[12px] text-[var(--cat-muted)]">
        Subtotal mínimo en productos para que el envío salga en $0.
      </p>
    </section>
  )
}
