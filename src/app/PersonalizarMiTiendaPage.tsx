import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { PERSONALIZAR_SUBPAGE_NAV } from '@/app/configuraciones/configSubpageNav'
import { IconChevronRight, IconLogo, IconSwatches } from '@/icons/McIcons'

type PersonalizarTile = {
  id: string
  title: string
  description: string
  to: string
  icon: ReactNode
  size: 'hero' | 'normal'
}

const TILES: PersonalizarTile[] = [
  {
    id: 'banner',
    title: 'Banner de temporada',
    description: 'Pantalla completa al entrar al catálogo con tu campaña',
    to: '/app/cuenta/banner-temporada',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="8" r="1" fill="currentColor" />
      </svg>
    ),
    size: 'hero',
  },
  {
    id: 'logo',
    title: 'Logo de tienda',
    description: 'Tu marca junto al nombre en la cabecera',
    to: '/app/cuenta/logo',
    icon: <IconLogo size={20} />,
    size: 'normal',
  },
  {
    id: 'estilo',
    title: 'Estilo del catálogo',
    description: 'Plantilla, colores y vista previa en vivo',
    to: '/app/cuenta/estilo',
    icon: <IconSwatches size={20} />,
    size: 'normal',
  },
]

export function PersonalizarMiTiendaPage() {
  return (
    <div className="mc-shell mc-personalizar-page pb-6">
      <Link
        to="/app"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--cat-muted)] transition hover:opacity-70"
      >
        ← Inicio
      </Link>

      <div
        className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4"
        role="navigation"
        aria-label="Personalizar tienda"
      >
        {TILES.map((tile) => (
          <Link
            key={tile.id}
            to={tile.to}
            state={PERSONALIZAR_SUBPAGE_NAV}
            className={`mc-personalizar-tile group flex flex-col justify-between no-underline ${
              tile.size === 'hero' ? 'sm:col-span-2 min-h-[9rem]' : 'min-h-[7rem]'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="mc-personalizar-tile__icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--cat-text)]">
                {tile.icon}
              </span>
              <ExpertStar className="mt-0.5 shrink-0" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[16px] font-medium leading-snug tracking-tight text-[var(--cat-text)] sm:text-[17px]">
                  {tile.title}
                </p>
                <p className="ios-footnote mt-1 line-clamp-2 leading-relaxed text-[var(--cat-muted)]">
                  {tile.description}
                </p>
              </div>
              <IconChevronRight
                size={17}
                className="shrink-0 text-[var(--cat-muted)] opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
