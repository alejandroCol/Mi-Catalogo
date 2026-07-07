import { mcAnalyticsDateKeysForPeriod } from '@/lib/mcAnalyticsDates'
import type {
  McAnalyticsPeriod,
  McAnalyticsSummary,
  McCatalogThemePreset,
  McCategoria,
  McDemoStore,
  McOrdenCatalogo,
  McOrdenCatalogoEstado,
  McPedido,
  McProducto,
  McTenant,
  McTopProductRow,
} from '@/types/mc'

export type DemoAdminDataset = {
  tenant: McTenant
  categorias: (McCategoria & { id: string })[]
  products: (McProducto & { id: string })[]
  ventas: (McOrdenCatalogo & { id: string })[]
  manualPedidos: (McPedido & { id: string })[]
  analyticsByPeriod: Record<McAnalyticsPeriod, McAnalyticsSummary>
  topProductsByPeriod: Record<McAnalyticsPeriod, McTopProductRow[]>
  salesToday: number
  salesPeriodTotal: number
  salesPeriodLabel: string
  todayVisits: number
  onepayBalancePreview: string
}

type StoreProfile = {
  themePreset: McCatalogThemePreset
  products: Omit<McProducto, 'id' | 'createdAt' | 'updatedAt'>[]
  categorias: { id: string; nombre: string }[]
}

