import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from './firebaseAdmin.js'

export const REPORT_DEMO_SEED_TAG = 'mcReportDemoSeed'

const CIUDADES = [
  { ciudad: 'Bogotá', departamento: 'Cundinamarca' },
  { ciudad: 'Medellín', departamento: 'Antioquia' },
  { ciudad: 'Cali', departamento: 'Valle del Cauca' },
  { ciudad: 'Barranquilla', departamento: 'Atlántico' },
  { ciudad: 'Bucaramanga', departamento: 'Santander' },
  { ciudad: 'Cartagena', departamento: 'Bolívar' },
  { ciudad: 'Pereira', departamento: 'Risaralda' },
  { ciudad: 'Manizales', departamento: 'Caldas' },
  { ciudad: 'Cúcuta', departamento: 'Norte de Santander' },
  { ciudad: 'Ibagué', departamento: 'Tolima' },
] as const

const CLIENTES = [
  'María Fernández',
  'Carlos Rodríguez',
  'Laura Gómez',
  'Andrés Martínez',
  'Valentina López',
  'Santiago Herrera',
  'Camila Ríos',
  'Daniela Castro',
  'Juan Pablo Ortiz',
  'Isabella Muñoz',
] as const

const VENDEDORES_POS = [
  { uid: 'demo-report-v1', nombre: 'Laura Méndez' },
  { uid: 'demo-report-v2', nombre: 'María Castillo' },
  { uid: 'demo-report-v3', nombre: 'Camila Ríos' },
] as const

const METODOS_POS = ['efectivo', 'nequi', 'transferencia', 'credito'] as const

const ESTADOS_ORDEN = ['pagado', 'en_preparacion', 'listo_envio', 'enviado', 'entregado'] as const

const HORAS_PICO = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]

type CatalogProduct = {
  id: string
  nombre: string
  precioCop: number
  precioCostoCop?: number
}

type PosProduct = {
  id: string
  nombre: string
  precioCop: number
  precioCostoCop?: number
}

type PosSede = {
  id: string
  nombre: string
}

function msForDayHour(daysAgo: number, hour: number, minute: number): number {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

function dateKeyBogota(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(ms))
}

function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length]!
}

function unitCost(p: { precioCop: number; precioCostoCop?: number }): number | undefined {
  if (p.precioCostoCop != null && p.precioCostoCop >= 0) return Math.round(p.precioCostoCop)
  if (p.precioCop > 0) return Math.round(p.precioCop * 0.58)
  return undefined
}

async function assertCanSeedReports(uid: string, tenantId: string): Promise<void> {
  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  const user = userSnap.data() as { isSuperAdmin?: boolean; role?: string; active?: boolean }
  const isSuperAdmin = user.isSuperAdmin === true
  const isSalesRep = user.role === 'sales_rep' && user.active !== false
  if (!isSuperAdmin && !isSalesRep) {
    throw new HttpsError('permission-denied', 'Solo súper admin o vendedor activo.')
  }
  if (isSuperAdmin) return

  const demoSnap = await db
    .collection('mc_demo_stores')
    .where('tenantId', '==', tenantId)
    .where('active', '==', true)
    .limit(1)
    .get()
  if (demoSnap.empty) {
    throw new HttpsError(
      'permission-denied',
      'Solo podés cargar data demo en tiendas demo activas.',
    )
  }
}

async function deletePreviousReportDemoSeed(tenantId: string): Promise<void> {
  const collections = ['ordenes_catalogo', 'pos_ventas', 'analytics_daily', 'pos_caja_diaria'] as const
  for (const col of collections) {
    const snap = await db
      .collection(`mc_tenants/${tenantId}/${col}`)
      .where(REPORT_DEMO_SEED_TAG, '==', true)
      .get()
    if (snap.empty) continue
    let batch = db.batch()
    let ops = 0
    for (const doc of snap.docs) {
      batch.delete(doc.ref)
      ops++
      if (ops >= 400) {
        await batch.commit()
        batch = db.batch()
        ops = 0
      }
    }
    if (ops > 0) await batch.commit()
  }
}

async function loadCatalogProducts(tenantId: string): Promise<CatalogProduct[]> {
  const snap = await db.collection(`mc_tenants/${tenantId}/productos`).get()
  const out: CatalogProduct[] = []
  for (const doc of snap.docs) {
    const d = doc.data() as {
      nombre?: string
      precioCop?: number
      precioCostoCop?: number
      activo?: boolean
      enCatalogo?: boolean
      esBorrador?: boolean
    }
    if (d.activo !== true || d.enCatalogo !== true || d.esBorrador === true) continue
    const precioCop = Math.round(Number(d.precioCop) || 0)
    if (precioCop < 1) continue
    out.push({
      id: doc.id,
      nombre: (d.nombre ?? 'Producto').slice(0, 120),
      precioCop,
      precioCostoCop: d.precioCostoCop != null ? Math.round(d.precioCostoCop) : undefined,
    })
  }
  return out
}

