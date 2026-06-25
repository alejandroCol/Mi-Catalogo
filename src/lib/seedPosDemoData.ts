import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { posFechaKeyLocal } from '@/pos/lib/posDate'

export const DEMO_POS_SEED_TAG = 'mcPosDemoSeed'

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

export type SeedPosDemoResult = {
  ok: true
  tenantId: string
  sedes: number
  productos: number
  ventas: number
  cajas: number
}

function msForDayHour(daysAgo: number, hour: number, minute: number): number {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

async function deletePreviousDemoSeed(tenantId: string): Promise<void> {
  const db = getDb()
  const collections = ['pos_sedes', 'pos_productos', 'pos_stock', 'pos_ventas', 'pos_caja_diaria'] as const
  for (const col of collections) {
    const snap = await getDocs(
      query(collection(db, `mc_tenants/${tenantId}/${col}`), where(DEMO_POS_SEED_TAG, '==', true)),
    )
    if (snap.empty) continue
    let batch = writeBatch(db)
    let ops = 0
    for (const d of snap.docs) {
      batch.delete(d.ref)
      ops++
      if (ops >= 400) {
        await batch.commit()
        batch = writeBatch(db)
        ops = 0
      }
    }
    if (ops > 0) await batch.commit()
  }
}

export async function seedPosDemoData(
  tenantId: string,
): Promise<{ ok: true; data: SeedPosDemoResult } | { ok: false; message: string }> {
  try {
    const db = getDb()
    await deletePreviousDemoSeed(tenantId)

    const now = Date.now()
    let batch = writeBatch(db)
    let ops = 0

    async function flush() {
      if (ops === 0) return
      await batch.commit()
      batch = writeBatch(db)
      ops = 0
    }

    function setDoc(path: string, payload: Record<string, unknown>) {
      batch.set(doc(db, path), { ...payload, [DEMO_POS_SEED_TAG]: true })
      ops++
    }

    for (const sede of SEDES) {
      setDoc(`mc_tenants/${tenantId}/pos_sedes/${sede.id}`, {
        nombre: sede.nombre,
        codigo: sede.codigo,
        direccion: sede.direccion,
        activa: sede.activa,
        mostrarEnTiendaVirtual: sede.mostrarEnTiendaVirtual,
        createdAt: now - 60 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      })
      if (ops >= 400) await flush()
    }

    for (const prod of PRODUCTOS) {
      setDoc(`mc_tenants/${tenantId}/pos_productos/${prod.id}`, {
        nombre: prod.nombre,
        codigo: prod.codigo,
        precioCop: prod.precioCop,
        activo: true,
        sedeId: 'sede-chapinero',
        publicadoEnCatalogo: 'publicadoEnCatalogo' in prod && prod.publicadoEnCatalogo === true,
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      })
      if (ops >= 400) await flush()

      for (const sede of SEDES) {
        setDoc(`mc_tenants/${tenantId}/pos_stock/${sede.id}_${prod.id}`, {
          sedeId: sede.id,
          productoId: prod.id,
          cantidad: 10 + (prod.id.length % 15),
          updatedAt: now,
        })
        if (ops >= 400) await flush()
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

        setDoc(`mc_tenants/${tenantId}/pos_ventas/demo-venta-${ventaIdx}`, {
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
          createdAt: msForDayHour(day, hora, minuto),
        })
        ventaIdx++
        if (ops >= 400) await flush()
      }
    }

    const hoyKey = posFechaKeyLocal()
    for (let i = 0; i < VENDORS.length; i++) {
      const vendor = VENDORS[i]!
      setDoc(`mc_tenants/${tenantId}/pos_caja_diaria/${vendor.sedeId}_${vendor.uid}_${hoyKey}`, {
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
      if (ops >= 400) await flush()
    }

    await flush()

    return {
      ok: true,
      data: {
        ok: true,
        tenantId,
        sedes: SEDES.length,
        productos: PRODUCTOS.length,
        ventas: ventaIdx,
        cajas: VENDORS.length,
      },
    }
  } catch (err) {
    console.error('[seedPosDemoData]', err)
    const code =
      typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : ''
    if (code === 'permission-denied') {
      return {
        ok: false,
        message:
          'Sin permisos en Firestore. Desplegá las reglas actualizadas (súper admin + mcPosDemoSeed).',
      }
    }
    return { ok: false, message: 'No se pudo cargar la data demo POS.' }
  }
}
