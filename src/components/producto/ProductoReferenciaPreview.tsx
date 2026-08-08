/** Hint bajo el nombre: cómo quedará la referencia del producto. */
export function ProductoReferenciaPreview({
  referencia,
  label = 'Referencia',
}: {
  referencia: string
  label?: string
}) {
  const value = referencia.trim()
  if (!value) return null
  return (
    <p className="mt-1.5 text-[12px] leading-relaxed text-mc-500" aria-live="polite">
      {label}: <span className="font-medium text-mc-700">{value}</span>
    </p>
  )
}