async function loadPosProducts(tenantId: string): Promise<PosProduct[]> {
  const snap = await db.collection(`mc_tenants/${tenantId}/pos_productos`).get()
  const out: PosProduct[] = []
  for (const doc of snap.docs) {
    const d = doc.data() as { nombre?: string; precioCop?: number; precioCostoCop?: number; activo?: boolean }
    if (d.activo !== true) continue
    const precioCop = Math.round(Number(d.precioCop) || 0)
    if (precioCop < 1) continue
    out.push({
      id: doc.id,
      nombre: (d.nombre ?? 'Artículo').slice(0, 120),
      precioCop,
      precioCostoCop: d.precioCostoCop != null ? Math.round(d.precioCostoCop) : undefined,
    })
  }
  return out
}

async function loadPosSedes(tenantId: string): Promise<PosSede[]> {
  const snap = await db.collection(`mc_tenants/${tenantId}/pos_sedes`).get()
  const out: PosSede[] = []
  for (const doc of snap.docs) {
    const d = doc.data() as { nombre?: string; activa?: boolean }
    if (d.activa === false) continue
    out.push({ id: doc.id, nombre: (d.nombre ?? 'Sede').slice(0, 80) })
  }
  return out
}

export type SeedReportDemoResult = {
  ok: true
  tenantId: string
  dias: number
  ordenesCatalogo: number
  ventasPos: number
  analyticsDaily: number
  productosCatalogoUsados: number
  productosPosUsados: number
  sedesPosUsadas: number
}

