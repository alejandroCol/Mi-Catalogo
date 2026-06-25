import type {
  McDemoStore,
  McPosCajaDiaria,
  McPosMetodoPago,
  McPosProducto,
  McPosSede,
  McPosStock,
  McPosVenta,
  McTenant,
} from '@/types/mc'
import { posFechaKeyLocal } from '@/pos/lib/posDate'

export type DemoPosVendor = {
  uid: string
  nombre: string
  sedeId: string
}

export type DemoPosDataset = {
  tenant: McTenant
  sedes: (McPosSede & { id: string })[]
  productos: (McPosProducto & { id: string })[]
  stock: (McPosStock & { id: string })[]
  ventas: (McPosVenta & { id: string })[]
  cajas: (McPosCajaDiaria & { id: string })[]
  vendors: DemoPosVendor[]
  vendorActivo: DemoPosVendor
}

const METODOS: McPosMetodoPago[] = ['efectivo', 'nequi', 'transferencia', 'credito']

const PRODUCTOS_BASE: Omit<McPosProducto, 'id' | 'createdAt' | 'updatedAt' | 'sedeId'>[] = [
  { nombre: 'Blusa lino natural', codigo: 'BLN-01', precioCop: 89_000, activo: true, publicadoEnCatalogo: true },
  { nombre: 'Pantalón cargo oliva', codigo: 'PCO-02', precioCop: 145_000, activo: true, publicadoEnCatalogo: true },
  { nombre: 'Vestido midi satinado', codigo: 'VMS-03', precioCop: 189_000, activo: true, publicadoEnCatalogo: true },
  { nombre: 'Bolso tejido artesanal', codigo: 'BTA-04', precioCop: 120_000, activo: true },
  { nombre: 'Camisa oversize blanca', codigo: 'COB-05', precioCop: 98_000, activo: true, publicadoEnCatalogo: true },
  { nombre: 'Falda plisada arena', codigo: 'FPA-06', precioCop: 112_000, activo: true },
  { nombre: 'Chaqueta denim', codigo: 'CDM-07', precioCop: 165_000, activo: true, publicadoEnCatalogo: true },
  { nombre: 'Top crochet ivory', codigo: 'TCI-08', precioCop: 76_000, activo: true },
  { nombre: 'Short lino café', codigo: 'SLC-09', precioCop: 85_000, activo: true },
  { nombre: 'Set accesorios dorado', codigo: 'SAD-10', precioCop: 45_000, activo: true, publicadoEnCatalogo: true },
]

function fechaKeyDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return posFechaKeyLocal(d)
}

