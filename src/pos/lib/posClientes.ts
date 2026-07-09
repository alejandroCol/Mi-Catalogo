import {
  collection,
  doc,
  increment,
  type Firestore,
  type WriteBatch,
  writeBatch,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosClientesCollection } from '@/lib/mcPosCollections'
import type { McPosCliente } from '@/types/mc'

export type CrearPosClienteInput = {
  nombre: string
  cedula: string
  ciudad: string
  direccion?: string
}

export function normalizeCedula(cedula: string) {
  return cedula.replace(/\D/g, '').trim()
}

export function clienteVentaFields(cliente: McPosCliente & { id: string }) {
  return {
    clienteId: cliente.id,
    clienteNombre: cliente.nombre,
    clienteCedula: cliente.cedula,
  }
}

export function clienteIniciales(nombre: string) {
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export async function crearPosCliente(
  tenantId: string,
  input: CrearPosClienteInput,
): Promise<McPosCliente & { id: string }> {
  const db = getDb()
  const now = Date.now()
  const ref = doc(collection(db, mcPosClientesCollection(tenantId)))
  const data = {
    nombre: input.nombre.trim(),
    cedula: normalizeCedula(input.cedula),
    ciudad: input.ciudad.trim(),
    ...(input.direccion?.trim() ? { direccion: input.direccion.trim() } : {}),
    totalComprasCop: 0,
    ventasCount: 0,
    createdAt: now,
  }
  const batch = writeBatch(db)
  batch.set(ref, data)
  await batch.commit()
  return { id: ref.id, ...data }
}

export function applyClienteVentaStatsBatch(
  batch: WriteBatch,
  db: Firestore,
  tenantId: string,
  clienteId: string,
  totalCop: number,
  now: number,
) {
  const clienteRef = doc(db, mcPosClientesCollection(tenantId), clienteId)
  batch.update(clienteRef, {
    totalComprasCop: increment(totalCop),
    ventasCount: increment(1),
    ultimaCompraAt: now,
    updatedAt: now,
  })
}

export function revertClienteVentaStatsBatch(
  batch: WriteBatch,
  db: Firestore,
  tenantId: string,
  clienteId: string,
  totalCop: number,
  now: number,
) {
  const clienteRef = doc(db, mcPosClientesCollection(tenantId), clienteId)
  batch.update(clienteRef, {
    totalComprasCop: increment(-totalCop),
    ventasCount: increment(-1),
    updatedAt: now,
  })
}
