/** Validación compartida del checkout público (cliente + callable). */

export function emailCheckoutOk(raw: string): boolean {
  const s = raw.trim()
  return s.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export type CheckoutStepId = 'revisar' | 'datos' | 'envio'

export const CHECKOUT_STEPS: CheckoutStepId[] = ['revisar', 'datos', 'envio']

export function checkoutStepIndex(id: CheckoutStepId): number {
  return CHECKOUT_STEPS.indexOf(id)
}

export const CHECKOUT_STEP_META: Record<
  CheckoutStepId,
  { short: string; title: string; subtitle: string }
> = {
  revisar: {
    short: 'Revisar',
    title: 'Revisá tu pedido',
    subtitle: 'Confirmá los productos y aplicá un cupón si tenés uno.',
  },
  datos: {
    short: 'Datos',
    title: 'Tus datos',
    subtitle: 'Necesitamos tu contacto y documento para la factura y el seguimiento.',
  },
  envio: {
    short: 'Pago',
    title: 'Envío y pago',
    subtitle: 'Indicá dónde enviamos y confirmá el total antes de pagar.',
  },
}

export type CheckoutFields = {
  nombre: string
  telefono: string
  email: string
  clienteTipoDocumento: string
  clienteDocumentoNumero: string
  envioDepartamento: string
  envioCiudad: string
  envioDireccion: string
}

export function validateCheckoutStep(
  step: CheckoutStepId,
  fields: CheckoutFields,
  opts?: { preciosOk?: boolean; cuponInvalid?: boolean },
): string | null {
  if (step === 'revisar') {
    if (opts?.preciosOk === false) {
      return 'Todos los productos deben tener precio para comprar en línea.'
    }
    if (opts?.cuponInvalid) {
      return 'El cupón ya no está disponible. Quitá el cupón o probá otro código.'
    }
    return null
  }

  if (step === 'datos') {
    if (!fields.nombre.trim()) return 'Ingresá tu nombre.'
    if (!fields.telefono.trim()) return 'Ingresá tu teléfono.'
    if (!fields.email.trim()) return 'Ingresá tu correo electrónico.'
    if (!emailCheckoutOk(fields.email)) return 'Correo electrónico no válido.'
    if (!fields.clienteTipoDocumento.trim()) return 'Seleccioná el tipo de documento.'
    if (!fields.clienteDocumentoNumero.trim()) return 'Ingresá el número de documento.'
    if (fields.clienteDocumentoNumero.trim().length < 5) {
      return 'El número de documento debe tener al menos 5 caracteres.'
    }
    return null
  }

  if (step === 'envio') {
    if (!fields.envioDepartamento.trim()) return 'Seleccioná el departamento de envío.'
    if (!fields.envioCiudad.trim()) return 'Indicá la ciudad o municipio.'
    if (!fields.envioDireccion.trim()) return 'Ingresá la dirección de envío.'
    return null
  }

  return null
}

export function validateCheckoutAll(
  fields: CheckoutFields,
  opts?: { preciosOk?: boolean; cuponInvalid?: boolean },
): string | null {
  for (const step of CHECKOUT_STEPS) {
    const err = validateCheckoutStep(step, fields, opts)
    if (err) return err
  }
  return null
}
