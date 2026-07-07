import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import { mcCarritosIniciadosCollection } from '@/lib/mcCollections'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import type { McCarritoIniciado, McCarritoIniciadoLinea } from '@/types/mc'

export function lineasToCarritoIniciado(lines: LineaCarritoSimple[]): McCarritoIniciadoLinea[] {
  return lines.map((l) => ({
    productId: l.productId,
    ...(l.varianteId ? { varianteId: l.varianteId } : {}),
    ...(l.tallaId ? { tallaId: l.tallaId } : {}),
    titulo: l.titulo,
    ...(l.subtitulo ? { subtitulo: l.subtitulo } : {}),
    ...(l.precioUnitarioCop != null ? { precioUnitarioCop: l.precioUnitarioCop } : {}),
    cantidad: l.cantidad,
    ...(l.esCombo ? { esCombo: true } : {}),
    ...(l.comboColorSeleccion?.length ? { comboColorSeleccion: l.comboColorSeleccion } : {}),
  }))
}

export function carritoIniciadoToSimpleLines(lineas: McCarritoIniciadoLinea[]): LineaCarritoSimple[] {
  return lineas.map((l) => ({
    productId: l.productId,
    ...(l.varianteId ? { varianteId: l.varianteId } : {}),
    ...(l.tallaId ? { tallaId: l.tallaId } : {}),
    titulo: l.titulo,
    ...(l.subtitulo ? { subtitulo: l.subtitulo } : {}),
    ...(l.precioUnitarioCop != null ? { precioUnitarioCop: l.precioUnitarioCop } : {}),
    cantidad: l.cantidad,
    ...(l.esCombo ? { esCombo: true } : {}),
    ...(l.comboColorSeleccion?.length ? { comboColorSeleccion: l.comboColorSeleccion } : {}),
  }))
}

export function subtotalFromCarritoLineas(lineas: McCarritoIniciadoLinea[]): number {
  return lineas.reduce(
    (s, l) => s + Math.max(0, Math.round(l.precioUnitarioCop ?? 0)) * Math.max(0, l.cantidad),
    0,
  )
}

export function carritoIniciadoDocPath(tenantId: string, carritoId: string) {
  return `${mcCarritosIniciadosCollection(tenantId)}/${carritoId}`
}

/** URL de checkout con carrito y cupón preaplicados. */
export function buildCarritoRecuperacionCheckoutUrl(
  _origin: string,
  slug: string,
  carritoId: string,
  cuponCodigo?: string,
): string {
  const base = buildStorePublicUrl(slug, '/checkout')
  const q = new URLSearchParams({ r: carritoId })
  const cupon = cuponCodigo?.trim()
  if (cupon) q.set('cupon', cupon)
  return `${base}?${q.toString()}`
}

export type CarritoCheckoutContacto = {
  nombre?: string
  telefono?: string
  email?: string
  envioCiudad?: string
  envioDepartamento?: string
  envioDireccion?: string
}

export function buildCarritoIniciadoPayload(
  lines: LineaCarritoSimple[],
  sessionToken: string,
  contacto?: CarritoCheckoutContacto,
  existing?: Pick<McCarritoIniciado, 'createdAt' | 'cuponCodigo' | 'descuentoPorcentaje' | 'recordatorioEnviadoAt'>,
) {
  const now = Date.now()
  const lineas = lineasToCarritoIniciado(lines)
  const base: McCarritoIniciado = {
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    estado: 'activo',
    lineas,
    subtotalCop: subtotalFromCarritoLineas(lineas),
    sessionToken,
    ...(existing?.cuponCodigo ? { cuponCodigo: existing.cuponCodigo } : {}),
    ...(existing?.descuentoPorcentaje != null ? { descuentoPorcentaje: existing.descuentoPorcentaje } : {}),
    ...(existing?.recordatorioEnviadoAt != null ? { recordatorioEnviadoAt: existing.recordatorioEnviadoAt } : {}),
  }
  if (contacto?.nombre?.trim()) base.clienteNombre = contacto.nombre.trim()
  if (contacto?.telefono?.trim()) base.clienteTelefono = contacto.telefono.trim()
  if (contacto?.email?.trim()) base.clienteEmail = contacto.email.trim()
  if (contacto?.envioCiudad?.trim()) base.envioCiudad = contacto.envioCiudad.trim()
  if (contacto?.envioDepartamento?.trim()) base.envioDepartamento = contacto.envioDepartamento.trim()
  if (contacto?.envioDireccion?.trim()) base.envioDireccion = contacto.envioDireccion.trim()
  return base
}

export function isCarritoPendiente(c: McCarritoIniciado): boolean {
  return c.estado === 'activo'
}

export function isCarritoRecuperado(c: McCarritoIniciado): boolean {
  return c.estado === 'recuperado'
}
