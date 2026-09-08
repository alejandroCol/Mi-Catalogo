import { explicitCheckoutVentasModo, type McCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { isEnvioSinEnvioActive } from '@/lib/envioSinEnvio'
import {
  CHECKOUT_FIELD_POLICY_ONLINE,
  CHECKOUT_FIELD_POLICY_WHATSAPP,
  CHECKOUT_STEP_META,
  CHECKOUT_STEPS,
  type CheckoutFieldPolicy,
  type CheckoutStepId,
} from '@/lib/checkoutValidation'
import type { McTenant } from '@/types/mc'

export type CheckoutCartPrimaryKind = 'online' | 'whatsapp'

export type CheckoutFlowProfile = {
  modo: McCheckoutVentasModo | null
  /** Pasos visibles en el indicador y la navegación. */
  uiSteps: readonly CheckoutStepId[]
  /** Pasos que se validan al enviar. */
  validationSteps: readonly CheckoutStepId[]
  fields: CheckoutFieldPolicy
  /** Un solo formulario: contacto + dirección (sin paso Revisar). */
  combineContactAndShipping: boolean
  /** Si es false, el pedido no pide ni cobra envío. */
  collectShippingAddress: boolean
  /** Link crudo a wa.me desde el carrito, sin pasar por el formulario. */
  showCartWhatsappShortcut: boolean
  cartPrimaryKind: CheckoutCartPrimaryKind
  cartPrimaryLabel: string
  cartNavLabel: string
  pageTitle: string
  pageSubtitle: string
  submitLabel: string
  stepMeta: Record<CheckoutStepId, { short: string; title: string; subtitle: string }>
}

const WHATSAPP_STEP_META: CheckoutFlowProfile['stepMeta'] = {
  ...CHECKOUT_STEP_META,
  datos: {
    short: 'Pedido',
    title: 'Tus datos y envío',
    subtitle: 'Solo lo necesario para armar el mensaje y coordinar con la tienda por WhatsApp.',
  },
}

const WHATSAPP_PROFILE: CheckoutFlowProfile = {
  modo: 'whatsapp',
  uiSteps: ['datos'],
  validationSteps: ['revisar', 'datos', 'envio'],
  fields: CHECKOUT_FIELD_POLICY_WHATSAPP,
  combineContactAndShipping: true,
  collectShippingAddress: true,
  showCartWhatsappShortcut: false,
  cartPrimaryKind: 'whatsapp',
  cartPrimaryLabel: 'Hacer pedido por WhatsApp',
  cartNavLabel: 'Pedir',
  pageTitle: 'Tu pedido',
  pageSubtitle:
    'Completá tus datos y la dirección. Te abrimos WhatsApp con el pedido listo para confirmar con la tienda.',
  submitLabel: 'Hacer pedido por WhatsApp',
  stepMeta: WHATSAPP_STEP_META,
}

const WHATSAPP_SIN_ENVIO_PROFILE: CheckoutFlowProfile = {
  ...WHATSAPP_PROFILE,
  collectShippingAddress: false,
  validationSteps: ['revisar', 'datos'],
  pageSubtitle: 'Completá tus datos. Te abrimos WhatsApp con el pedido listo para confirmar con la tienda.',
  stepMeta: {
    ...WHATSAPP_STEP_META,
    datos: {
      short: 'Pedido',
      title: 'Tus datos',
      subtitle: 'Solo lo necesario para armar el mensaje y coordinar con la tienda por WhatsApp.',
    },
  },
}

const ONLINE_PROFILE: CheckoutFlowProfile = {
  modo: null,
  uiSteps: CHECKOUT_STEPS,
  validationSteps: CHECKOUT_STEPS,
  fields: CHECKOUT_FIELD_POLICY_ONLINE,
  combineContactAndShipping: false,
  collectShippingAddress: true,
  showCartWhatsappShortcut: true,
  cartPrimaryKind: 'online',
  cartPrimaryLabel: 'Comprar en línea',
  cartNavLabel: 'Pagar',
  pageTitle: 'Checkout',
  pageSubtitle: '',
  submitLabel: '',
  stepMeta: CHECKOUT_STEP_META,
}

/**
 * Perfil de checkout según el método de cobro de la tienda.
 * Nuevos modos se agregan acá sin tocar el carrito ni validaciones sueltas (OCP).
 */
export function resolveCheckoutFlowProfile(
  tenant: Pick<McTenant, 'checkoutVentasModo' | 'envioSinEnvio'> | null | undefined,
): CheckoutFlowProfile {
  const modo = explicitCheckoutVentasModo(tenant)
  if (modo === 'whatsapp') {
    return isEnvioSinEnvioActive(tenant) ? WHATSAPP_SIN_ENVIO_PROFILE : WHATSAPP_PROFILE
  }
  return { ...ONLINE_PROFILE, modo }
}
