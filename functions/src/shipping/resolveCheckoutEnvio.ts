import { mergeTenantPlatformEnvio, resolveEnvioCopForCheckout } from '../checkoutShipping.js'
import {
  buildEnviaAddress,
  quoteEnviaCarriersParallel,
  selectEnvioQuoteOption,
  type EnviaPackage,
  type EnviaQuoteOption,
} from './enviaClient.js'

const QUOTE_CACHE_TTL_MS = 10 * 60 * 1000
const quoteCache = new Map<string, { expiresAt: number; opciones: EnviaQuoteOption[] }>()

export type TenantEnvioCotizacionSlice = {
  nombreTienda?: string
  envioCotizarAutomatico?: boolean
  envioOrigenDepartamento?: string
  envioOrigenCiudad?: string
  envioOrigenDireccion?: string
  envioOrigenTelefono?: string
  envioEmpaquePesoKg?: number
  envioEmpaqueLargoCm?: number
  envioEmpaqueAnchoCm?: number
  envioEmpaqueAltoCm?: number
  envioTransportadoraFavorita?: string
  envioEstimadoCop?: number
  envioPorCiudad?: { ciudad?: string; cop?: number; departamento?: string }[]
  envioGratisDesdeCop?: number
  envioUsarTarifasMicatalogo?: boolean
}

export type PlatformEnvioSlice = {
  envioMicatalogoEstimadoCop?: number
  envioMicatalogoPorCiudad?: { ciudad?: string; cop?: number; departamento?: string }[]
}

export type ResolveCheckoutEnvioInput = {
  tenant: TenantEnvioCotizacionSlice
  platform?: PlatformEnvioSlice
  enviaToken?: string | null
  destinoDepartamento: string
  destinoCiudad: string
  destinoDireccion: string
  destinoNombre?: string
  destinoTelefono?: string
  subtotalCop: number
  totalPiezas: number
}

export type CheckoutEnvioResolution = {
  envioCop: number
  fuente: 'envia' | 'estatico'
  seleccionada?: EnviaQuoteOption
  opciones?: EnviaQuoteOption[]
}

const EMPAQUE_DEFAULT = { pesoKg: 1, largoCm: 25, anchoCm: 20, altoCm: 10 }

function isAutoQuoteConfigured(tenant: TenantEnvioCotizacionSlice): boolean {
  if (tenant.envioCotizarAutomatico !== true) return false
  if (!tenant.envioOrigenDepartamento?.trim()) return false
  if (!tenant.envioOrigenCiudad?.trim()) return false
  if (!tenant.envioOrigenDireccion?.trim()) return false
  if (!tenant.envioOrigenTelefono?.replace(/\D/g, '')) return false
  const peso = tenant.envioEmpaquePesoKg
  const largo = tenant.envioEmpaqueLargoCm
  const ancho = tenant.envioEmpaqueAnchoCm
  const alto = tenant.envioEmpaqueAltoCm
  return (
    typeof peso === 'number' &&
    peso > 0 &&
    typeof largo === 'number' &&
    largo > 0 &&
    typeof ancho === 'number' &&
    ancho > 0 &&
    typeof alto === 'number' &&
    alto > 0
  )
}

function empaqueFromTenant(tenant: TenantEnvioCotizacionSlice): EnviaPackage {
  const pesoKg = Math.min(
    30,
    Math.max(
      0.1,
      typeof tenant.envioEmpaquePesoKg === 'number' && tenant.envioEmpaquePesoKg > 0
        ? tenant.envioEmpaquePesoKg
        : EMPAQUE_DEFAULT.pesoKg,
    ),
  )
  const largo =
    typeof tenant.envioEmpaqueLargoCm === 'number' && tenant.envioEmpaqueLargoCm > 0
      ? tenant.envioEmpaqueLargoCm
      : EMPAQUE_DEFAULT.largoCm
  const ancho =
    typeof tenant.envioEmpaqueAnchoCm === 'number' && tenant.envioEmpaqueAnchoCm > 0
      ? tenant.envioEmpaqueAnchoCm
      : EMPAQUE_DEFAULT.anchoCm
  const alto =
    typeof tenant.envioEmpaqueAltoCm === 'number' && tenant.envioEmpaqueAltoCm > 0
      ? tenant.envioEmpaqueAltoCm
      : EMPAQUE_DEFAULT.altoCm
  return {
    type: 'box',
    content: 'Pedido catálogo',
    amount: 1,
    declaredValue: 0,
    lengthUnit: 'CM',
    weightUnit: 'KG',
    weight: pesoKg,
    dimensions: { length: largo, width: ancho, height: alto },
  }
}

