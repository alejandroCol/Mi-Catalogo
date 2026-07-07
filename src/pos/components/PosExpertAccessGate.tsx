import { Link } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { planExpertDisplayName } from '@/lib/billingAccess'
import { PosExpertSaleBanner } from '@/pos/components/PosExpertSaleBanner'
import { PosIconBox } from '@/pos/components/PosIcon'
import { posExpertBlockReason, type PosExpertGateVariant } from '@/pos/lib/posExpertGate'

type Props = {
  children: React.ReactNode
  variant: PosExpertGateVariant
}

export function PosExpertAccessGate({ children, variant }: Props) {
  const { tenant } = useMcAuth()
  const { platformSettings } = usePlatformSettings()
  const blocked = posExpertBlockReason(tenant) === 'needs_expert'

  if (!blocked) return children

  const planName = planExpertDisplayName(platformSettings)
  const title =
    variant === 'sale'
      ? `Activá ${planName} para cobrar en caja`
      : `Activá ${planName} para agregar vendedores POS`
  const hint =
    variant === 'sale'
      ? `Configurá sedes e inventario en Free. Para registrar ventas en el POS necesitás el plan ${planName}.`
      : `Configurá sedes e inventario en Free. Para sumar cajeros al módulo POS necesitás el plan ${planName}.`

  return (
    <div className="mc-pos-page">
      <PosExpertSaleBanner variant={variant} className="mb-4" />
      <div className="mc-pos-panel flex flex-col items-center gap-4 px-6 py-10 text-center">
        <PosIconBox name="expert" tone="gold" size="lg" />
        <h1 className="mc-pos-modal__title">{title}</h1>
        <p className="mc-pos-muted max-w-md">{hint}</p>
        <Link to="/app/plan" className="mc-landing-btn-primary no-underline">
          Ver plan {planName}
        </Link>
      </div>
    </div>
  )
}
