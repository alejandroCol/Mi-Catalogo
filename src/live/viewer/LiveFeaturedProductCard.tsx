import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import type { McLiveSessionProduct } from '@/types/mc'

type Props = {
  product: McLiveSessionProduct
  pinned?: boolean
  onBuy: () => void
  entering?: boolean
}

export function LiveFeaturedProductCard({ product, pinned = true, onBuy, entering = false }: Props) {
  const { snapshot } = product
  const hasDiscount =
    snapshot.precioOriginalCop != null && snapshot.precioOriginalCop > snapshot.precioCop
  const lowStock = snapshot.stock > 0 && snapshot.stock <= 5

  return (
    <div
      className={clsx(
        'mc-live-product-card flex items-center gap-3 rounded-2xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl',
        pinned && 'mc-live-product-card--pinned',
        entering && 'mc-live-product-card--enter',
      )}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10">
        {snapshot.imageUrl ? (
          <img src={snapshot.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">Sin foto</div>
        )}
        {pinned && (
          <span className="absolute left-1 top-1 rounded-full bg-[#c5a367] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1c1b1f]">
            Ahora
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{snapshot.nombre}</p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
          <span className="text-base font-bold tabular-nums text-white">{formatCop(snapshot.precioCop)}</span>
          {hasDiscount && (
            <span className="text-xs text-white/45 line-through tabular-nums">
              {formatCop(snapshot.precioOriginalCop!)}
            </span>
          )}
        </div>
        {snapshot.stock <= 0 ? (
          <p className="mt-0.5 text-[11px] font-medium text-red-300">Agotado</p>
        ) : lowStock ? (
          <p className="mt-0.5 text-[11px] font-medium text-amber-200">¡Quedan {snapshot.stock}!</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onBuy}
        disabled={snapshot.stock <= 0}
        className="mc-live-buy-btn shrink-0 rounded-full bg-[var(--cat-accent,#c5a367)] px-4 py-2.5 text-xs font-bold text-[var(--cat-accent-text,#1c1b1f)] shadow-lg transition hover:scale-[1.03] active:scale-[0.98] disabled:opacity-40"
      >
        Comprar
      </button>
    </div>
  )
}
