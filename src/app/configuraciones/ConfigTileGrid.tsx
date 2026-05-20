import { ConfigTile } from '@/app/configuraciones/ConfigTile'
import type { ConfigMenuItem } from '@/app/configuraciones/types'

type Props = {
  items: ConfigMenuItem[]
  hasExpertAccess: boolean
}

export function ConfigTileGrid({ items, hasExpertAccess }: Props) {
  return (
    <div className="mc-config-grid-shell">
      <div
        className="grid grid-cols-2 gap-2 auto-rows-min sm:gap-2.5"
        role="navigation"
        aria-label="Opciones de configuración"
      >
        {items.map((item) => (
          <ConfigTile key={item.id} item={item} hasExpertAccess={hasExpertAccess} />
        ))}
      </div>
    </div>
  )
}
