import { Link } from 'react-router-dom'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import { IconChevronLeft, IconLink } from '@/icons/McIcons'
import { useDemoPos } from '@/vendedor/demo-pos/DemoPosContext'

type Props = {
  modo: 'admin' | 'vendedora'
}

export function DemoPosBanner({ modo }: Props) {
  const { demo, tenant } = useDemoPos()
  const publicUrl = buildStorePublicUrl(tenant.slug)

  return (
    <div className="sticky top-0 z-30 border-b border-amber-200/70 bg-gradient-to-r from-amber-50 via-[#fffbeb] to-amber-50/90 px-4 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/vendedor"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-300/60 bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-amber-950 no-underline transition hover:bg-white"
          >
            <IconChevronLeft size={14} />
            Panel vendedor
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight text-amber-950">
              Demo POS · {modo === 'admin' ? 'Admin' : 'Cajera'} · {demo.displayName}
            </p>
            <p className="text-[11px] text-amber-800/80">
              {modo === 'admin'
                ? 'Dashboard, reportes y supervisión — datos ilustrativos'
                : 'Vista de cajera: ventas del día y cobro'}
            </p>
          </div>
        </div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200/70 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700 no-underline transition hover:border-neutral-300"
        >
          <IconLink size={13} />
          Catálogo público
        </a>
      </div>
    </div>
  )
}
