import { Link } from 'react-router-dom'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { planExpertDisplayName } from '@/lib/billingAccess'
import { PosIconBox } from '@/pos/components/PosIcon'
import type { PosExpertGateVariant } from '@/pos/lib/posExpertGate'

type Props = {
  open: boolean
  onClose: () => void
  variant?: PosExpertGateVariant
}

export function PosExpertSaleModal({ open, onClose, variant = 'vendor' }: Props) {
  const { platformSettings } = usePlatformSettings()
  if (!open) return null
  const planName = planExpertDisplayName(platformSettings)
  const title =
    variant === 'sale'
      ? `Activá ${planName} para cobrar en caja`
      : `Activá ${planName} para agregar vendedores POS`
  const body =
    variant === 'sale'
      ? `Podés configurar sedes e inventario en Free. Para registrar ventas en el POS necesitás el plan ${planName}.`
      : `Podés configurar sedes e inventario en Free. Para sumar cajeros al módulo POS y registrar ventas en caja necesitás el plan ${planName}.`

  return (
    <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
      <div className="mc-pos-modal mc-pos-modal--expert">
        <PosIconBox name="expert" tone="gold" size="lg" className="mc-pos-modal__icon" />
        <p className="mc-landing-eyebrow">Plan {planName}</p>
        <h2 className="mc-pos-modal__title">{title}</h2>
        <p className="mc-pos-muted">{body}</p>
        <div className="mc-pos-modal__actions">
          <button type="button" className="mc-landing-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          <Link to="/app/plan" className="mc-landing-btn-primary no-underline" onClick={onClose}>
            Ver plan {planName}
          </Link>
        </div>
      </div>
    </div>
  )
}
