import {
  IconBankCard,
  IconChartBars,
  IconLink,
  IconLogo,
  IconPerson,
  IconPlayCircle,
  IconShipping,
  IconSwatches,
  IconWhatsApp,
} from '@/icons/McIcons'
import type { ConfigMenuItem } from '@/app/configuraciones/types'
import type { McTenant } from '@/types/mc'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'

export type ConfigMenuContext = {
  tenant: McTenant
  cuponesCount: number
  catalogoListo: boolean
}

export function buildConfigMenuItems(ctx: ConfigMenuContext): ConfigMenuItem[] {
  const { tenant, cuponesCount, catalogoListo } = ctx
  const checkoutModo = explicitCheckoutVentasModo(tenant)
  const checkoutHint =
    checkoutModo === null
      ? 'Pendiente: elegí cómo cobrás'
      : checkoutModo === 'whatsapp'
        ? 'WhatsApp'
        : checkoutModo === 'pasarela'
          ? 'Tu pasarela OnePay'
          : 'Pasarela Mi Catálogo'

  return [
    {
      id: 'tienda',
      title: 'Tienda y catálogo',
      description: tenant.nombreTienda,
      to: '/app/cuenta/tienda',
      size: 'large',
      icon: <IconLink size={20} />,
      hint: catalogoListo ? 'Listo para compartir' : 'Completá checkout para publicar',
    },
    {
      id: 'checkout-ventas',
      title: 'Método de pago',
      description: 'Pasarela, Mi Catálogo o WhatsApp',
      to: '/app/cuenta/checkout-ventas',
      size: 'wide',
      icon: <IconBankCard size={20} />,
      hint: checkoutHint,
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      description: 'Número y mensaje de pedidos',
      to: '/app/cuenta/whatsapp',
      size: 'normal',
      icon: <IconWhatsApp size={20} />,
    },
    {
      id: 'envio',
      title: 'Envíos',
      description: 'Tarifas por ciudad',
      to: '/app/cuenta/envio',
      size: 'normal',
      icon: <IconShipping size={20} />,
    },
    {
      id: 'estilo',
      title: 'Estilo del catálogo',
      description: 'Plantilla y colores',
      to: '/app/cuenta/estilo',
      size: 'normal',
      expert: true,
      expertGateOnSave: true,
      icon: <IconSwatches size={20} />,
    },
    {
      id: 'logo',
      title: 'Logo',
      to: '/app/cuenta/logo',
      size: 'compact',
      expert: true,
      expertGateOnSave: true,
      icon: <IconLogo size={18} />,
    },
    {
      id: 'banner',
      title: 'Banner temporada',
      to: '/app/cuenta/banner-temporada',
      size: 'compact',
      expert: true,
      expertGateOnSave: true,
    },
    {
      id: 'carritos',
      title: 'Carritos abandonados',
      to: '/app/cuenta/carritos-abandonados',
      size: 'wide',
      expert: true,
      icon: <IconChartBars size={20} />,
    },
    {
      id: 'cupones',
      title: 'Cupones',
      description: 'Descuentos en checkout',
      to: '/app/cuenta/cupones',
      size: 'normal',
      hint: cuponesCount > 0 ? `${cuponesCount} activo(s)` : undefined,
    },
    {
      id: 'pasarela',
      title: 'Pasarela OnePay',
      description: 'Clave API y webhook',
      to: '/app/pagos-pasarela',
      size: 'normal',
      icon: <IconBankCard size={20} />,
    },
    {
      id: 'politicas',
      title: 'Políticas',
      description: 'Cambios y devoluciones',
      to: '/app/cuenta/politicas',
      size: 'normal',
    },
    {
      id: 'resumen',
      title: 'Resumen ventas',
      description: 'Período en el inicio',
      to: '/app/cuenta/resumen-ventas',
      size: 'compact',
      icon: <IconChartBars size={18} />,
    },
    {
      id: 'tutoriales',
      title: 'Tutoriales',
      description: 'Videos paso a paso',
      to: '/app/cuenta/tutoriales',
      size: 'wide',
      icon: <IconPlayCircle size={20} />,
    },
    {
      id: 'perfil',
      title: 'Tu perfil',
      description: 'Nombre en el panel',
      to: '/app/cuenta/perfil',
      size: 'compact',
      icon: <IconPerson size={18} />,
    },
  ]
}
