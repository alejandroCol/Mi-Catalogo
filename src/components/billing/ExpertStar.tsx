/** Estrellita que marca funciones del plan Expert. */
export function ExpertStar({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center text-amber-600 ${className}`}
      title="Función Expert"
      aria-hidden
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.5 14.8 9l7.2.6-5.5 4.7 1.7 7.2L12 17.8 5.8 21.5l1.7-7.2-5.5-4.7 7.2-.6L12 2.5Z" />
      </svg>
    </span>
  )
}
