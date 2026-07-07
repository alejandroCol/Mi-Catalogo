import clsx from 'clsx'
import type { ReactNode } from 'react'

/** Iconografía propia del módulo POS — trazos finos, estilo Mi Catálogo. */
export type PosIconName =
  | 'home'
  | 'ventas'
  | 'caja'
  | 'movimientos'
  | 'inventario'
  | 'devoluciones'
  | 'cajas'
  | 'sedes'
  | 'vendedores'
  | 'reportes'
  | 'catalogo'
  | 'printer'
  | 'bridge'
  | 'barcode'
  | 'expert'
  | 'ventas-rapidas'
  | 'check'
  | 'ticket'
  | 'sync'
  | 'arrow-right'
  | 'chevron-down'
  | 'download'
  | 'cash-drawer'
  | 'multi-sede'

type PosIconProps = {
  name: PosIconName
  className?: string
  size?: number
}

const ICONS: Record<PosIconName, ReactNode> = {
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5h3V20H17a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  ventas: (
    <>
      <path d="M7 4h10l1 4H6l1-4Z" />
      <path d="M6 8h12v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8Z" />
      <path d="M9 12h6M9 15h4" />
    </>
  ),
  caja: (
    <>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M3 11h18" />
      <circle cx="12" cy="15" r="2.25" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
    </>
  ),
  movimientos: (
    <>
      <path d="M12 3v18" />
      <path d="M8 7l4-4 4 4" />
      <path d="M16 17l-4 4-4-4" />
      <path d="M5 12h3M16 12h3" />
    </>
  ),
  inventario: (
    <>
      <path d="M4 7.5 12 3l8 4.5L12 12 4 7.5Z" />
      <path d="M4 12v4.5L12 21l8-4.5V12" />
      <path d="M12 12v9" />
    </>
  ),
  devoluciones: (
    <>
      <path d="M6 8h11a3 3 0 0 1 0 6H9" />
      <path d="M9 11 6 8l3-3" />
      <path d="M18 16H7a3 3 0 0 1 0-6h8" />
      <path d="M15 13l3 3-3 3" />
    </>
  ),
  cajas: (
    <>
      <rect x="3" y="5" width="8" height="14" rx="1.5" />
      <rect x="13" y="8" width="8" height="11" rx="1.5" />
      <path d="M5 9h4M5 12h4M15 12h4M15 15h4" />
    </>
  ),
  sedes: (
    <>
      <path d="M4 10h16v10H4z" />
      <path d="M4 10 12 4l8 6" />
      <path d="M10 20v-6h4v6" />
      <circle cx="12" cy="11" r="1" />
    </>
  ),
  vendedores: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.25" />
      <path d="M14.5 20c.4-2.2 1.9-4 4.5-4" />
    </>
  ),
  reportes: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <rect x="7" y="12" width="3" height="7" rx="0.75" />
      <rect x="12" y="9" width="3" height="10" rx="0.75" />
      <rect x="17" y="6" width="3" height="13" rx="0.75" />
    </>
  ),
  catalogo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V5h10v4" />
      <rect x="5" y="9" width="14" height="8" rx="2" />
      <path d="M7 14h10v7H7z" />
      <path d="M9 12h1M14 12h1" />
    </>
  ),
  bridge: (
    <>
      <rect x="3" y="10" width="7" height="9" rx="1.5" />
      <rect x="14" y="6" width="7" height="13" rx="1.5" />
      <path d="M10 14.5h4M10 12h4" />
      <circle cx="6.5" cy="14" r="1" />
      <circle cx="17.5" cy="11" r="1" />
    </>
  ),
  barcode: (
    <>
      <path d="M4 6v12M7 6v12M9 6v12M11 6v12M14 6v12M16 6v12M19 6v12" />
      <path d="M3 18h18" />
    </>
  ),
  expert: (
    <>
      <path d="M12 3l2.2 6.8H21l-5.5 4 2.1 6.7L12 16.5 6.4 20.5l2.1-6.7L3 9.8h6.8L12 3Z" />
    </>
  ),
  'ventas-rapidas': (
    <>
      <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5 10.5 15 16 9.5" />
    </>
  ),
  ticket: (
    <>
      <path d="M5 6h14a1 1 0 0 1 1 1v2.2a2 2 0 0 0 0 3.6V15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.2a2 2 0 0 0 0-3.6V7a1 1 0 0 1 1-1Z" />
      <path d="M9 10h6M9 13h4" />
    </>
  ),
  sync: (
    <>
      <path d="M18 8A7 7 0 0 0 7.5 6.5L5 9" />
      <path d="M6 16a7 7 0 0 0 10.5 1.5L19 15" />
      <path d="M5 9v3h3M19 15v-3h-3" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  'cash-drawer': (
    <>
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M3 12h18" />
      <path d="M8 15h8" />
      <path d="M10 8V6h4v2" />
    </>
  ),
  'multi-sede': (
    <>
      <circle cx="6" cy="8" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <circle cx="12" cy="17" r="2.5" />
      <path d="M8 9.5 10.5 15M16 9.5 13.5 15M8.5 8h7" />
    </>
  ),
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 19h16" />
    </>
  ),
}

export function PosIcon({ name, className, size = 20 }: PosIconProps) {
  return (
    <svg
      className={clsx('mc-pos-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  )
}

type PosIconBoxProps = {
  name: PosIconName
  tone?: 'gold' | 'dark' | 'cream' | 'emerald'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const BOX_SIZE = { sm: 36, md: 44, lg: 52 } as const
const ICON_SIZE = { sm: 18, md: 22, lg: 26 } as const

export function PosIconBox({ name, tone = 'gold', size = 'md', className }: PosIconBoxProps) {
  return (
    <span
      className={clsx('mc-pos-icon-box', `mc-pos-icon-box--${tone}`, `mc-pos-icon-box--${size}`, className)}
      style={{ width: BOX_SIZE[size], height: BOX_SIZE[size] }}
      aria-hidden
    >
      <PosIcon name={name} size={ICON_SIZE[size]} />
    </span>
  )
}
