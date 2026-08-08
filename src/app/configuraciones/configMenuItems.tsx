import {
  IconBankCard,
  IconChartBars,
  IconLink,
  IconLogo,
  IconNetwork,
  IconPerson,
  IconPlayCircle,
  IconShipping,
  IconSwatches,
  IconWhatsApp,
} from '@/icons/McIcons'
import { PAGOS_PASARELA_RETURN_FROM_CUENTA } from '@/app/configuraciones/configSubpageNav'
import type { ConfigMenuItem } from '@/app/configuraciones/types'
import type { McTenant } from '@/types/mc'
import { hasAddiFeatureAccess } from '@/lib/addiAccess'
import { isCatalogPubliclyAccessible } from '@/lib/catalogPublish'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { formatStorePublicUrlLabel } from '@/lib/storePublicUrl'

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
      hint: isCatalogPubliclyAccessible(tenant)
        ? 'Publicada'
        : catalogoListo
          ? 'Lista para publicar con Expert'
          : 'Completá checkout para publicar',
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
    ...(hasAddiFeatureAccess(tenant)
      ? [
          {
            id: 'pagos-addi',
            title: 'Addi · Cuotas',
            description: 'Paga a cuotas sin tarjeta',
            to: '/app/pagos-addi',
            size: 'normal' as const,
            icon: <IconBankCard size={20} />,
            hint: tenant.addiPaymentsEnabled
              ? 'Activo en checkout'
              : tenant.addiAllySlug
                ? 'Credenciales guardadas'
                : 'Master',
          } satisfies ConfigMenuItem,
        ]
      : []),
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
      id: 'proveedores',
      title: 'Proveedores',
      description: 'Marketplace y dropship local',
      to: '/app/proveedores',
      size: 'wide',
      icon: <IconNetwork size={20} />,
      hint: tenant.esProveedorActivo ? 'También sos proveedor' : 'Importá sin stock',
    },
    {
      id: 'estilo',
      title: 'Estilo del catálogo',
      description: 'Plantilla y colores',
      to: '/app/cuenta/estilo',
      size: 'normal',
      icon: <IconSwatches size={20} />,
    },
    {
      id: 'fuentes',
      title: 'Tipografía',
      description: 'Fuente de la tienda, banner o barra de anuncio',
      to: '/app/cuenta/fuentes',
      size: 'normal',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M4 7.5V5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75V7.5M9 20h6M12 4v16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M7.5 10h9M7.5 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'logo',
      title: 'Logo',
      to: '/app/cuenta/logo',
      size: 'compact',
      icon: <IconLogo size={18} />,
    },
    {
      id: 'banner',
      title: 'Banner temporada',
      to: '/app/cuenta/banner-temporada',
      size: 'compact',
    },
    {
      id: 'barra-anuncio',
      title: 'Barra anuncio',
      to: '/app/cuenta/barra-anuncio',
      size: 'compact',
    },
    {
      id: 'cabecera',
      title: 'Cabecera',
      to: '/app/cuenta/cabecera',
      size: 'compact',
    },
    {
      id: 'carritos',
      title: 'Carritos abandonados',
      to: '/app/cuenta/carritos-abandonados',
      size: 'wide',
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
      linkState: PAGOS_PASARELA_RETURN_FROM_CUENTA,
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
      id: 'resenas',
      title: 'Reseñas',
      description: 'Opiniones del catálogo',
      to: '/app/cuenta/resenas',
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
      id: 'identidad-tienda',
      title: 'Nombre y dominio',
      description: 'Nombre visible y enlace',
      to: '/app/cuenta/identidad-tienda',
      size: 'compact',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden>
          <path
            d="M4 7.5h16M4 12h10M4 16.5h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M16.5 10.5 19 12l-2.5 1.5V10.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
      hint: formatStorePublicUrlLabel(tenant.slug),
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
