import clsx from 'clsx'
import {
  IconChevronRight,
  IconClipboard,
  IconCube,
  IconGear,
  IconGraduationCap,
  IconLink,
  IconShipping,
  IconSwatches,
  IconWarehouse,
  IconWhatsApp,
} from '@/icons/McIcons'
import type { GuideFlow } from '@/lib/tutorials/guideContent'

const ICONS: Record<string, typeof IconGear> = {
  'publicar-tienda': IconLink,
  'inventario-unico-pos': IconWarehouse,
  'metodo-pago': IconGear,
  envios: IconShipping,
  'whatsapp-pedidos': IconWhatsApp,
  'identidad-dominio': IconLink,
  'estilo-catalogo': IconSwatches,
  'logo-fuentes': IconSwatches,
  banners: IconClipboard,
  'productos-catalogo': IconCube,
  'sedes-vendedores': IconWarehouse,
  cupones: IconClipboard,
  'primeros-pasos': IconGraduationCap,
}

type Props = {
  guide: GuideFlow
  index: number
  selected?: boolean
  onSelect: () => void
}

export function GuideFlowCard({ guide, index, selected, onSelect }: Props) {
  const Icon = ICONS[guide.id] ?? IconGraduationCap

  return (
    <button
      type="button"
      className={clsx(
        'group flex w-full flex-col gap-4 rounded-2xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition sm:p-5',
        selected
          ? 'border-mc-900 ring-1 ring-mc-900/15'
          : 'border-neutral-200/80 hover:border-neutral-300 hover:shadow-[0_10px_28px_-20px_rgba(10,10,10,0.45)]',
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-mc-800 transition group-hover:bg-mc-900 group-hover:text-white">
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {guide.badge ? (
              <span className="rounded-md bg-mc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {guide.badge}
              </span>
            ) : null}
            <span className="text-[12px] font-medium text-mc-500">
              {guide.steps.length} pasos · ~{guide.minutes} min
            </span>
          </div>
          <h3 className="text-[16px] font-semibold tracking-tight text-[var(--cat-text)]">
            {guide.title}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">
            {guide.summary}
          </p>
        </div>
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-mc-400 transition group-hover:bg-mc-900 group-hover:text-white">
          <IconChevronRight size={16} />
        </span>
      </div>

      <div className="border-t border-neutral-100 pt-3" aria-hidden>
        <div className="flex items-center">
          {guide.steps.map((step, i) => (
            <div key={`${guide.id}-preview-${i}`} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-mc-700 ring-2 ring-white">
                  {i + 1}
                </span>
                <span className="hidden w-full truncate text-center text-[10px] font-medium text-mc-500 sm:block">
                  {step.title.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
              {i < guide.steps.length - 1 ? (
                <span className="mb-0 h-px min-w-2 flex-1 bg-neutral-200 sm:mb-4" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </button>
  )
}
