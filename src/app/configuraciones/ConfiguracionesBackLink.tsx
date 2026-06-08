import { Link } from 'react-router-dom'
import type { ConfigSubpageNavState } from '@/app/configuraciones/configSubpageNav'

export function ConfiguracionesBackLink({
  to = '/app/cuenta',
  label = '← Configuraciones',
  state,
}: {
  to?: string
  label?: string
  state?: ConfigSubpageNavState
}) {
  return (
    <Link
      to={to}
      state={state}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--cat-muted)] transition hover:opacity-70"
    >
      {label}
    </Link>
  )
}
