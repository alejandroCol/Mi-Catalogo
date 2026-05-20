import type { ReactNode } from 'react'

/** Tamaño visual del tile en la grilla bento (mobile-first, 2 columnas). */
export type ConfigTileSize = 'large' | 'wide' | 'normal' | 'compact'

export type ConfigMenuItem = {
  id: string
  title: string
  description?: string
  /** Ruta destino cuando el usuario tiene acceso (o no es Expert). */
  to: string
  size: ConfigTileSize
  /** Si true, sin plan Expert el tile lleva a /app/plan y muestra estrella. */
  expert?: boolean
  icon?: ReactNode
  /** Texto secundario (ej. contador de cupones). */
  hint?: string
}
