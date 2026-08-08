/** Credenciales BYOK de un comercio Addi (solo Admin SDK). */
export type AddiCredentialsStored = {
  clientId: string
  clientSecret: string
  allySlug: string
  /** Staging vs producción (Auth0 + API hosts). */
  sandbox?: boolean
  /** Basic auth para el callback de Addi. */
  callbackUser?: string
  callbackPassword?: string
  updatedAt?: unknown
}

export type AddiOnlineApplicationItem = {
  sku: string
  name: string
  quantity: string
  unitPrice: number
  tax: number
  pictureUrl?: string
  category?: string
  brand?: string
}

export type AddiAddress = {
  lineOne: string
  city: string
  country: 'CO'
}

export type AddiOnlineApplicationPayload = {
  orderId: string
  totalAmount: string
  shippingAmount: string
  totalTaxesAmount: string
  currency: 'COP'
  items: AddiOnlineApplicationItem[]
  client: {
    idType: string
    idNumber: string
    firstName: string
    lastName: string
    email: string
    cellphone: string
    cellphoneCountryCode: '+57'
    address: AddiAddress
  }
  shippingAddress: AddiAddress
  billingAddress: AddiAddress
  allyUrlRedirection: {
    logoUrl?: string
    callbackUrl: string
    redirectionUrl: string
    checkoutUrl?: string
  }
}

export type AddiCallbackBody = {
  orderId?: string
  status?: string
  applicationId?: string
}

export const ADDI_APPROVED_STATUSES = new Set(['APPROVED', 'COMPLETED'])
export const ADDI_REJECTED_STATUSES = new Set(['REJECTED', 'DECLINED', 'ABANDONED'])

/** Montos de referencia Colombia; el ally config puede acotar más. */
export const ADDI_DEFAULT_MIN_COP = 50_000
export const ADDI_DEFAULT_MAX_COP = 3_000_000
