import type { EnvioModo } from '@/lib/envioModo'

export type EnvioModoDisplay = {
  id: EnvioModo
  href: string
  title: string
  summary: string
  highlights: string[]
  recommended?: boolean
}

export const ENVIO_MODOS: EnvioModoDisplay[] = [
  {
    id: 'automatico',
    href: '/app/cuenta/envio/automatico',
    title: 'Cotizar automáticamente',
    summary: 'Tarifas reales por transportadora según origen, destino y empaque.',
    highlights: [
      'El checkout muestra el costo según la ciudad del cliente.',
      'Podés elegir transportadora preferida o la más barata.',
      'Ideal para empezar rápido con tarifas actualizadas.',
    ],
    recommended: true,
  },
  {
    id: 'manual',
    href: '/app/cuenta/envio/manual',
    title: 'Precios manualmente',
    summary: 'Definí un monto fijo de envío por ciudad en tu catálogo.',
    highlights: [
      'Control total del precio que ve cada cliente.',
      'Agregá tantas ciudades como necesites.',
      'Útil si ya tenés tarifas propias por zona.',
    ],
  },
]
