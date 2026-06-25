export type PosDemoTourStep = {
  id: string
  title: string
  description: string
  /** Ruta interna POS o app */
  path?: string
  /** Abrir catálogo público en nueva ventana */
  openCatalog?: boolean
  /** Segundos sugeridos en este paso */
  seconds: number
}

export const POS_DEMO_TOUR_STEPS: PosDemoTourStep[] = [
  {
    id: 'producto-pos',
    title: '1 · Crear producto en POS',
    description:
      'En Inventario POS, creá «Blusa lino» en la sede Chapinero. Activá «Mostrar en tienda virtual» para generar el borrador en catálogo.',
    path: '/pos/admin/inventario',
    seconds: 18,
  },
  {
    id: 'publicar',
    title: '2 · Completar y publicar',
    description:
      'En Inventario del catálogo, abrí el borrador, subí foto, completá descripción y publicá. El badge «POS · Completar» desaparece.',
    path: '/app/inventario',
    seconds: 20,
  },
  {
    id: 'cobrar',
    title: '3 · Cobrar venta',
    description:
      'En Cobrar, agregá la blusa al carrito y confirmá el pago. Escuchá el sonido de caja y mirá el flash de éxito + sync con catálogo.',
    path: '/pos/admin/cobrar',
    seconds: 15,
  },
  {
    id: 'listado',
    title: '4 · Ver listado y reportes',
    description: 'Revisá la venta en el listado con filtros de fecha. Luego abrí Reportes para ver gráficos del día.',
    path: '/pos/admin/ventas',
    seconds: 12,
  },
  {
    id: 'catalogo',
    title: '5 · Stock en tienda online',
    description:
      'Abrí el catálogo público en otra ventana (split screen). El stock de «Blusa lino» bajó al instante — inventario unificado.',
    openCatalog: true,
    seconds: 15,
  },
]

export const POS_DEMO_TOUR_STORAGE = 'mc-pos-demo-tour-step'