function msForDayHour(daysAgo: number, hour: number, minute: number): number {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

export function buildDemoPosDataset(demo: McDemoStore): DemoPosDataset {
  const now = Date.now()
  const tenant: McTenant = {
    id: demo.tenantId || demo.id,
    slug: demo.slug,
    nombreTienda: demo.displayName,
    ownerUid: 'demo-owner',
    whatsappNumero: '573001234567',
    billingPlan: 'expert',
    subscriptionEndsAt: now + 365 * 24 * 60 * 60 * 1000,
    createdAt: now - 90 * 24 * 60 * 60 * 1000,
  }

  const sedes: DemoPosDataset['sedes'] = [
    {
      id: 'sede-chapinero',
      nombre: 'Sede Chapinero',
      codigo: 'CHP',
      direccion: 'Cra 13 # 85-32, Bogotá',
      activa: true,
      mostrarEnTiendaVirtual: true,
      createdAt: now - 60 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'sede-usaquen',
      nombre: 'Sede Usaquén',
      codigo: 'USQ',
      direccion: 'Calle 119 # 7-14, Bogotá',
      activa: true,
      mostrarEnTiendaVirtual: true,
      createdAt: now - 45 * 24 * 60 * 60 * 1000,
    },
  ]

  const vendors: DemoPosVendor[] = [
    { uid: 'demo-laura', nombre: 'Laura Méndez', sedeId: 'sede-chapinero' },
    { uid: 'demo-maria', nombre: 'María Castillo', sedeId: 'sede-chapinero' },
    { uid: 'demo-camila', nombre: 'Camila Ríos', sedeId: 'sede-usaquen' },
  ]

  const productos: DemoPosDataset['productos'] = PRODUCTOS_BASE.map((p, i) => ({
    ...p,
    id: `prod-${i + 1}`,
    sedeId: 'sede-chapinero',
    createdAt: now - (30 - i) * 24 * 60 * 60 * 1000,
    updatedAt: now - i * 24 * 60 * 60 * 1000,
  }))

  const stock: DemoPosDataset['stock'] = []
  for (const sede of sedes) {
    for (const prod of productos) {
      stock.push({
        id: `${sede.id}_${prod.id}`,
        sedeId: sede.id,
        productoId: prod.id,
        cantidad: 8 + ((prod.id.charCodeAt(5) ?? 0) + sede.id.length) % 22,
        updatedAt: now,
      })
    }
  }

  const ventas: DemoPosDataset['ventas'] = []
  let ventaIdx = 0
  const horasPico = [10, 11, 12, 14, 15, 16, 17, 18, 19]

  for (let day = 0; day < 14; day++) {
    const ventasDia = day === 0 ? 9 : 4 + (day % 5)
    for (let v = 0; v < ventasDia; v++) {
      const vendor = vendors[(ventaIdx + v) % vendors.length]!
      const sede = sedes.find((s) => s.id === vendor.sedeId) ?? sedes[0]!
      const prodA = productos[(ventaIdx + v) % productos.length]!
      const prodB = productos[(ventaIdx + v + 3) % productos.length]!
      const qtyA = 1 + (ventaIdx % 2)
      const qtyB = ventaIdx % 3 === 0 ? 1 : 0
      const subA = prodA.precioCop * qtyA
      const subB = qtyB ? prodB.precioCop : 0
      const total = subA + subB
      const metodo = METODOS[(ventaIdx + day) % METODOS.length]!
      const hora = horasPico[(ventaIdx + v) % horasPico.length]!
      const minuto = (ventaIdx * 7 + v * 11) % 60

      ventas.push({
        id: `demo-venta-${ventaIdx}`,
        sedeId: sede.id,
        vendedorUid: vendor.uid,
        vendedorNombre: vendor.nombre,
        lineas: [
          {
            productoId: prodA.id,
            nombre: prodA.nombre,
            cantidad: qtyA,
            precioUnitarioCop: prodA.precioCop,
            subtotalCop: subA,
          },
          ...(qtyB
            ? [
                {
                  productoId: prodB.id,
                  nombre: prodB.nombre,
                  cantidad: 1,
                  precioUnitarioCop: prodB.precioCop,
                  subtotalCop: subB,
                },
              ]
            : []),
        ],
        pagos: [{ metodo, monto: total }],
        totalCop: total,
        estado: 'activa',
        createdAt: msForDayHour(day, hora, minuto),
      })
      ventaIdx++
    }
  }

  ventas.sort((a, b) => b.createdAt - a.createdAt)

  const hoyKey = posFechaKeyLocal()
  const cajas: DemoPosDataset['cajas'] = vendors.map((v, i) => {
    const ventasHoy = ventas.filter(
      (x) => x.vendedorUid === v.uid && posFechaKeyLocal(new Date(x.createdAt)) === hoyKey,
    )
    const efectivoHoy = ventasHoy
      .filter((x) => x.pagos.some((p) => p.metodo === 'efectivo'))
      .reduce((s, x) => s + x.totalCop, 0)
    return {
      id: `${v.sedeId}_${v.uid}_${hoyKey}`,
      sedeId: v.sedeId,
      vendedorUid: v.uid,
      fechaKey: hoyKey,
      saldoInicialEfectivo: 150_000 + i * 50_000,
      estado: 'abierta' as const,
      egresos: [],
      ingresos: [],
      ventasEfectivoDia: efectivoHoy,
      createdAt: msForDayHour(0, 8, 30 + i * 5),
    }
  })

  return {
    tenant,
    sedes,
    productos,
    stock,
    ventas,
    cajas,
    vendors,
    vendorActivo: vendors[0]!,
  }
}

export function ventasActivasDemo(ventas: DemoPosDataset['ventas']) {
  return ventas.filter((v) => v.estado !== 'anulada')
}

export function ventasHoyDemo(ventas: DemoPosDataset['ventas']) {
  const hoy = posFechaKeyLocal()
  return ventasActivasDemo(ventas).filter((v) => posFechaKeyLocal(new Date(v.createdAt)) === hoy)
}

export function ventasUltimos7DiasDemo(ventas: DemoPosDataset['ventas']) {
  const keys = new Set<string>()
  for (let i = 0; i < 7; i++) keys.add(fechaKeyDaysAgo(i))
  return ventasActivasDemo(ventas).filter((v) => keys.has(posFechaKeyLocal(new Date(v.createdAt))))
}
