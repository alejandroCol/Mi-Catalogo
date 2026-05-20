import { Link } from 'react-router-dom'

export function ConfiguracionesBackLink() {
  return (
    <Link
      to="/app/cuenta"
      className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--cat-muted)] transition hover:opacity-70"
    >
      ← Configuraciones
    </Link>
  )
}
