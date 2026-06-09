import type { ReactNode } from 'react'
import type { ConfigSubpageNavState } from '@/app/configuraciones/configSubpageNav'

/** Tamaño visual del tile en la grilla bento (mobile-first, 2 columnas). */
export type ConfigTileSize = 'large' | 'wide' | 'normal' | 'compact'

export type ConfigMenuItem = {
  id: string
  title: string
  description?: string
  /** Ruta destino cuando el usuario tiene acceso (o no es Expert). */
  to: string
  size: ConfigTileSize
  /** Si true, muestra estrella Expert en el tile. */
  expert?: boolean
  /** Si true, el tile siempre abre la página; el plan Expert se valida al guardar. */
  expertGateOnSave?: boolean
  icon?: ReactNode
  /** Texto secundario (ej. contador de cupones). */
  hint?: string
  /** Estado de navegación para el botón atrás en la pantalla destino. */
  linkState?: ConfigSubpageNavState
}
