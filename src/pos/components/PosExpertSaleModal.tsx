import { Link } from 'react-router-dom'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { planExpertDisplayName } from '@/lib/billingAccess'
import { PosIconBox } from '@/pos/components/PosIcon'

type Props = {
  open: boolean
  onClose: () => void
}

export function PosExpertSaleModal({ open, onClose }: Props) {
  const { platformSettings } = usePlatformSettings()
  if (!open) return null
  const planName = planExpertDisplayName(platformSettings)

  return (
    <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
      <div className="mc-pos-modal mc-pos-modal--expert">
        <PosIconBox name="expert" tone="gold" size="lg" className="mc-pos-modal__icon" />
        <p className="mc-landing-eyebrow">Plan {planName}</p>
        <h2 className="mc-pos-modal__title">Activá {planName} para registrar ventas</h2>
        <p className="mc-pos-muted">
          Podés configurar sedes, inventario y vendedores en Free. Para cobrar en caja y registrar
          ventas en el POS necesitás el plan {planName}.
        </p>
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
