import type { PosIconName } from '@/pos/components/PosIcon'

export type PosNavItem = {
  to: string
  label: string
  icon: PosIconName
  end?: boolean
}

export const POS_ADMIN_NAV: PosNavItem[] = [
  { to: '/pos/admin', label: 'Inicio', icon: 'home', end: true },
  { to: '/pos/admin/ventas', label: 'Ventas', icon: 'ventas' },
  { to: '/pos/admin/caja', label: 'Caja', icon: 'caja' },
  { to: '/pos/admin/movimientos', label: 'Movimientos', icon: 'movimientos' },
  { to: '/pos/admin/inventario', label: 'Inventario', icon: 'inventario' },
  { to: '/pos/admin/devoluciones', label: 'Devoluciones', icon: 'devoluciones' },
  { to: '/pos/admin/cajas', label: 'Cajas', icon: 'cajas' },
  { to: '/pos/admin/sedes', label: 'Sedes', icon: 'sedes' },
  { to: '/pos/admin/vendedores', label: 'Vendedores', icon: 'vendedores' },
  { to: '/pos/admin/reportes', label: 'Reportes', icon: 'reportes' },
]

export const POS_VENDOR_NAV: PosNavItem[] = [
  { to: '/pos/ventas', label: 'Vender', icon: 'ventas', end: true },
  { to: '/pos/ventas/hoy', label: 'Ventas', icon: 'ticket' },
  { to: '/pos/ventas/caja', label: 'Caja', icon: 'caja' },
  { to: '/pos/ventas/movimientos', label: 'Movimientos', icon: 'movimientos' },
  { to: '/pos/ventas/inventario', label: 'Inventario', icon: 'inventario' },
  { to: '/pos/ventas/devoluciones', label: 'Devoluciones', icon: 'devoluciones' },
]

export type PosModuleTile = {
  to: string
  label: string
  desc: string
  icon: PosIconName
  tone: 'gold' | 'cream' | 'dark'
  dynamic?: 'sedes' | 'vendors'
}

export const POS_ADMIN_TILES: PosModuleTile[] = [
  { to: '/pos/admin/ventas', label: 'Ventas', desc: 'Listado del día por sede', icon: 'ventas', tone: 'gold' },
  { to: '/pos/admin/cobrar', label: 'Cobrar', desc: 'Registrar cobros en caja', icon: 'ventas-rapidas', tone: 'gold' },
  { to: '/pos/admin/caja', label: 'Caja del día', desc: 'Supervisión en vivo por sede', icon: 'caja', tone: 'cream' },
  { to: '/pos/admin/inventario', label: 'Inventario', desc: 'Productos y stock por sede', icon: 'inventario', tone: 'dark' },
  { to: '/pos/admin/devoluciones', label: 'Devoluciones', desc: 'Reembolsos y cambios', icon: 'devoluciones', tone: 'cream' },
  { to: '/pos/admin/sedes', label: 'Sedes', desc: 'Puntos de venta', icon: 'sedes', tone: 'gold', dynamic: 'sedes' },
  { to: '/pos/admin/vendedores', label: 'Vendedores', desc: 'Cajeros del equipo', icon: 'vendedores', tone: 'dark', dynamic: 'vendors' },
  { to: '/pos/admin/reportes', label: 'Reportes', desc: 'Gráficos y análisis', icon: 'reportes', tone: 'gold' },
  { to: '/pos/admin/cajas', label: 'Cajas', desc: 'Supervisión en vivo', icon: 'cajas', tone: 'cream' },
]

export const POS_LANDING_FEATURES = [
  {
    icon: 'ventas-rapidas' as const,
    title: 'Ventas rápidas',
    desc: 'Cobro en efectivo, transferencia o mixto con ticket automático.',
    accent: 'gold' as const,
  },
  {
    icon: 'cash-drawer' as const,
    title: 'Caja del día',
    desc: 'Turnos, arqueo de efectivo e ingresos/egresos en tiempo real.',
    accent: 'dark' as const,
  },
  {
    icon: 'multi-sede' as const,
    title: 'Por sede',
    desc: 'Inventario y vendedores ligados a cada punto de venta.',
    accent: 'gold' as const,
  },
  {
    icon: 'sync' as const,
    title: 'Catálogo',
    desc: 'Publicá inventario POS en tu tienda virtual con fotos y descripción.',
    accent: 'dark' as const,
  },
]
