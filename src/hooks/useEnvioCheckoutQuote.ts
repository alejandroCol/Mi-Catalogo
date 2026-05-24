import { useEffect, useMemo, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'
import { resolveEnvioCop, effectiveEnvioPricingForCheckout, type LineaEnvioCheckout } from '@/lib/checkoutShipping'
import { isEnvioCotizacionAutomaticaConfigured, type EnvioCotizacionOpcion } from '@/lib/envioCotizacion'
import type { McPlatformSettings, McTenant } from '@/types/mc'

export type EnvioCheckoutQuoteState = {
  envioCop: number
  lineaEnvio: LineaEnvioCheckout
  fuente: 'envia' | 'estatico'
  seleccionada: EnvioCotizacionOpcion | null
  loading: boolean
  error: string | null
}

type QuoteResponse = {
  ok: boolean
  envioCop: number
  fuente: 'envia' | 'estatico'
  lineaEnvio: LineaEnvioCheckout
  seleccionada: EnvioCotizacionOpcion | null
}

function staticEnvioState(
  tenant: McTenant | null | undefined,
  platformSettings: McPlatformSettings | null | undefined,
  envioCiudad: string,
  envioDepartamento: string,
  subtotalCop: number,
): Pick<EnvioCheckoutQuoteState, 'envioCop' | 'lineaEnvio' | 'fuente' | 'seleccionada'> {
  const pricing = effectiveEnvioPricingForCheckout(tenant ?? undefined, platformSettings ?? undefined)
  const { envioCop, lineaEnvio } = resolveEnvioCop(pricing, envioCiudad, subtotalCop, envioDepartamento)
  return { envioCop, lineaEnvio, fuente: 'estatico', seleccionada: null }
}

export function useEnvioCheckoutQuote(input: {
  slug: string | undefined
  tenant: McTenant | null | undefined
  platformSettings: McPlatformSettings | null | undefined
  envioDepartamento: string
  envioCiudad: string
  envioDireccion: string
  destinoNombre: string
  destinoTelefono: string
  subtotalCop: number
  totalPiezas: number
}): EnvioCheckoutQuoteState {
  const {
    slug,
    tenant,
    platformSettings,
    envioDepartamento,
    envioCiudad,
    envioDireccion,
    destinoNombre,
    destinoTelefono,
    subtotalCop,
    totalPiezas,
  } = input

  const autoQuote = isEnvioCotizacionAutomaticaConfigured(tenant ?? undefined)
  const destinoCompleto =
    autoQuote &&
    envioDepartamento.trim().length > 0 &&
    envioCiudad.trim().length > 0 &&
    envioDireccion.trim().length > 0

  const staticFallback = useMemo(
    () => staticEnvioState(tenant, platformSettings, envioCiudad, envioDepartamento, subtotalCop),
    [
      tenant,
      platformSettings,
      envioCiudad,
      envioDepartamento,
      subtotalCop,
      tenant?.envioEstimadoCop,
      tenant?.envioPorCiudad,
      tenant?.envioGratisDesdeCop,
      tenant?.envioUsarTarifasMicatalogo,
      platformSettings?.envioMicatalogoEstimadoCop,
      platformSettings?.envioMicatalogoPorCiudad,
    ],
  )

  const [dynamic, setDynamic] = useState<Pick<
    EnvioCheckoutQuoteState,
    'envioCop' | 'lineaEnvio' | 'fuente' | 'seleccionada'
  > | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    if (!autoQuote || !destinoCompleto || !slug) {
      setDynamic(null)
      setLoading(false)
      setError(null)
      return
    }

    const currentReq = ++reqId.current
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        setError(null)
        try {
          const fn = httpsCallable(getFirebaseFunctions(), 'mcQuoteEnvioCheckout')
          const res = await fn({
            slug,
            envioDepartamento: envioDepartamento.trim(),
            envioCiudad: envioCiudad.trim(),
            envioDireccion: envioDireccion.trim(),
            destinoNombre: destinoNombre.trim() || undefined,
            destinoTelefono: destinoTelefono.trim() || undefined,
            subtotalCop,
            totalPiezas,
          })
          if (currentReq !== reqId.current) return
          const data = res.data as QuoteResponse
          setDynamic({
            envioCop: data.envioCop,
            lineaEnvio: data.lineaEnvio,
            fuente: data.fuente,
            seleccionada: data.seleccionada,
          })
        } catch {
          if (currentReq !== reqId.current) return
          setDynamic(null)
          setError('No pudimos cotizar el envío. Usamos la tarifa configurada.')
        } finally {
          if (currentReq === reqId.current) setLoading(false)
        }
      })()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [
    autoQuote,
    destinoCompleto,
    slug,
    envioDepartamento,
    envioCiudad,
    envioDireccion,
    destinoNombre,
    destinoTelefono,
    subtotalCop,
    totalPiezas,
  ])

  if (!autoQuote) {
    return { ...staticFallback, loading: false, error: null }
  }

  if (!destinoCompleto) {
    return { ...staticFallback, loading: false, error: null }
  }

  if (loading && !dynamic) {
    return {
      envioCop: staticFallback.envioCop,
      lineaEnvio: staticFallback.lineaEnvio,
      fuente: 'estatico',
      seleccionada: null,
      loading: true,
      error: null,
    }
  }

  if (dynamic) {
    return { ...dynamic, loading, error }
  }

  return { ...staticFallback, loading: false, error }
}
