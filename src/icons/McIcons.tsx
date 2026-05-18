import type { ReactNode } from 'react'

/**
 * Iconos propios Mi Catálogo — trazo tipo SF Symbols, sin fuentes de iconos externas.
 */
export type McIconProps = {
  size?: number
  className?: string
}

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
