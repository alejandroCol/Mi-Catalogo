import { whatsappUrlFromNumber } from '@/catalog-local/buildWhatsappUrl'

/** WhatsApp de soporte / ventas de la plataforma (un solo origen de verdad). */
export const MC_SUPPORT_WHATSAPP_DIGITS = '573054411568'

/** Mensaje prellenado desde la landing al iniciar conversación. */
export const MC_SUPPORT_WHATSAPP_LANDING_MESSAGE =
  'Hola, me gustaria crear mi tienda en mi catalogo'

export function mcSupportWhatsappUrl(
  text: string = MC_SUPPORT_WHATSAPP_LANDING_MESSAGE,
): string {
  return whatsappUrlFromNumber(MC_SUPPORT_WHATSAPP_DIGITS, text) ?? `https://wa.me/${MC_SUPPORT_WHATSAPP_DIGITS}`
}
