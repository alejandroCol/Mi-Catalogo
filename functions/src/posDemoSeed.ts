import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from './firebaseAdmin.js'

const DEMO_SEED_TAG = 'mcPosDemoSeed'

const SEDES = [
  {
    id: 'sede-chapinero',
    nombre: 'Sede Chapinero',
    codigo: 'CHP',
    direccion: 'Cra 13 # 85-32, Bogotá',
    activa: true,
    mostrarEnTiendaVirtual: true,
  },
  {
    id: 'sede-usaquen',
    nombre: 'Sede Usaquén',
    codigo: 'USQ',
    direccion: 'Calle 119 # 7-14, Bogotá',
    activa: true,
    mostrarEnTiendaVirtual: true,
  },
] as const

const PRODUCTOS = [
  { id: 'prod-blusa-lino', nombre: 'Blusa lino natural', codigo: 'BLN-01', precioCop: 89_000, publicadoEnCatalogo: true },
  { id: 'prod-pantalon-cargo', nombre: 'Pantalón cargo oliva', codigo: 'PCO-02', precioCop: 145_000, publicadoEnCatalogo: true },
  { id: 'prod-vestido-midi', nombre: 'Vestido midi satinado', codigo: 'VMS-03', precioCop: 189_000, publicadoEnCatalogo: true },
  { id: 'prod-bolso-tejido', nombre: 'Bolso tejido artesanal', codigo: 'BTA-04', precioCop: 120_000 },
  { id: 'prod-camisa-oversize', nombre: 'Camisa oversize blanca', codigo: 'COB-05', precioCop: 98_000, publicadoEnCatalogo: true },
  { id: 'prod-falda-plisada', nombre: 'Falda plisada arena', codigo: 'FPA-06', precioCop: 112_000 },
  { id: 'prod-chaqueta-denim', nombre: 'Chaqueta denim', codigo: 'CDM-07', precioCop: 165_000, publicadoEnCatalogo: true },
  { id: 'prod-top-crochet', nombre: 'Top crochet ivory', codigo: 'TCI-08', precioCop: 76_000 },
  { id: 'prod-short-lino', nombre: 'Short lino café', codigo: 'SLC-09', precioCop: 85_000 },
  { id: 'prod-accesorios-dorado', nombre: 'Set accesorios dorado', codigo: 'SAD-10', precioCop: 45_000, publicadoEnCatalogo: true },
] as const

const VENDORS = [
  { uid: 'demo-laura', nombre: 'Laura Méndez', sedeId: 'sede-chapinero' },
  { uid: 'demo-maria', nombre: 'María Castillo', sedeId: 'sede-chapinero' },
  { uid: 'demo-camila', nombre: 'Camila Ríos', sedeId: 'sede-usaquen' },
] as const

const METODOS = ['efectivo', 'nequi', 'transferencia', 'credito'] as const

async function assertMcSuperAdminUid(uid: string): Promise<void> {
  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  if ((userSnap.data() as { isSuperAdmin?: boolean }).isSuperAdmin !== true) {
    throw new HttpsError('permission-denied', 'Solo súper admin.')
  }
}