export const mcSeedReportDemoData = onCall(
  { invoker: 'public', timeoutSeconds: 120, memory: '512MiB' },
  async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    tenantId?: unknown
    dias?: unknown
  }
  const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : ''
  if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.')

  const diasRaw = typeof data.dias === 'number' ? Math.floor(data.dias) : 90
  const dias = Math.min(120, Math.max(30, diasRaw))

  await assertCanSeedReports(uid, tenantId)

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) throw new HttpsError('not-found', 'Tienda no encontrada.')

  const [catalogProducts, posProducts, posSedes] = await Promise.all([
    loadCatalogProducts(tenantId),
    loadPosProducts(tenantId),
    loadPosSedes(tenantId),
  ])

  if (catalogProducts.length === 0 && (posProducts.length === 0 || posSedes.length === 0)) {
    throw new HttpsError(
      'failed-precondition',
      'La tienda necesita productos en catálogo o artículos POS con al menos una sede activa.',
    )
  }

  await deletePreviousReportDemoSeed(tenantId)

  let batch = db.batch()
  let ops = 0
  let ordenesCatalogo = 0
  let ventasPos = 0
  let analyticsDaily = 0

  async function flush() {
    if (ops === 0) return
    await batch.commit()
    batch = db.batch()
    ops = 0
  }

  async function setDoc(path: string, payload: Record<string, unknown>) {
    batch.set(db.doc(path), { ...payload, [REPORT_DEMO_SEED_TAG]: true })
    ops++
    if (ops >= 400) await flush()
  }

  for (let day = 0; day < dias; day++) {
    const ventasDiaEstimadas =
      catalogProducts.length > 0 ? 3 + ((day + tenantId.length) % 6) + (day === 0 ? 4 : 0) : 0
    const visitas = 18 + ((day * 17 + tenantId.length) % 55) + ventasDiaEstimadas * 3
    const checkoutStarts = Math.max(ventasDiaEstimadas + 1, Math.round(visitas * 0.22))
    const checkoutCompletes = ventasDiaEstimadas

    const sampleMs = msForDayHour(day, 12, 0)
    const dateKey = dateKeyBogota(sampleMs)

    await setDoc(`mc_tenants/${tenantId}/analytics_daily/${dateKey}`, {
      dateKey,
      visits: visitas,
      pageViews: visitas * 2 + (day % 7),
      productViews: visitas * 4 + day,
      checkoutStarts,
      checkoutCompletes,
      updatedAt: Date.now(),
    })
    analyticsDaily++

    if (catalogProducts.length > 0) {
      const ordenesDia = 2 + ((day + 3) % 5) + (day < 7 ? 2 : 0)
      for (let o = 0; o < ordenesDia; o++) {
        const idx = day * 11 + o
        const prodA = pick(catalogProducts, idx)
        const prodB = pick(catalogProducts, idx + 5)
        const qtyA = 1 + (idx % 3)
        const qtyB = idx % 4 === 0 ? 1 : 0
        const costA = unitCost(prodA)
        const costB = unitCost(prodB)
        const lineas = [
          {
            productId: prodA.id,
            nombre: prodA.nombre,
            cantidad: qtyA,
            precioUnitarioCop: prodA.precioCop,
            ...(costA != null ? { costoUnitarioCop: costA } : {}),
          },
          ...(qtyB
            ? [
                {
                  productId: prodB.id,
                  nombre: prodB.nombre,
                  cantidad: 1,
                  precioUnitarioCop: prodB.precioCop,
                  ...(costB != null ? { costoUnitarioCop: costB } : {}),
                },
              ]
            : []),
        ]
        const subtotalCop = lineas.reduce((s, l) => s + l.precioUnitarioCop * l.cantidad, 0)
        const envioCop = idx % 3 === 0 ? 12_000 + (idx % 5) * 2000 : 0
        const descuentoCop = idx % 9 === 0 ? Math.min(15_000, Math.round(subtotalCop * 0.08)) : 0
        const totalCop = Math.max(0, subtotalCop + envioCop - descuentoCop)
        const hora = pick(HORAS_PICO, idx)
        const minuto = (idx * 13 + o * 7) % 60
        const createdAt = msForDayHour(day, hora, minuto)
        const loc = pick(CIUDADES, idx)
        const viaOnePay = idx % 5 < 2
        const estado = pick(ESTADOS_ORDEN, idx + day)

        await setDoc(`mc_tenants/${tenantId}/ordenes_catalogo/report-demo-cat-${day}-${o}`, {
          createdAt,
          updatedAt: createdAt + 3600000,
          estado,
          lineas,
          subtotalCop,
          envioCop,
          descuentoCop,
          totalCop,
          pagoSimulado: !viaOnePay,
          ...(viaOnePay ? { pagoOnePay: true, onepayViaMicatalogo: true } : {}),
          clienteNombre: pick(CLIENTES, idx),
          clienteTelefono: `300${String(1000000 + ((idx * 7919) % 8999999)).slice(0, 7)}`,
          envioCiudad: loc.ciudad,
          envioDepartamento: loc.departamento,
          envioDireccion: `Calle ${10 + (idx % 80)} # ${20 + (idx % 50)}-${30 + (idx % 60)}`,
          numeroReferencia: `RD-${String(day).padStart(2, '0')}${String(o).padStart(2, '0')}${idx % 100}`,
          seguimientoCompraAt: createdAt,
          ...(estado !== 'pagado' ? { seguimientoPreparacionAt: createdAt + 7200000 } : {}),
        })
        ordenesCatalogo++
      }
    }

    if (posProducts.length > 0 && posSedes.length > 0) {
      const ventasDia = 4 + ((day + 1) % 8) + (day < 14 ? 3 : 0)
      for (let v = 0; v < ventasDia; v++) {
        const idx = day * 13 + v
        const vendor = pick(VENDEDORES_POS, idx)
        const sede = pick(posSedes, idx)
        const prodA = pick(posProducts, idx)
        const prodB = pick(posProducts, idx + 2)
        const qtyA = 1 + (idx % 2)
        const qtyB = idx % 3 === 0 ? 1 : 0
        const costA = unitCost(prodA)
        const costB = unitCost(prodB)
        const subA = prodA.precioCop * qtyA
        const subB = qtyB ? prodB.precioCop : 0
        const totalCop = subA + subB
        const metodo = pick(METODOS_POS, idx + day)
        const hora = pick(HORAS_PICO, idx + 2)
        const minuto = (idx * 11 + v * 5) % 60
        const createdAt = msForDayHour(day, hora, minuto)

        await setDoc(`mc_tenants/${tenantId}/pos_ventas/report-demo-pos-${day}-${v}`, {
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
              ...(costA != null ? { costoUnitarioCop: costA } : {}),
            },
            ...(qtyB
              ? [
                  {
                    productoId: prodB.id,
                    nombre: prodB.nombre,
                    cantidad: 1,
                    precioUnitarioCop: prodB.precioCop,
                    subtotalCop: subB,
                    ...(costB != null ? { costoUnitarioCop: costB } : {}),
                  },
                ]
              : []),
          ],
          pagos: [{ metodo, monto: totalCop }],
          totalCop,
          estado: 'activa',
          createdAt,
        })
        ventasPos++
      }
    }
  }

  if (posSedes.length > 0) {
    const hoyKey = dateKeyBogota(Date.now())
    for (let i = 0; i < Math.min(VENDEDORES_POS.length, posSedes.length); i++) {
      const vendor = VENDEDORES_POS[i]!
      const sede = posSedes[i % posSedes.length]!
      await setDoc(
        `mc_tenants/${tenantId}/pos_caja_diaria/report-demo-${sede.id}_${vendor.uid}_${hoyKey}`,
        {
          sedeId: sede.id,
          vendedorUid: vendor.uid,
          fechaKey: hoyKey,
          saldoInicialEfectivo: 120_000 + i * 40_000,
          estado: 'abierta',
          egresos: [],
          ingresos: [],
          ventasEfectivoDia: 0,
          createdAt: msForDayHour(0, 8, 15 + i * 10),
          updatedAt: Date.now(),
        },
      )
    }
  }

  await flush()

  return {
    ok: true as const,
    tenantId,
    dias,
    ordenesCatalogo,
    ventasPos,
    analyticsDaily,
    productosCatalogoUsados: catalogProducts.length,
    productosPosUsados: posProducts.length,
    sedesPosUsadas: posSedes.length,
  }
})
