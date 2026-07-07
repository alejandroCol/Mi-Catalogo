import { useMcAuth } from '@/auth/McAuthContext'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosVendors } from '@/pos/hooks/usePosVendors'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { PosCajaVendedorCard } from '@/pos/components/PosCajaVendedorCard'
import { posFechaKeyLocal } from '@/pos/lib/posDate'
import { usePosVentas } from '@/pos/hooks/usePosVentas'
import { posRangoDiaLocal } from '@/pos/lib/posDate'

/** Admin: vista de cajas abiertas/cerradas por vendedor y sede. */
export function PosAdminCajasPage() {
  const { tenant, profile } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const fechaKey = posFechaKeyLocal()
  const { sedes } = usePosSedes(tenantId)
  const { vendors } = usePosVendors(tenantId)
  const { start, end } = posRangoDiaLocal(fechaKey)
  const { ventas } = usePosVentas(tenantId, {
    desdeMs: start,
    hastaMs: end,
    cobradasDesdeMs: start,
    cobradasHastaMs: end,
  })

  return (
    <div className="mc-pos-page">
      <PosPageHeader
        icon="cajas"
        eyebrow="Supervisión"
        title="Cajas del día"
        subtitle={`${fechaKey} — estado de caja por vendedor`}
      />
      <div className="mc-pos-list">
        {vendors
          .filter((v) => v.active !== false && v.posSedeId)
          .map((v) => (
            <PosCajaVendedorCard
              key={v.uid}
              tenantId={tenantId!}
              vendedorUid={v.uid}
              vendedorNombre={v.displayName}
              sedeId={v.posSedeId!}
              sedeNombre={sedes.find((s) => s.id === v.posSedeId)?.nombre ?? 'Sede'}
              fechaKey={fechaKey}
              ventas={ventas}
            />
          ))}
        {vendors.filter((v) => v.active !== false).length === 0 && (
          <p className="mc-pos-muted">No hay vendedores POS activos.</p>
        )}
      </div>
    </div>
  )
}
