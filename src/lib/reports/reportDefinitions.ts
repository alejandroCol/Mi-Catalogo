export type CatalogReportId =
  | 'ventas-ganancias'
  | 'cierre-periodo'
  | 'estado-cuenta'
  | 'horarios-venta'
  | 'por-ciudad'
  | 'por-dia-semana'
  | 'productos-margen'
  | 'conversion-trafico'

export type PosReportId =
  | 'ventas-ganancias'
  | 'cierre-periodo'
  | 'estado-cuenta'
  | 'horarios-venta'
  | 'por-sede'
  | 'por-dia-semana'
  | 'productos-margen'
  | 'metodos-pago'
  | 'general'
  | 'vendedores'
  | 'articulos'
  | 'comparativo'

export type ReportDefinition = {
  id: string
  title: string
  subtitle: string
  icon: 'chart' | 'money' | 'calendar' | 'clock' | 'map' | 'week' | 'products' | 'funnel' | 'store' | 'users' | 'compare'
  gradient: string
}

export const CATALOG_REPORTS: ReportDefinition[] = [
  {
    id: 'ventas-ganancias',
    title: 'Ventas y ganancias',
    subtitle: 'Ingresos, costos, margen y comisión de pasarela desglosados.',
    icon: 'money',
    gradient: 'from-amber-500/20 via-orange-400/10 to-transparent',
  },
  {
    id: 'cierre-periodo',
    title: 'Cierre de periodo',
    subtitle: 'Resumen semanal, quincenal o mensual con totales consolidados.',
    icon: 'calendar',
    gradient: 'from-violet-500/20 via-purple-400/10 to-transparent',
  },
  {
    id: 'estado-cuenta',
    title: 'Estado de cuenta',
    subtitle: 'Movimiento de ventas, comisiones y ganancia neta acumulada.',
    icon: 'chart',
    gradient: 'from-emerald-500/20 via-teal-400/10 to-transparent',
  },
  {
    id: 'horarios-venta',
    title: 'Horarios de venta',
    subtitle: 'Descubrí en qué horas del día se concentra tu facturación.',
    icon: 'clock',
    gradient: 'from-sky-500/20 via-blue-400/10 to-transparent',
  },
  {
    id: 'por-ciudad',
    title: 'Ventas por ciudad',
    subtitle: 'Distribución geográfica según la dirección de envío.',
    icon: 'map',
    gradient: 'from-rose-500/20 via-pink-400/10 to-transparent',
  },
  {
    id: 'por-dia-semana',
    title: 'Ventas por día',
    subtitle: 'Qué días de la semana vendés más en tu tienda virtual.',
    icon: 'week',
    gradient: 'from-indigo-500/20 via-blue-400/10 to-transparent',
  },
  {
    id: 'productos-margen',
    title: 'Productos y margen',
    subtitle: 'Ranking de artículos con mayor aporte a tus ganancias.',
    icon: 'products',
    gradient: 'from-amber-600/20 via-yellow-400/10 to-transparent',
  },
  {
    id: 'conversion-trafico',
    title: 'Tráfico y conversión',
    subtitle: 'Visitas vs ventas y embudo del checkout en el periodo.',
    icon: 'funnel',
    gradient: 'from-cyan-500/20 via-teal-400/10 to-transparent',
  },
]

export const POS_REPORTS: ReportDefinition[] = [
  {
    id: 'ventas-ganancias',
    title: 'Ventas y ganancias',
    subtitle: 'Margen por venta usando el precio de costo de cada artículo.',
    icon: 'money',
    gradient: 'from-amber-500/20 via-orange-400/10 to-transparent',
  },
  {
    id: 'cierre-periodo',
    title: 'Cierre de periodo',
    subtitle: 'Consolidado semanal, quincenal o mensual por sede.',
    icon: 'calendar',
    gradient: 'from-violet-500/20 via-purple-400/10 to-transparent',
  },
  {
    id: 'estado-cuenta',
    title: 'Estado de cuenta',
    subtitle: 'Resumen financiero de caja en el rango seleccionado.',
    icon: 'chart',
    gradient: 'from-emerald-500/20 via-teal-400/10 to-transparent',
  },
  {
    id: 'horarios-venta',
    title: 'Horarios de venta',
    subtitle: 'Franjas horarias con mayor volumen de ventas POS.',
    icon: 'clock',
    gradient: 'from-sky-500/20 via-blue-400/10 to-transparent',
  },
  {
    id: 'por-sede',
    title: 'Ventas por sede',
    subtitle: 'Compará el desempeño entre tus puntos de venta.',
    icon: 'store',
    gradient: 'from-rose-500/20 via-pink-400/10 to-transparent',
  },
  {
    id: 'por-dia-semana',
    title: 'Ventas por día',
    subtitle: 'Patrones de venta según el día de la semana.',
    icon: 'week',
    gradient: 'from-indigo-500/20 via-blue-400/10 to-transparent',
  },
  {
    id: 'productos-margen',
    title: 'Productos y margen',
    subtitle: 'Top artículos por ingreso y unidades vendidas.',
    icon: 'products',
    gradient: 'from-amber-600/20 via-yellow-400/10 to-transparent',
  },
  {
    id: 'metodos-pago',
    title: 'Métodos de pago',
    subtitle: 'Efectivo, transferencia, Nequi y crédito en el periodo.',
    icon: 'money',
    gradient: 'from-lime-500/20 via-green-400/10 to-transparent',
  },
  {
    id: 'general',
    title: 'Tendencia general',
    subtitle: 'Ventas diarias y distribución por sede.',
    icon: 'chart',
    gradient: 'from-neutral-500/15 via-stone-400/10 to-transparent',
  },
  {
    id: 'vendedores',
    title: 'Por vendedor',
    subtitle: 'Ranking de vendedores por facturación.',
    icon: 'users',
    gradient: 'from-slate-500/15 via-gray-400/10 to-transparent',
  },
  {
    id: 'articulos',
    title: 'Top artículos',
    subtitle: 'Los 15 productos más vendidos en caja.',
    icon: 'products',
    gradient: 'from-orange-500/15 via-amber-400/10 to-transparent',
  },
  {
    id: 'comparativo',
    title: 'Comparativo',
    subtitle: 'Compará dos rangos de fechas lado a lado.',
    icon: 'compare',
    gradient: 'from-fuchsia-500/15 via-purple-400/10 to-transparent',
  },
]

export function findCatalogReport(id: string): ReportDefinition | undefined {
  return CATALOG_REPORTS.find((r) => r.id === id)
}

export function findPosReport(id: string): ReportDefinition | undefined {
  return POS_REPORTS.find((r) => r.id === id)
}
