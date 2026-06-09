import { Link } from 'react-router-dom'
import { IconMagnifier } from '@/icons/McIcons'

export function CatalogPreviewBanner() {
  return (
    <div
      className="sticky top-0 z-50 border-b border-amber-300/60 bg-gradient-to-r from-amber-50 via-amber-100/90 to-amber-50 px-4 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
      role="status"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-white/70 text-amber-800">
            <IconMagnifier size={14} />
          </span>
          <p className="text-[13px] font-medium leading-snug text-amber-950">
            Vista previa — tu tienda no está publicada
          </p>
        </div>
        <Link
          to="/app"
          className="shrink-0 rounded-full border border-amber-400/50 bg-white/80 px-3 py-1 text-[12px] font-medium text-amber-950 no-underline transition hover:bg-white"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  )
}