function staticEnvioCop(input: ResolveCheckoutEnvioInput): number {
  const merged = mergeTenantPlatformEnvio(input.tenant, input.platform)
  return resolveEnvioCopForCheckout(
    merged,
    input.destinoCiudad,
    input.subtotalCop,
    input.destinoDepartamento,
  )
}

function freeShippingApplied(tenant: TenantEnvioCotizacionSlice, subtotalCop: number): boolean {
  const umbral =
    typeof tenant.envioGratisDesdeCop === 'number' && Number.isFinite(tenant.envioGratisDesdeCop)
      ? Math.max(0, Math.round(tenant.envioGratisDesdeCop))
      : 0
  return umbral > 0 && Math.max(0, Math.round(subtotalCop)) >= umbral
}

function cacheKey(input: ResolveCheckoutEnvioInput, pkg: EnviaPackage): string {
  const t = input.tenant
  return [
    t.envioOrigenDepartamento,
    t.envioOrigenCiudad,
    input.destinoDepartamento,
    input.destinoCiudad,
    pkg.weight,
    pkg.dimensions.length,
    pkg.dimensions.width,
    pkg.dimensions.height,
  ]
    .map((x) => String(x ?? '').trim().toLowerCase())
    .join('|')
}

export async function resolveCheckoutEnvioCop(
  input: ResolveCheckoutEnvioInput,
): Promise<CheckoutEnvioResolution> {
  if (freeShippingApplied(input.tenant, input.subtotalCop)) {
    return { envioCop: 0, fuente: 'estatico' }
  }

  const canQuote =
    isAutoQuoteConfigured(input.tenant) &&
    Boolean(input.enviaToken?.trim()) &&
    input.destinoDepartamento.trim() &&
    input.destinoCiudad.trim() &&
    input.destinoDireccion.trim()

  if (!canQuote) {
    return { envioCop: staticEnvioCop(input), fuente: 'estatico' }
  }

  const origin = buildEnviaAddress({
    name: input.tenant.nombreTienda ?? 'Tienda',
    phone: input.tenant.envioOrigenTelefono ?? '',
    street: input.tenant.envioOrigenDireccion ?? '',
    departamento: input.tenant.envioOrigenDepartamento ?? '',
    ciudad: input.tenant.envioOrigenCiudad ?? '',
  })
  const destination = buildEnviaAddress({
    name: input.destinoNombre?.trim() || 'Cliente',
    phone: (input.destinoTelefono?.trim() || input.tenant.envioOrigenTelefono) ?? '3000000000',
    street: input.destinoDireccion,
    departamento: input.destinoDepartamento,
    ciudad: input.destinoCiudad,
  })

  if (!origin || !destination) {
    return { envioCop: staticEnvioCop(input), fuente: 'estatico' }
  }

  const packages = [
    {
      ...empaqueFromTenant(input.tenant),
      declaredValue: Math.max(0, Math.round(input.subtotalCop)),
    },
  ]

  const key = cacheKey(input, packages[0])
  const now = Date.now()
  const cached = quoteCache.get(key)
  let opciones: EnviaQuoteOption[]
  if (cached && cached.expiresAt > now) {
    opciones = cached.opciones
  } else {
    opciones = await quoteEnviaCarriersParallel(input.enviaToken!.trim(), {
      origin,
      destination,
      packages,
    })
    if (opciones.length > 0) {
      quoteCache.set(key, { expiresAt: now + QUOTE_CACHE_TTL_MS, opciones })
    }
  }

  if (opciones.length === 0) {
    return { envioCop: staticEnvioCop(input), fuente: 'estatico' }
  }

  const seleccionada =
    selectEnvioQuoteOption(opciones, input.tenant.envioTransportadoraFavorita) ?? opciones[0]
  return {
    envioCop: seleccionada.totalPriceCop,
    fuente: 'envia',
    seleccionada,
    opciones,
  }
}
