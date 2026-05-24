import { Link } from 'react-router-dom'

export function ConfiguracionesBackLink({
  to = '/app/cuenta',
  label = '← Configuraciones',
}: {
  to?: string
  label?: string
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--cat-muted)] transition hover:opacity-70"
    >
      {label}
    </Link>
  )
}
