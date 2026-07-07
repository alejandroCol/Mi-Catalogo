import { formatCop } from '@/lib/formatCop'
import type { McPosMetodoPago, McPosVenta } from '@/types/mc'

const METODO_LABEL: Record<McPosMetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  credito: 'Crédito',
}

type VentaRow = McPosVenta & { id: string }

type Props = {
  venta: VentaRow
  cobrando: boolean
  onClose: () => void
  onConfirm: (metodo: McPosMetodoPago) => void
}

export function PosCompletarPagoModal({ venta, cobrando, onClose, onConfirm }: Props) {
  return (
    <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
      <div className="mc-pos-modal">
        <h2 className="mc-pos-modal__title">Completar pago</h2>
        <p className="mc-pos-muted">
          Venta contra entrega por {formatCop(venta.totalCop)}. Registrá el cobro al entregar el producto al cliente.
        </p>
        <ul className="mc-pos-venta-card__items-list mc-pos-venta-card__items-list--modal">
          {venta.lineas.map((l, i) => (
            <li key={i} className="mc-pos-venta-card__item">
              <span className="mc-pos-venta-card__qty">{l.cantidad}</span>
              <div className="mc-pos-venta-card__item-main">
                <p className="mc-pos-venta-card__item-name">{l.nombre}</p>
              </div>
              <span className="mc-pos-venta-card__item-total">{formatCop(l.subtotalCop)}</span>
            </li>
          ))}
        </ul>
        <p className="mc-pos-cart-checkout__label">Método de cobro</p>
        <div className="mc-pos-payment-modes mc-pos-payment-modes--modal">
          {(['efectivo', 'transferencia', 'nequi'] as McPosMetodoPago[]).map((m) => (
            <button
              key={m}
              type="button"
              className="mc-pos-payment-pill"
              disabled={cobrando}
              onClick={() => onConfirm(m)}
            >
              {METODO_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="mc-pos-modal__actions">
          <button type="button" className="mc-landing-btn-ghost" disabled={cobrando} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
