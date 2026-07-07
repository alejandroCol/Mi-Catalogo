import { Link } from 'react-router-dom'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { planExpertDisplayName } from '@/lib/billingAccess'
import { PosIconBox } from '@/pos/components/PosIcon'
import type { PosExpertGateVariant } from '@/pos/lib/posExpertGate'

type Props = {
  className?: string
  variant?: PosExpertGateVariant
}

/** Aviso cuando el tenant está en Free y aún no puede usar funciones POS premium. */
export function PosExpertSaleBanner({ className = '', variant = 'vendor' }: Props) {
  const { platformSettings } = usePlatformSettings()
  const planName = planExpertDisplayName(platformSettings)
  const title =
    variant === 'sale'
      ? `Activá ${planName} para cobrar en caja`
      : `Activá ${planName} para agregar vendedores POS`
  const text =
    variant === 'sale'
      ? `Podés configurar sedes e inventario en Free. Para registrar ventas en el POS necesitás el plan ${planName}.`
      : `Podés configurar sedes e inventario en Free. Para sumar cajeros y registrar ventas en caja necesitás el plan ${planName}.`

  return (
    <div
      className={`mc-pos-expert-banner ${className}`.trim()}
      role="status"
    >
      <PosIconBox name="expert" tone="gold" size="sm" className="mc-pos-expert-banner__icon" />
      <div className="mc-pos-expert-banner__body">
        <p className="mc-pos-expert-banner__title">{title}</p>
        <p className="mc-pos-expert-banner__text">{text}</p>
        <Link to="/app/plan" className="mc-pos-expert-banner__link">
          Ver plan {planName} →
        </Link>
      </div>
    </div>
  )
}
