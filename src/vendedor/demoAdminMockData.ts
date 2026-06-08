import { formatCop } from '@/lib/formatCop'

export type DemoAdminOrder = {
  id: string
  cliente: string
  total: number
  estado: string
  hace: string
}

export type DemoAdminStats = {
  ventasHoy: number
  ventasSemana: number
  pedidosPendientes: number
  visitasHoy: number
  tasaConversion: string
  productoTop: string
}

export function buildDemoAdminMock(storeName: string) {
  const stats: DemoAdminStats = {
    ventasHoy: 1_847_000,
    ventasSemana: 8_920_000,
    pedidosPendientes: 7,
    visitasHoy: 142,
    tasaConversion: '4,8%',
    productoTop: 'Kit premium bestseller',
  }

  const orders: DemoAdminOrder[] = [
    { id: 'MC-A1B2C3', cliente: 'María G.', total: 289_000, estado: 'Pagado', hace: 'Hace 12 min' },
    { id: 'MC-D4E5F6', cliente: 'Carlos R.', total: 156_000, estado: 'En preparación', hace: 'Hace 38 min' },
    { id: 'MC-G7H8I9', cliente: 'Laura M.', total: 445_000, estado: 'Listo envío', hace: 'Hace 1 h' },
    { id: 'MC-J0K1L2', cliente: 'Andrés P.', total: 98_000, estado: 'Enviado', hace: 'Hace 2 h' },
    { id: 'MC-M3N4O5', cliente: 'Sofía T.', total: 312_000, estado: 'Entregado', hace: 'Ayer' },
    { id: 'MC-P6Q7R8', cliente: 'Diego V.', total: 178_000, estado: 'Pagado', hace: 'Ayer' },
  ]

  const weeklyBars = [42, 58, 35, 71, 63, 89, 54]

  return {
    storeName,
    stats,
    orders,
    weeklyBars,
    formatVentasHoy: formatCop(stats.ventasHoy),
    formatVentasSemana: formatCop(stats.ventasSemana),
  }
}
