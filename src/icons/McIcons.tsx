import type { ReactNode } from 'react'

/**
 * Iconos propios Mi Catálogo — trazo tipo SF Symbols, sin fuentes de iconos externas.
 */
export type McIconProps = {
  size?: number
  className?: string
}

export type IconWhatsAppProps = McIconProps & {
  /** Blanco vía currentColor (FAB, botones de acento). Default: verde marca #25D366. */
  monochrome?: boolean
}

/** Verde oficial WhatsApp (Simple Icons / brand). */
export const WHATSAPP_BRAND_GREEN = '#25D366'

/** Path oficial WhatsApp (Simple Icons, viewBox 0 0 24 24). */
const WHATSAPP_LOGO_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'

const stroke = 1.5

function Svg({ size, className, children }: McIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Inicio / tienda */
export function IconHome({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M3 10.5 12 4l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-7H9v7H4.5A1.5 1.5 0 0 1 3 20v-9.5Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Catálogo con fotos: marcos apilados + paisaje */
export function IconPhotoStack({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M14.25 4.25h6.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-6.5a1.5 1.5 0 0 1-1.5-1.5V5.75a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M3.25 6.75h11.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.25a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <circle cx="12.5" cy="11.25" r="1.6" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="m6.25 18.25 3.2-4.1 2.6 2.4 4.1-4.6 3.55 6.3H6.25Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Estilo del catálogo: plantilla y paleta de colores */
export function IconSwatches({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M5 8.5h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M9 4.5h10a2 2 0 0 1 2 2v9"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <circle cx="8" cy="13" r="1.35" fill="currentColor" />
      <circle cx="11.5" cy="15.5" r="1.35" fill="currentColor" />
      <circle cx="8" cy="18" r="1.35" fill="currentColor" />
    </Svg>
  )
}

/** Logo / marca de la tienda */
export function IconLogo({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="3.5"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <path
        d="M8.5 15.5V9.5l3.5 3.5 3.5-3.5v6"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Personalizar tienda: varita mágica con destellos */
export function IconMagicBrush({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M6.25 18.75 15.75 9.25"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
      />
      <path
        d="M15.75 9.25 17.25 7.75"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
      />
      <path
        d="M17.25 5.15 17.55 6.35 18.75 6.55 17.85 7.35 18.05 8.55 17.25 7.95 16.45 8.55 16.65 7.35 15.75 6.55 16.95 6.35Z"
        fill="currentColor"
      />
      <path
        d="M19.75 4.5v2.25M18.65 5.65h2.2"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
      />
      <path
        d="M12.15 5.35v1.35M11.5 6.05h1.3"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.6}
      />
      <circle cx="19.1" cy="9.15" r="0.65" fill="currentColor" opacity={0.5} />
    </Svg>
  )
}

/** Envíos: paquete con cinta */
export function IconShipping({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M12 3.5 19.5 7.5v9L12 20.5 4.5 16.5v-9L12 3.5Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path d="M12 3.5v17M12 12 19.5 7.5M12 12 4.5 7.5" stroke="currentColor" strokeWidth={stroke} />
      <path d="M9.25 10.5h5.5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  )
}

/** WhatsApp — logo oficial (Simple Icons). Verde marca por defecto. */
export function IconWhatsApp({ size, className, monochrome }: IconWhatsAppProps) {
  return (
    <svg
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path fill={monochrome ? 'currentColor' : WHATSAPP_BRAND_GREEN} d={WHATSAPP_LOGO_PATH} />
    </svg>
  )
}

/** Perfil / usuario */
export function IconPerson({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="M5.5 19.5c0-3.31 2.91-6 6.5-6s6.5 2.69 6.5 6"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  )
}

/** Inventario / caja */
export function IconCube({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="m12 2.5 8 4.5v10l-8 4.5-8-4.5V7l8-4.5Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path d="M12 12 20 7.5M12 12v10M12 12 4 7.5" stroke="currentColor" strokeWidth={stroke} />
    </Svg>
  )
}

/** Pedidos / lista */
export function IconClipboard({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M9 2h6v3H9V2Zm-3 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path d="M8 11h8M8 15h8M8 19h5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  )
}

/** Engranaje (genérico) */
export function IconGear({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  )
}

/** Configuración / ajustes */
export function IconSliders({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 7.5h16M4 12h16M4 16.5h16" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <circle cx="15" cy="7.5" r="2" stroke="currentColor" strokeWidth={stroke} />
      <circle cx="9" cy="12" r="2" stroke="currentColor" strokeWidth={stroke} />
      <circle cx="14" cy="16.5" r="2" stroke="currentColor" strokeWidth={stroke} />
    </Svg>
  )
}

export function IconPlus({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  )
}

export function IconMinus({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 12h14" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  )
}

export function IconPlusCircle({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={stroke} />
      <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  )
}

/** Tarjeta / pasarela de pagos */
export function IconBankCard({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <rect
        x="3.25"
        y="5.5"
        width="17.5"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <path d="M3.25 10.25h17.5" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="M7 15.75h4.5M14.75 15.75h2.25"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  )
}

/** Carrito catálogo público */
export function IconCart({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M6 9h15l-1.5 9H7.5L6 9Zm0 0 1-3h4"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.25" fill="currentColor" />
      <circle cx="18" cy="20" r="1.25" fill="currentColor" />
    </Svg>
  )
}

/** Volver (chevron iOS) */
export function IconChevronLeft({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Ventas / dinero (monedas apiladas) */
export function IconCoins({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={stroke} fill="none" />
      <path
        d="M5.5 17.5c0-2.2 2.6-4 6.5-4s6.5 1.8 6.5 4v.5H5.5v-.5Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Calendario / período */
export function IconCalendar({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M7.5 4v2M16.5 4v2M4.5 9.5h15M6 5.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Panel / resumen (barras tipo gráfico) */
export function IconChartBars({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 20V10M12 20V4M19 20v-8" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  )
}

/** POS / caja: terminal de cobro */
export function IconPosTerminal({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <rect
        x="5.25"
        y="3.5"
        width="13.5"
        height="11.5"
        rx="2"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <path d="M8 7h8M8 10h5.5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <path
        d="M7.5 15v1.75A2.75 2.75 0 0 0 10.25 19.5h3.5A2.75 2.75 0 0 0 16.5 16.75V15"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path d="M10 17.25h4" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  )
}

/** Buscar */
export function IconMagnifier({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth={stroke} />
      <path d="M15 15 20 20" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  )
}

export function IconChevronRight({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M9 6 15 12l-6 6"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Enlace / compartir catálogo */
export function IconLink({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  )
}

/** Video / tutoriales (círculo con play) */
export function IconPlayCircle({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="M10.25 8.75v6.5l5.5-3.25-5.5-3.25Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={0.5}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Eliminar */
export function IconTrash({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M5.5 7h13M9 7V5.5h6V7M8 7v10.5h8V7"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Check / confirmación */
export function IconCheck({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M5.5 12.5 9.5 16.5 18.5 7.5"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Capacitación / formación */
export function IconGraduationCap({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M6 11.25V15c0 1.2 2.7 2.25 6 2.25s6-1.05 6-2.25v-3.75"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path d="M19.5 10v4.5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
    </Svg>
  )
}

/** Live / transmisión en vivo */
export function IconLive({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="3.25" fill="currentColor" />
      <path
        d="M12 4.5v1.5M12 18v1.5M4.5 12H3M21 12h-1.5M6.1 6.1l1.06 1.06M16.84 16.84l1.06 1.06M6.1 17.9l1.06-1.06M16.84 7.16l1.06-1.06"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <rect
        x="5.5"
        y="7.5"
        width="13"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth={stroke}
      />
    </Svg>
  )
}

/** Celular / transmisión desde navegador */
export function IconSmartphone({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <rect
        x="7.5"
        y="3.5"
        width="9"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      <path d="M10.5 6h3" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
      <circle cx="12" cy="17.5" r="0.75" fill="currentColor" />
    </Svg>
  )
}

/** Red de proveedores / marketplace */
export function IconNetwork({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="6.5" cy="7" r="2.25" stroke="currentColor" strokeWidth={stroke} />
      <circle cx="17.5" cy="6.5" r="2.25" stroke="currentColor" strokeWidth={stroke} />
      <circle cx="12" cy="17.5" r="2.5" stroke="currentColor" strokeWidth={stroke} />
      <path
        d="M8.4 8.4 10.6 15.2M15.6 8.2 13.4 15.1M8.7 6.6h6.2"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  )
}

/** Caja / bodega proveedor */
export function IconWarehouse({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M3.5 10.5 12 4.5l8.5 6V19.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M9 20.5v-6h6v6"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/** Cámara / OBS / RTMP externo */
export function IconVideoCamera({ size, className }: McIconProps) {
  return (
    <Svg size={size} className={className}>
      <path
        d="M4.5 8.5h8.5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 15V10a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M14 11.5l5.5-3v9l-5.5-3v-3Z"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
    </Svg>
  )
}
