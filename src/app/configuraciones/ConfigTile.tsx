import { Link } from 'react-router-dom'
import { resolveConfigTileHref } from '@/app/configuraciones/resolveConfigTileHref'
import type { ConfigMenuItem } from '@/app/configuraciones/types'

const SIZE_CLASS: Record<ConfigMenuItem['size'], string> = {
  large: 'col-span-2 row-span-2 min-h-[9.5rem] sm:min-h-[10.5rem]',
  wide: 'col-span-2 min-h-[5.25rem]',
  normal: 'col-span-1 min-h-[5.75rem]',
  compact: 'col-span-1 min-h-[4.75rem]',
}

type Props = {
  item: ConfigMenuItem
  hasExpertAccess: boolean
}

export function ConfigTile({ item, hasExpertAccess }: Props) {
  const href = resolveConfigTileHref(item, hasExpertAccess)

  return (
    <Link
      to={href}
      state={item.linkState}
      data-size={item.size}
      className={`mc-config-tile group flex flex-col justify-between p-3.5 text-left no-underline active:scale-[0.99] sm:p-4 ${SIZE_CLASS[item.size]}`}
    >
      <div className="flex items-start justify-between gap-2">
        {item.icon ? (
          <span className="mc-config-tile__icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200/50 text-[var(--cat-text)]">
            {item.icon}
          </span>
        ) : (
          <span className="sr-only">{item.title}</span>
        )}
      </div>
      <div className="mt-auto pt-2">
        <p className="text-[15px] font-medium leading-snug text-[var(--cat-text)] sm:text-[16px]">{item.title}</p>
        {item.description ? (
          <p className="ios-footnote mt-1 line-clamp-2 leading-relaxed text-[var(--cat-muted)]">{item.description}</p>
        ) : null}
        {item.hint ? (
          <p className="ios-footnote mt-1 font-medium text-[var(--cat-muted)]">{item.hint}</p>
        ) : null}
      </div>
    </Link>
  )
}
