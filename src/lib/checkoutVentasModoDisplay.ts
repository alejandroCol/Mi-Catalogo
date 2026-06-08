import type { McCheckoutVentasModo } from '@/lib/checkoutVentasModo'

export type CheckoutVentasModoDisplay = {
  id: McCheckoutVentasModo
  title: string
  shortLabel: string
  summary: string
  highlights: string[]
  paymentMethods?: string[]
}

export const CHECKOUT_VENTAS_MODOS: CheckoutVentasModoDisplay[] = [
  {
    id: 'pasarela_micatalogo',
    title: 'Pasarela sin registro OnePay',
    shortLabel: 'Pasarela Mi Catálogo',
    summary: 'Cobrá en línea sin crear una cuenta comercio OnePay propia.',
    highlights: [
      'El cliente paga en el checkout con la pasarela de Mi Catálogo.',
      'Retirás tus fondos cuando quieras desde Ventas.',
      'Al retirar se descuenta 0,02% + $900 COP si no tenés comercio OnePay propio.',
    ],
    paymentMethods: ['Bre-B', 'Nequi', 'Tarjeta', 'PSE'],
  },
  {
    id: 'pasarela',
    title: 'Pasarela (OnePay)',
    shortLabel: 'Tu pasarela OnePay',
    summary: 'El cliente paga en línea en el checkout con tu cuenta comercio OnePay.',
    highlights: [
      'Recibís pagos directo en tu cuenta OnePay.',
      'Requiere registrar tu empresa y que el equipo vincule la pasarela a tu tienda.',
      'Ideal si ya tenés o querés crear tu comercio en OnePay.',
    ],
    paymentMethods: ['Tarjeta', 'Nequi', 'PSE', 'Daviplata', 'Bre-B'],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    shortLabel: 'WhatsApp',
    summary: 'Coordinás pago y entrega por chat; el checkout no muestra cobro con tarjeta.',
    highlights: [
      'En el checkout el cliente ve el botón «Pedir por WhatsApp».',
      'Se arma un mensaje con el pedido, envío y totales.',
      'Al tocarlo, se abre WhatsApp para continuar la venta contigo.',
    ],
  },
]

export function checkoutVentasModoDisplay(modo: McCheckoutVentasModo): CheckoutVentasModoDisplay {
  return CHECKOUT_VENTAS_MODOS.find((m) => m.id === modo)!
}
