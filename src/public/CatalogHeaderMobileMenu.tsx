import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { CatalogHeaderSectionItem } from '@/lib/catalogHeaderNav'

type Props = {
  items: CatalogHeaderSectionItem[]
  pathname: string
  onNavigate: () => void
}

export function CatalogHeaderMobileMenu({ items, pathname, onNavigate }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)')
    const onChange = () => {
      if (media.matches) setOpen(false)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <div ref={rootRef} className="relative sm:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--cat-text)] transition hover:bg-[color-mix(in_srgb,var(--cat-text)_6%,transparent)]"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú de la tienda'}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="relative flex h-4 w-4 flex-col justify-center" aria-hidden>
          <span
            className={clsx(
              'absolute left-0 h-px w-4 bg-current transition',
              open ? 'translate-y-0 rotate-45' : '-translate-y-[5px]',
            )}
          />
          <span
            className={clsx(
              'absolute left-0 h-px w-4 bg-current transition',
              open ? 'opacity-0' : 'opacity-100',
            )}
          />
          <span
            className={clsx(
              'absolute left-0 h-px w-4 bg-current transition',
              open ? 'translate-y-0 -rotate-45' : 'translate-y-[5px]',
            )}
          />
        </span>
      </button>

      {open ? (
        <nav
          id={menuId}
          className="absolute left-0 top-full z-50 mt-1 min-w-[13.5rem] rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] bg-[var(--cat-surface)] p-1.5 shadow-[0_16px_40px_-16px_color-mix(in_srgb,var(--cat-text)_28%,transparent)]"
          aria-label="Secciones de la tienda"
        >
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={clsx(
                'flex items-center rounded-xl px-3 py-2.5 text-[12px] font-medium uppercase tracking-[0.14em] transition',
                item.active
                  ? 'bg-[color-mix(in_srgb,var(--cat-text)_7%,transparent)] text-[var(--cat-text)]'
                  : 'text-[var(--cat-muted)] hover:bg-[color-mix(in_srgb,var(--cat-text)_5%,transparent)] hover:text-[var(--cat-text)]',
              )}
              onClick={() => {
                setOpen(false)
                onNavigate()
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  )
}
