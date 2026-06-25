import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import { PosUserAvatar } from '@/pos/components/PosUserAvatar'
import { posFormatFechaCorta, posFormatHora } from '@/pos/lib/posDate'
import type { McPosMetodoPago, McPosVenta } from '@/types/mc'

const METODO_LABEL: Record<McPosMetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  credito: 'Crédito',
}

const PAGO_CLASS: Record<McPosMetodoPago, string> = {
  efectivo: 'mc-pos-venta-card__pago--efectivo',
  transferencia: 'mc-pos-venta-card__pago--transferencia',
  nequi: 'mc-pos-venta-card__pago--nequi',
  credito: 'mc-pos-venta-card__pago--credito',
}

type VentaRow = McPosVenta & { id: string }

type Props = {
  ventas: VentaRow[]
  multiDay?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export function DemoPosVentaCards({
  ventas,
  multiDay = false,
  emptyTitle = 'Sin ventas en este período',
  emptyDescription = 'Cuando la cajera cobre, las ventas aparecen acá en tiempo real.',
}: Props) {
  if (ventas.length === 0) {
    return (
      <div className="mc-pos-empty-state">
        <div className="mc-pos-empty-state__illus" aria-hidden>
          <span className="mc-pos-empty-state__icon">🧾</span>
        </div>
        <h3 className="mc-pos-empty-state__title">{emptyTitle}</h3>
        <p className="mc-pos-empty-state__desc">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <section className="mc-pos-ventas-list">
      {ventas.map((v) => {
        const itemsLabel = v.lineas.length === 1 ? '1 producto' : `${v.lineas.length} productos`
        return (
          <article key={v.id} className="mc-pos-venta-card">
            <header className="mc-pos-venta-card__header">
              <div className="mc-pos-venta-card__meta">
                <div className="mc-pos-venta-card__meta-row">
                  <PosUserAvatar name={v.vendedorNombre} />
                  <span className="mc-pos-venta-card__chip mc-pos-venta-card__chip--time">
                    {multiDay ? `${posFormatFechaCorta(v.createdAt)} · ` : ''}
                    {posFormatHora(v.createdAt)}
                  </span>
                  <span className="mc-pos-venta-card__chip">{v.vendedorNombre}</span>
                  <span className="mc-pos-venta-card__chip mc-pos-venta-card__chip--muted">{itemsLabel}</span>
                </div>
                <div className="mc-pos-venta-card__pagos">
                  {v.pagos.map((p, i) => (
                    <span key={i} className={clsx('mc-pos-venta-card__pago', PAGO_CLASS[p.metodo])}>
                      {METODO_LABEL[p.metodo]} · {formatCop(p.monto)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mc-pos-venta-card__total-wrap">
                <p className="mc-pos-venta-card__total">{formatCop(v.totalCop)}</p>
              </div>
            </header>
            <ul className="mc-pos-venta-card__items">
              {v.lineas.map((l, i) => (
                <li key={i} className="mc-pos-venta-card__item">
                  <span className="mc-pos-venta-card__item-name">
                    {l.cantidad}× {l.nombre}
                  </span>
                  <span className="mc-pos-venta-card__item-price">{formatCop(l.subtotalCop)}</span>
                </li>
              ))}
            </ul>
          </article>
        )
      })}
    </section>
  )
}
