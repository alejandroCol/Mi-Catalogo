import clsx from 'clsx'
import { GUIDE_CATEGORIES, type GuideCategoryId } from '@/lib/tutorials/guideContent'

type Props = {
  active: GuideCategoryId
  onChange: (id: GuideCategoryId) => void
  videoCount?: number
}

export function GuideCategoryNav({ active, onChange, videoCount = 0 }: Props) {
  return (
    <nav
      className="rounded-2xl border border-neutral-200/80 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      aria-label="Menú de tutoriales"
    >
      <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GUIDE_CATEGORIES.map((cat) => {
          const isActive = active === cat.id
          const countLabel =
            cat.id === 'videos' && videoCount > 0 ? ` ${videoCount}` : ''
          return (
            <button
              key={cat.id}
              type="button"
              className={clsx(
                'shrink-0 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition',
                isActive
                  ? 'bg-mc-900 text-white shadow-sm'
                  : 'text-mc-600 hover:bg-neutral-100 hover:text-mc-900',
              )}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(cat.id)}
            >
              <span className="hidden sm:inline">
                {cat.label}
                {countLabel ? ` ·${countLabel}` : ''}
              </span>
              <span className="sm:hidden">
                {cat.shortLabel}
                {countLabel ? ` ·${countLabel}` : ''}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