const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/480/480`

function resolveStoreProfile(demo: McDemoStore): StoreProfile {
  const name = demo.displayName.toLowerCase()
  if (/moda|ropa|boutique|vestido|fashion/.test(name)) {
    return {
      themePreset: 'boutique',
      categorias: [
        { id: 'cat-nuevo', nombre: 'Novedades' },
        { id: 'cat-vestidos', nombre: 'Vestidos' },
        { id: 'cat-accesorios', nombre: 'Accesorios' },
      ],
      products: [
        {
          nombre: 'Vestido midi satinado',
          descripcion: 'Tela premium con caída fluida. Ideal para eventos.',
          precioCop: 189_000,
          stock: 24,
          imageUrl: IMG('vestido-midi'),
          activo: true,
          enCatalogo: true,
          orden: 0,
          categoriaIds: ['cat-vestidos'],
          marcarNovedad: true,
        },
        {
          nombre: 'Blazer estructurado arena',
          precioCop: 245_000,
          stock: 12,
          imageUrl: IMG('blazer-arena'),
          activo: true,
          enCatalogo: true,
          orden: 1,
          categoriaIds: ['cat-nuevo'],
        },
        {
          nombre: 'Set accesorios dorado',
          precioCop: 78_000,
          stock: 40,
          imageUrl: IMG('accesorios-dorado'),
          activo: true,
          enCatalogo: true,
          orden: 2,
          categoriaIds: ['cat-accesorios'],
          descuentoActivo: true,
          descuentoTipo: 'porcentaje',
          descuentoValor: 15,
        },
        {
          nombre: 'Top encaje ivory',
          precioCop: 96_000,
          stock: 18,
          imageUrl: IMG('top-encaje'),
          activo: true,
          enCatalogo: true,
          orden: 3,
          categoriaIds: ['cat-nuevo', 'cat-vestidos'],
        },
        {
          nombre: 'Falda plisada oliva',
          precioCop: 112_000,
          stock: 15,
          imageUrl: IMG('falda-plisada'),
          activo: true,
          enCatalogo: true,
          orden: 4,
          categoriaIds: ['cat-vestidos'],
        },
        {
          nombre: 'Bolso mini cuero',
          precioCop: 156_000,
          stock: 9,
          imageUrl: IMG('bolso-mini'),
          activo: true,
          enCatalogo: true,
          orden: 5,
          categoriaIds: ['cat-accesorios'],
        },
      ],
    }
  }

  if (/caf[eé]|food|gourmet|dulce|panader/.test(name)) {
    return {
      themePreset: 'morning',
      categorias: [
        { id: 'cat-especial', nombre: 'Especiales' },
        { id: 'cat-boxes', nombre: 'Boxes regalo' },
        { id: 'cat-grano', nombre: 'Grano' },
      ],
      products: [
        {
          nombre: 'Box desayuno artesanal',
          descripcion: 'Pan, mermelada y café de origen.',
          precioCop: 68_000,
          stock: 30,
          imageUrl: IMG('box-desayuno'),
          activo: true,
          enCatalogo: true,
          orden: 0,
          categoriaIds: ['cat-boxes'],
          marcarNovedad: true,
        },
        {
          nombre: 'Café origen Huila 250g',
          precioCop: 42_000,
          stock: 55,
          imageUrl: IMG('cafe-huila'),
          activo: true,
          enCatalogo: true,
          orden: 1,
          categoriaIds: ['cat-grano'],
        },
        {
          nombre: 'Torta de zanahoria individual',
          precioCop: 18_500,
          stock: 20,
          imageUrl: IMG('torta-zanahoria'),
          activo: true,
          enCatalogo: true,
          orden: 2,
          categoriaIds: ['cat-especial'],
        },
        {
          nombre: 'Galletas mantequilla x6',
          precioCop: 24_000,
          stock: 48,
          imageUrl: IMG('galletas-mantequilla'),
          activo: true,
          enCatalogo: true,
          orden: 3,
          categoriaIds: ['cat-especial'],
          descuentoActivo: true,
          descuentoTipo: 'porcentaje',
          descuentoValor: 10,
        },
        {
          nombre: 'Cold brew botella 500ml',
          precioCop: 22_000,
          stock: 36,
          imageUrl: IMG('cold-brew'),
          activo: true,
          enCatalogo: true,
          orden: 4,
          categoriaIds: ['cat-especial'],
        },
      ],
    }
  }

  if (/belleza|skin|cosm|spa|natural/.test(name)) {
    return {
      themePreset: 'minimal',
      categorias: [
        { id: 'cat-rutina', nombre: 'Rutina' },
        { id: 'cat-kits', nombre: 'Kits' },
      ],
      products: [
        {
          nombre: 'Serum vitamina C',
          precioCop: 89_000,
          stock: 28,
          imageUrl: IMG('serum-vitc'),
          activo: true,
          enCatalogo: true,
          orden: 0,
          categoriaIds: ['cat-rutina'],
          marcarNovedad: true,
        },
        {
          nombre: 'Kit limpieza facial',
          precioCop: 145_000,
          stock: 16,
          imageUrl: IMG('kit-limpieza'),
          activo: true,
          enCatalogo: true,
          orden: 1,
          categoriaIds: ['cat-kits'],
        },
        {
          nombre: 'Crema hidratante noche',
          precioCop: 72_000,
          stock: 22,
          imageUrl: IMG('crema-noche'),
          activo: true,
          enCatalogo: true,
          orden: 2,
          categoriaIds: ['cat-rutina'],
        },
        {
          nombre: 'Protector solar SPF50',
          precioCop: 64_000,
          stock: 34,
          imageUrl: IMG('protector-solar'),
          activo: true,
          enCatalogo: true,
          orden: 3,
          categoriaIds: ['cat-rutina'],
          descuentoActivo: true,
          descuentoTipo: 'monto_fijo',
          descuentoValor: 8_000,
        },
      ],
    }
  }

  return {
    themePreset: 'ios',
    categorias: [
      { id: 'cat-destacados', nombre: 'Destacados' },
      { id: 'cat-combos', nombre: 'Combos' },
    ],
    products: [
      {
        nombre: 'Kit premium bestseller',
        descripcion: 'El favorito de tus clientes esta semana.',
        precioCop: 129_000,
        stock: 32,
        imageUrl: IMG('kit-premium'),
        activo: true,
        enCatalogo: true,
        orden: 0,
        categoriaIds: ['cat-destacados'],
        marcarNovedad: true,
      },
      {
        nombre: 'Pack ahorro x3',
        precioCop: 198_000,
        stock: 18,
        imageUrl: IMG('pack-ahorro'),
        activo: true,
        enCatalogo: true,
        orden: 1,
        categoriaIds: ['cat-combos'],
        descuentoActivo: true,
        descuentoTipo: 'porcentaje',
        descuentoValor: 12,
      },
      {
        nombre: 'Edición limitada',
        precioCop: 89_000,
        stock: 14,
        imageUrl: IMG('edicion-limitada'),
        activo: true,
        enCatalogo: true,
        orden: 2,
        categoriaIds: ['cat-destacados'],
      },
      {
        nombre: 'Accesorio esencial',
        precioCop: 45_000,
        stock: 50,
        imageUrl: IMG('accesorio-esencial'),
        activo: true,
        enCatalogo: true,
        orden: 3,
        categoriaIds: ['cat-destacados'],
      },
      {
        nombre: 'Combo regalo',
        precioCop: 167_000,
        stock: 11,
        imageUrl: IMG('combo-regalo'),
        activo: true,
        enCatalogo: true,
        orden: 4,
        categoriaIds: ['cat-combos'],
      },
    ],
  }
}

function buildTenant(demo: McDemoStore, profile: StoreProfile, productCount: number): McTenant {
  const now = Date.now()
  const sixMonths = now + 180 * 24 * 60 * 60 * 1000
  return {
    id: demo.tenantId || `demo-${demo.id}`,
    ownerUid: 'demo-owner',
    slug: demo.slug || 'tienda-demo',
    nombreTienda: demo.displayName,
    whatsappNumero: '573001234567',
    mensajeIntro: '¡Hola! Quiero hacer un pedido desde tu catálogo.',
    createdAt: now - 90 * 24 * 60 * 60 * 1000,
    billingPlan: 'expert',
    subscriptionEndsAt: sixMonths,
    billingSubStatus: 'active',
    catalogPublished: true,
    catalogPublishedAt: now - 60 * 24 * 60 * 60 * 1000,
    productCount,
    checkoutVentasModo: 'pasarela_micatalogo',
    onepayPaymentsEnabled: true,
    salesSummaryPeriod: 'week',
    envioEstimadoCop: 12_000,
    envioEstimadoEtiqueta: 'Envío nacional',
    envioGratisDesdeCop: 150_000,
    cuponesCatalogo: [{ id: 'demo-cupon-1', codigo: 'BIENVENIDA10', tipo: 'porcentaje', valor: 10, activo: true }],
    catalogTheme: { preset: profile.themePreset },
  }
}

function buildProducts(profile: StoreProfile): (McProducto & { id: string })[] {
  const now = Date.now()
  return profile.products.map((p, i) => ({
    ...p,
    precioCostoCop: Math.round(p.precioCop * 0.58),
    id: `demo-prod-${i + 1}`,
    createdAt: now - (i + 1) * 86400000,
    updatedAt: now - i * 3600000,
  }))
}

function buildCategorias(profile: StoreProfile): (McCategoria & { id: string })[] {
  const now = Date.now()
  return profile.categorias.map((c, i) => ({
    id: c.id,
    nombre: c.nombre,
    orden: i,
    activa: true,
    createdAt: now,
    updatedAt: now,
  }))
}

const ESTADO_LABELS: Record<McOrdenCatalogoEstado, string> = {
  esperando_pago: 'Pago pendiente',
  pagado: 'Pagado',
  en_preparacion: 'En preparación',
  listo_envio: 'Listo envío',
  enviado: 'Despachado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export { ESTADO_LABELS as demoOrdenEstadoLabels }

function buildVentas(
  products: (McProducto & { id: string })[],
): (McOrdenCatalogo & { id: string })[] {
  const now = Date.now()
  const pick = (idx: number) => products[idx % products.length]

  const specs: Array<{
    haceMs: number
    estado: McOrdenCatalogoEstado
    cliente: string
    productIdx: number
    qty: number
    envio?: number
    cupon?: string
    descuento?: number
    ref: string
  }> = [
    { haceMs: 12 * 60_000, estado: 'pagado', cliente: 'María González', productIdx: 0, qty: 1, ref: 'MC-A1B2C3' },
    { haceMs: 38 * 60_000, estado: 'en_preparacion', cliente: 'Carlos Ruiz', productIdx: 1, qty: 2, ref: 'MC-D4E5F6' },
    { haceMs: 65 * 60_000, estado: 'listo_envio', cliente: 'Laura Méndez', productIdx: 2, qty: 1, envio: 12_000, ref: 'MC-G7H8I9' },
    { haceMs: 2 * 3600_000, estado: 'enviado', cliente: 'Andrés Pérez', productIdx: 3, qty: 1, envio: 12_000, ref: 'MC-J0K1L2' },
    { haceMs: 26 * 3600_000, estado: 'entregado', cliente: 'Sofía Torres', productIdx: 0, qty: 2, cupon: 'BIENVENIDA10', descuento: 25_800, ref: 'MC-M3N4O5' },
    { haceMs: 30 * 3600_000, estado: 'pagado', cliente: 'Diego Vargas', productIdx: 4, qty: 1, ref: 'MC-P6Q7R8' },
    { haceMs: 52 * 3600_000, estado: 'esperando_pago', cliente: 'Valentina Ríos', productIdx: 1, qty: 1, ref: 'MC-S9T0U1' },
    { haceMs: 28 * 3600_000, estado: 'entregado', cliente: 'Juan Herrera', productIdx: 2, qty: 3, envio: 0, ref: 'MC-V2W3X4' },
  ]

  return specs.map((s, i) => {
    const prod = pick(s.productIdx)
    const subtotal = prod.precioCop * s.qty
    const descuento = s.descuento ?? 0
    const envio = s.envio ?? 0
    const total = subtotal - descuento + envio
    const createdAt = now - s.haceMs
    return {
      id: `demo-orden-${i + 1}`,
      createdAt,
      updatedAt: createdAt + 600_000,
      estado: s.estado,
      lineas: [
        {
          productId: prod.id,
          nombre: prod.nombre,
          cantidad: s.qty,
          precioUnitarioCop: prod.precioCop,
          costoUnitarioCop: prod.precioCostoCop,
        },
      ],
      totalCop: total,
      subtotalCop: subtotal,
      envioCop: envio,
      descuentoCop: descuento,
      cuponCodigo: s.cupon,
      pagoSimulado: false,
      pagoOnePay: s.estado !== 'esperando_pago',
      clienteNombre: s.cliente,
      clienteTelefono: '3001234567',
      clienteEmail: `${s.cliente.split(' ')[0].toLowerCase()}@email.com`,
      clienteTipoDocumento: 'CC',
      clienteDocumentoNumero: `${10000000 + i * 111111}`,
      envioCiudad: 'Bogotá',
      envioDepartamento: 'Cundinamarca',
      envioDireccion: 'Calle 123 #45-67, Apto 801',
      numeroReferencia: s.ref,
      trackingNumber: s.estado === 'enviado' || s.estado === 'entregado' ? `GUIA${900000 + i}` : undefined,
      seguimientoCompraAt: createdAt,
      seguimientoPreparacionAt:
        s.estado !== 'pagado' && s.estado !== 'esperando_pago' ? createdAt + 3600_000 : undefined,
      seguimientoDespachoAt:
        s.estado === 'enviado' || s.estado === 'entregado' ? createdAt + 7200_000 : undefined,
      seguimientoEntregaAt: s.estado === 'entregado' ? createdAt + 86400_000 : undefined,
    }
  })
}

function buildManualPedidos(): (McPedido & { id: string })[] {
  const now = Date.now()
  return [
    {
      id: 'demo-manual-1',
      clienteHint: 'Pedido Instagram',
      nota: '2 unidades talla M — retiro en tienda el sábado',
      estado: 'nuevo',
      totalCop: 178_000,
      createdAt: now - 4 * 3600_000,
    },
    {
      id: 'demo-manual-2',
      clienteHint: 'Cliente frecuente',
      nota: 'Reservar combo regalo para entrega el viernes',
      estado: 'en_proceso',
      totalCop: 167_000,
      createdAt: now - 20 * 3600_000,
    },
  ]
}

function buildAnalytics(period: McAnalyticsPeriod): McAnalyticsSummary {
  const days = period === '7d' ? 7 : period === '14d' ? 14 : 30
  const keys = mcAnalyticsDateKeysForPeriod(days)
  const pattern = [18, 24, 21, 32, 28, 45, 38, 42, 36, 50, 48, 55, 52, 47, 58, 61, 54, 49, 63, 57, 44, 39, 41, 46, 51, 53, 56, 59, 62, 48]
  const daily = keys.map((dateKey, i) => {
    const visits = pattern[i % pattern.length] + (i % 3)
    const productViews = Math.round(visits * 2.4)
    const checkoutStarts = Math.round(visits * 0.22)
    const checkoutCompletes = Math.round(checkoutStarts * 0.68)
    return {
      dateKey,
      visits,
      pageViews: Math.round(visits * 3.1),
      productViews,
      checkoutStarts,
      checkoutCompletes,
    }
  })
  const visits = daily.reduce((s, d) => s + d.visits, 0)
  const pageViews = daily.reduce((s, d) => s + d.pageViews, 0)
  const productViews = daily.reduce((s, d) => s + d.productViews, 0)
  const checkoutStarts = daily.reduce((s, d) => s + d.checkoutStarts, 0)
  const checkoutCompletes = daily.reduce((s, d) => s + d.checkoutCompletes, 0)
  return { visits, pageViews, productViews, checkoutStarts, checkoutCompletes, daily }
}

function buildTopProducts(
  period: McAnalyticsPeriod,
  products: (McProducto & { id: string })[],
): McTopProductRow[] {
  const baseViews = period === '7d' ? 120 : period === '14d' ? 240 : 520
  const weights = [0.34, 0.22, 0.18, 0.14, 0.12]
  const totalViews = Math.round(baseViews * products.length * 0.4)
  return products.slice(0, 5).map((p, i) => {
    const views = Math.round(totalViews * weights[i])
    return {
      productId: p.id,
      productTitle: p.nombre,
      imageUrl: p.imageUrl,
      views,
      sharePercent: Math.round(weights[i] * 100),
    }
  })
}

export function buildDemoAdminDataset(demo: McDemoStore): DemoAdminDataset {
  const profile = resolveStoreProfile(demo)
  const products = buildProducts(profile)
  const categorias = buildCategorias(profile)
  const tenant = buildTenant(demo, profile, products.length)
  const ventas = buildVentas(products)
  const manualPedidos = buildManualPedidos()

  const salesToday = ventas
    .filter((v) => v.createdAt > Date.now() - 86400000 && v.estado !== 'cancelado' && v.estado !== 'esperando_pago')
    .reduce((s, v) => s + v.totalCop, 0)
  const salesPeriodTotal = ventas
    .filter((v) => v.estado !== 'cancelado' && v.estado !== 'esperando_pago')
    .reduce((s, v) => s + v.totalCop, 0)

  const analytics7d = buildAnalytics('7d')
  const todayKey = analytics7d.daily[analytics7d.daily.length - 1]?.dateKey
  const todayVisits = analytics7d.daily.find((d) => d.dateKey === todayKey)?.visits ?? 142

  return {
    tenant,
    categorias,
    products,
    ventas,
    manualPedidos,
    analyticsByPeriod: {
      '7d': analytics7d,
      '14d': buildAnalytics('14d'),
      '30d': buildAnalytics('30d'),
    },
    topProductsByPeriod: {
      '7d': buildTopProducts('7d', products),
      '14d': buildTopProducts('14d', products),
      '30d': buildTopProducts('30d', products),
    },
    salesToday: salesToday || 1_847_000,
    salesPeriodTotal: salesPeriodTotal || 8_920_000,
    salesPeriodLabel: 'Esta semana',
    todayVisits,
    onepayBalancePreview: '$ 2.340.500',
  }
}