function fechaKeyLocal(ms: number): string {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function msForDayHour(daysAgo: number, hour: number, minute: number): number {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

async function deletePreviousDemoSeed(tenantId: string): Promise<void> {
  const collections = ['pos_sedes', 'pos_productos', 'pos_stock', 'pos_ventas', 'pos_caja_diaria'] as const
  for (const col of collections) {
    const snap = await db.collection(`mc_tenants/${tenantId}/${col}`).where(DEMO_SEED_TAG, '==', true).get()
    if (snap.empty) continue
    const batch = db.batch()
    for (const doc of snap.docs) batch.delete(doc.ref)
    await batch.commit()
  }
}

export const mcSeedPosDemoData = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  await assertMcSuperAdminUid(uid)

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    tenantId?: unknown
  }
  const tenantId = typeof data.tenantId === 'string' ? data.tenantId.trim() : ''
  if (!tenantId) throw new HttpsError('invalid-argument', 'Falta tenantId.')

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) throw new HttpsError('not-found', 'Tienda no encontrada.')

  await deletePreviousDemoSeed(tenantId)

  const now = Date.now()
  let batch = db.batch()
  let ops = 0

  async function flush() {
    if (ops === 0) return
    await batch.commit()
    batch = db.batch()
    ops = 0
  }

  async function setDoc(path: string, payload: Record<string, unknown>) {
    batch.set(db.doc(path), { ...payload, [DEMO_SEED_TAG]: true })
    ops++
    if (ops >= 400) await flush()
  }

  for (const sede of SEDES) {
    await setDoc(`mc_tenants/${tenantId}/pos_sedes/${sede.id}`, {
      nombre: sede.nombre,
      codigo: sede.codigo,
      direccion: sede.direccion,
      activa: sede.activa,
      mostrarEnTiendaVirtual: sede.mostrarEnTiendaVirtual,
      createdAt: now - 60 * 24 * 60 * 60 * 1000,
      updatedAt: now,
    })
  }

  for (const prod of PRODUCTOS) {
    await setDoc(`mc_tenants/${tenantId}/pos_productos/${prod.id}`, {
      nombre: prod.nombre,
      codigo: prod.codigo,
      precioCop: prod.precioCop,
      activo: true,
      sedeId: 'sede-chapinero',
      publicadoEnCatalogo: 'publicadoEnCatalogo' in prod && prod.publicadoEnCatalogo === true,
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
      updatedAt: now,
    })
    for (const sede of SEDES) {
      const stockId = `${sede.id}_${prod.id}`
      await setDoc(`mc_tenants/${tenantId}/pos_stock/${stockId}`, {
        sedeId: sede.id,
        productoId: prod.id,
        cantidad: 10 + (prod.id.length % 15),
        updatedAt: now,
      })
    }
  }

  const horasPico = [10, 11, 12, 14, 15, 16, 17, 18, 19]
  let ventaIdx = 0

  for (let day = 0; day < 14; day++) {
    const ventasDia = day === 0 ? 12 : 5 + (day % 4)
    for (let v = 0; v < ventasDia; v++) {
      const vendor = VENDORS[(ventaIdx + v) % VENDORS.length]!
      const prodA = PRODUCTOS[(ventaIdx + v) % PRODUCTOS.length]!
      const prodB = PRODUCTOS[(ventaIdx + v + 3) % PRODUCTOS.length]!
      const qtyA = 1 + (ventaIdx % 2)
      const qtyB = ventaIdx % 3 === 0 ? 1 : 0
      const subA = prodA.precioCop * qtyA
      const subB = qtyB ? prodB.precioCop : 0
      const total = subA + subB
      const metodo = METODOS[(ventaIdx + day) % METODOS.length]!
      const hora = horasPico[(ventaIdx + v) % horasPico.length]!
      const minuto = (ventaIdx * 7 + v * 11) % 60
      const createdAt = msForDayHour(day, hora, minuto)

      await setDoc(`mc_tenants/${tenantId}/pos_ventas/demo-venta-${ventaIdx}`, {
        sedeId: vendor.sedeId,
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
        createdAt,
      })
      ventaIdx++
    }
  }

  const hoyKey = fechaKeyLocal(now)
  for (let i = 0; i < VENDORS.length; i++) {
    const vendor = VENDORS[i]!
    const cajaId = `${vendor.sedeId}_${vendor.uid}_${hoyKey}`
    await setDoc(`mc_tenants/${tenantId}/pos_caja_diaria/${cajaId}`, {
      sedeId: vendor.sedeId,
      vendedorUid: vendor.uid,
      fechaKey: hoyKey,
      saldoInicialEfectivo: 150_000 + i * 50_000,
      estado: 'abierta',
      egresos: [],
      ingresos: [],
      ventasEfectivoDia: 0,
      createdAt: msForDayHour(0, 8, 30 + i * 5),
      updatedAt: now,
    })
  }

  await flush()

  return {
    ok: true as const,
    tenantId,
    sedes: SEDES.length,
    productos: PRODUCTOS.length,
    ventas: ventaIdx,
    cajas: VENDORS.length,
  }
})
