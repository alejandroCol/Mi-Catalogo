import { Link } from 'react-router-dom'
import { billingGraceDaysRemaining } from '@/lib/billingAccess'
import type { McTenant } from '@/types/mc'

export function BillingPastDueBanner({ tenant }: { tenant: McTenant }) {
  const days = billingGraceDaysRemaining(tenant)
  if (days <= 0) return null

  return (
    <div className="border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-[13px] leading-relaxed text-amber-950">
      <p>
        <strong className="font-medium">Actualizá tu método de pago.</strong> Tu último cobro no se procesó. Tenés{' '}
        <strong className="font-medium">
          {days} día{days === 1 ? '' : 's'}
        </strong>{' '}
        para regularizarlo; si no, volverás al plan Free y se ajustará la configuración de tu catálogo.
      </p>
      <Link
        to="/app/plan"
        className="mt-2 inline-block text-[13px] font-medium underline decoration-amber-400 underline-offset-4"
      >
        Actualizar pago →
      </Link>
    </div>
  )
}
