import { Link } from 'react-router-dom'

type Props = {
  to: string
  label: string
  value: string | number
  loading?: boolean
  accent?: 'default' | 'gold'
}

export function VendedorStatLink({ to, label, value, loading, accent = 'default' }: Props) {
  return (
    <Link to={to} className="mc-vendedor-stat mc-vendedor-stat--link group">
      <p className="mc-vendedor-stat__label">{label}</p>
      <p
        className={`mc-vendedor-stat__value ${accent === 'gold' ? 'text-[var(--mc-landing-gold)]' : ''}`}
      >
        {loading ? '—' : value}
      </p>
      <span className="mc-vendedor-stat__hint">Ver lista →</span>
    </Link>
  )
}
