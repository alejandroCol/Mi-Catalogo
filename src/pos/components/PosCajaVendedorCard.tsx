import { formatCop } from '@/lib/formatCop'
import { usePosCajaDiaria } from '@/pos/hooks/usePosCajaDiaria'
import { efectivoEsperadoCaja, totalMovimientosCaja, ventasEfectivoDelDia } from '@/pos/lib/cajaCalculos'
import type { McPosVenta } from '@/types/mc'

type Props = {
  tenantId: string
  vendedorUid: string
  vendedorNombre: string
  sedeId: string
  sedeNombre: string
  fechaKey: string
  ventas: McPosVenta[]
}

export function PosCajaVendedorCard({
  tenantId,
  vendedorUid,
  vendedorNombre,
  sedeId,
  sedeNombre,
  fechaKey,
  ventas,
}: Props) {
  const { caja, loading } = usePosCajaDiaria(tenantId, sedeId, vendedorUid, fechaKey)
  const ventasEfectivo = ventasEfectivoDelDia(ventas, sedeId, vendedorUid, fechaKey)
  const esperado = caja
    ? efectivoEsperadoCaja(
        caja.saldoInicialEfectivo,
        ventasEfectivo,
        totalMovimientosCaja(caja.egresos),
        totalMovimientosCaja(caja.ingresos),
      )
    : 0

  return (
    <article className="mc-pos-list-card">
      <div className="mc-pos-list-card__head">
        <div>
          <h3 className="mc-pos-list-card__title">{vendedorNombre}</h3>
          <p className="mc-pos-list-card__meta">{sedeNombre}</p>
        </div>
        <span className={`mc-pos-badge ${caja?.estado === 'cerrada' ? 'mc-pos-badge--off' : 'mc-pos-badge--ok'}`}>
          {loading ? '…' : caja ? (caja.estado === 'cerrada' ? 'Cerrada' : 'Abierta') : 'Sin abrir'}
        </span>
      </div>
      <div className="mc-pos-kpi-grid mc-pos-kpi-grid--inline">
        <p className="mc-pos-muted text-sm">Ventas efectivo: {formatCop(ventasEfectivo)}</p>
        {caja && (
          <>
            <p className="mc-pos-muted text-sm">Efectivo esperado: {formatCop(esperado)}</p>
            {caja.estado === 'cerrada' && caja.diferencia != null && (
              <p className="mc-pos-muted text-sm">Diferencia: {formatCop(caja.diferencia)}</p>
            )}
          </>
        )}
      </div>
    </article>
  )
}
