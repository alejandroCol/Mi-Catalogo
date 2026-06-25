import { PosVentasPage } from '@/pos/pages/PosVentasPage'
import { PosCajaPage } from '@/pos/pages/PosCajaPage'
import { PosInventarioPage } from '@/pos/pages/PosInventarioPage'
import { PosDevolucionesPage } from '@/pos/pages/PosDevolucionesPage'
import { PosVentasDelDiaPage } from '@/pos/pages/PosVentasDelDiaPage'
import { PosMovimientosCajaPage } from '@/pos/pages/PosMovimientosCajaPage'
import { usePosVendorSedeOverride } from '@/pos/hooks/usePosVendorSedeOverride'

export function PosAdminVentasPage() {
  return <PosVentasDelDiaPage adminView />
}

export function PosAdminCobrarPage() {
  return <PosVentasPage cajaPath="/pos/admin/caja" />
}

export function PosAdminCajaPage() {
  return (
    <PosCajaPage
      ventasPath="/pos/admin/ventas"
      movimientosPath="/pos/admin/movimientos"
      adminView
    />
  )
}

export function PosAdminMovimientosPage() {
  return <PosMovimientosCajaPage />
}

export function PosAdminInventarioPage() {
  return <PosInventarioPage editable />
}

export function PosAdminDevolucionesPage() {
  return <PosDevolucionesPage />
}

export function PosVendorVentasPage() {
  const sedeIdOverride = usePosVendorSedeOverride()
  return <PosVentasPage cajaPath="/pos/ventas/caja" sedeIdOverride={sedeIdOverride} />
}

export function PosVendorCajaPage() {
  const sedeIdOverride = usePosVendorSedeOverride()
  return (
    <PosCajaPage
      ventasPath="/pos/ventas"
      movimientosPath="/pos/ventas/movimientos"
      sedeIdOverride={sedeIdOverride}
    />
  )
}

export function PosVendorMovimientosPage() {
  const sedeIdOverride = usePosVendorSedeOverride()
  return <PosMovimientosCajaPage sedeIdOverride={sedeIdOverride} />
}

export function PosVendorInventarioPage() {
  const sedeIdOverride = usePosVendorSedeOverride()
  return <PosInventarioPage editable={false} sedeIdOverride={sedeIdOverride} />
}

export function PosVendorDevolucionesPage() {
  const sedeIdOverride = usePosVendorSedeOverride()
  return <PosDevolucionesPage sedeIdOverride={sedeIdOverride} />
}

export function PosVendorVentasDelDiaPage() {
  const sedeIdOverride = usePosVendorSedeOverride()
  return <PosVentasDelDiaPage sedeIdOverride={sedeIdOverride} />
}
