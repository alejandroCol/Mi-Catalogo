import { useState } from 'react'
import clsx from 'clsx'
import { IconChevronRight } from '@/icons/McIcons'
import type { GuideFaqItem } from '@/lib/tutorials/guideContent'

type Props = {
  items: GuideFaqItem[]
}

export function GuideFaqList({ items }: Props) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null)

  return (
    <div className="space-y-2" role="list">
      {items.map((item) => {
        const open = openId === item.id
        return (
          <div
            key={item.id}
            className={clsx(
              'overflow-hidden rounded-2xl border bg-white transition',
              open
                ? 'border-neutral-300 shadow-[0_8px_28px_-22px_rgba(10,10,10,0.4)]'
                : 'border-neutral-200/80',
            )}
            role="listitem"
          >
            <button
              type="button"
              className="flex w-full items-start gap-3 px-4 py-4 text-left text-[15px] font-semibold leading-snug text-[var(--cat-text)] sm:px-5"
              aria-expanded={open}
              onClick={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
            >
              <span className="min-w-0 flex-1">{item.question}</span>
              <span
                className={clsx(
                  'mt-0.5 shrink-0 text-mc-400 transition',
                  open && 'rotate-90 text-mc-800',
                )}
                aria-hidden
              >
                <IconChevronRight size={18} />
              </span>
            </button>
            {open ? (
              <p className="border-t border-neutral-100 px-4 pb-4 pt-3 text-[15px] leading-relaxed text-[var(--cat-muted)] sm:px-5">
                {item.answer}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
