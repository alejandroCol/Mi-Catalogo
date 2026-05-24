import type { ReactNode } from 'react'
import clsx from 'clsx'

type Props = {
  title?: string
  description?: string
  children: ReactNode
  className?: string
}

/** Agrupa campos del formulario de producto con fondo diferenciado. */
export function ProductoFormSection({ title, description, children, className }: Props) {
  return (
    <section
      className={clsx(
        'mc-producto-form-section rounded-xl border border-neutral-300/90 bg-neutral-100/80 p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      {title ? <p className="ios-footnote font-semibold text-mc-900">{title}</p> : null}
      {description ? <p className="mt-1 text-[12px] leading-relaxed text-mc-600">{description}</p> : null}
      <div className={title || description ? 'mt-3' : undefined}>{children}</div>
    </section>
  )
}
