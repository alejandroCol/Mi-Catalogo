import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { PERSONALIZAR_SUBPAGE_NAV } from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import { hasShowroomFeatureAccess } from '@/lib/billingAccess'
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
    description: 'Foto o video en pantalla completa al entrar al catálogo',
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
    id: 'showroom',
    title: 'Drop Room + Pasillo',
    description: 'Colección inmersiva con cuenta regresiva y recorrido tipo boutique (Master)',
    to: '/app/cuenta/showroom',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M4 20V8.5L12 4l8 4.5V20"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M4 9.5h16" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      </svg>
    ),
    size: 'hero',
  },
  {
    id: 'barra-anuncio',
    title: 'Barra de anuncio',
    description: 'Franja arriba con envío gratis, promos o mensajes cortos',
    to: '/app/cuenta/barra-anuncio',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="3" y="4" width="18" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 5.75h3.5M12 5.75h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="3" y="10" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    size: 'normal',
  },
  {
    id: 'cabecera',
    title: 'Cabecera',
    description: 'Logo a la izquierda o marca centrada con secciones',
    to: '/app/cuenta/cabecera',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 7.5h3M14 7.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="7.5" r="0.9" fill="currentColor" />
      </svg>
    ),
    size: 'normal',
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
  {
    id: 'fuentes',
    title: 'Tipografía',
    description: 'Fuente para la tienda, el banner o la barra de anuncio',
    to: '/app/cuenta/fuentes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path
          d="M4 7.5V5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75V7.5M9 20h6M12 4v16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7.5 10h9M7.5 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    size: 'normal',
  },
  {
    id: 'sobre-marca',
    title: 'Sobre mi marca',
    description: 'Historia de tu marca y redes en el pie de página',
    to: '/app/cuenta/sobre-marca',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6 19.5c0-3.31 2.69-6 6-6s6 2.69 6 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    size: 'normal',
  },
]

export function PersonalizarMiTiendaPage() {
  const { tenant } = useMcAuth()
  const masterShowroom = hasShowroomFeatureAccess(tenant)

  return (
    <div className="mc-shell mc-personalizar-page">
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
        {TILES.map((tile) => {
          const lockedShowroom = tile.id === 'showroom' && !masterShowroom
          return (
            <Link
              key={tile.id}
              to={lockedShowroom ? '/app/plan' : tile.to}
              state={lockedShowroom ? undefined : PERSONALIZAR_SUBPAGE_NAV}
              className={`mc-personalizar-tile group flex flex-col justify-between no-underline ${
                tile.size === 'hero' ? 'sm:col-span-2 min-h-[9rem]' : 'min-h-[7rem]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="mc-personalizar-tile__icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--cat-text)]">
                  {tile.icon}
                </span>
                {tile.id === 'showroom' ? (
                  <span className="rounded-full border border-[color-mix(in_srgb,#c5a367_40%,transparent)] bg-[color-mix(in_srgb,#c5a367_12%,white)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#8b6d42]">
                    MASTER
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-medium leading-snug tracking-tight text-[var(--cat-text)] sm:text-[17px]">
                    {tile.title}
                  </p>
                  <p className="ios-footnote mt-1 line-clamp-2 leading-relaxed text-[var(--cat-muted)]">
                    {lockedShowroom
                      ? 'Disponible con plan Master. Activá Master para configurar el pasillo.'
                      : tile.description}
                  </p>
                </div>
                <IconChevronRight
                  size={17}
                  className="shrink-0 text-[var(--cat-muted)] opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
