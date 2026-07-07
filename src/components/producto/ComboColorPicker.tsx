import clsx from 'clsx'
import type { McComboColorSeleccion, McProducto } from '@/types/mc'
import { varianteEtiqueta } from '@/lib/productoVariantes'
import type { ComboClienteSlot, ProductoLookup } from '@/lib/comboProducto'

type Props = {
  slots: ComboClienteSlot[]
  products?: ProductoLookup
  value: McComboColorSeleccion[]
  onChange: (next: McComboColorSeleccion[]) => void
  variant?: 'catalog' | 'pos'
  disabled?: boolean
}

function slotTitle(slot: ComboClienteSlot): string {
  const suffix = slot.slotIndex > 0 ? ` ${slot.slotIndex + 1}` : ''
  return `${slot.nombre}${suffix}`
}

function skuStock(prod: McProducto, colorId: string, tallaId: string): number {
  return Math.max(
    0,
    prod.skus?.find((s) => s.varianteId === colorId && s.tallaId === tallaId)?.stock ?? 0,
  )
}

function tallaStock(prod: McProducto, slot: ComboClienteSlot, colorId: string | undefined, tallaId: string): number {
  if (slot.usaMatrizSku && colorId) return skuStock(prod, colorId, tallaId)
  const t = prod.tallas?.find((x) => x.id === tallaId)
  return Math.max(0, t?.stock ?? 0)
}

export function ComboColorPicker({ slots, products, value, onChange, variant = 'catalog', disabled }: Props) {
  if (slots.length === 0) return null

  function pick(slot: ComboClienteSlot, patch: Partial<McComboColorSeleccion>) {
    if (disabled) return
    const prev = value.find(
      (s) => s.componenteIndex === slot.componenteIndex && s.slotIndex === slot.slotIndex,
    )
    const rest = value.filter(
      (s) => !(s.componenteIndex === slot.componenteIndex && s.slotIndex === slot.slotIndex),
    )
    onChange([
      ...rest,
      {
        componenteIndex: slot.componenteIndex,
        slotIndex: slot.slotIndex,
        ...(prev ?? {}),
        ...patch,
      },
    ])
  }

  function pickForSlot(slot: ComboClienteSlot): McComboColorSeleccion | undefined {
    return value.find(
      (s) => s.componenteIndex === slot.componenteIndex && s.slotIndex === slot.slotIndex,
    )
  }

  const isPos = variant === 'pos'

  return (
    <div className={clsx('space-y-4', isPos ? 'mc-pos-combo-colors' : '')}>
      <p
        className={
          isPos
            ? 'text-[13px] font-semibold text-[var(--cat-text)]'
            : 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]'
        }
      >
        Personalizá cada prenda del combo
      </p>
      {slots.map((slot) => {
        const prod = products?.get(slot.productId)
        const picked = pickForSlot(slot)
        const colorId = picked?.varianteId
        const tallaId = picked?.tallaId

        return (
          <div
            key={`${slot.componenteIndex}-${slot.slotIndex}`}
            className={
              isPos
                ? 'rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-sm'
                : 'rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[var(--cat-surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
            }
          >
            <p className="text-[14px] font-semibold text-[var(--cat-text)]">{slotTitle(slot)}</p>

            {slot.eligeColor ? (
              <div className="mt-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--cat-muted)]">
                  Color
                </p>
                <div className="flex flex-wrap gap-2">
                  {slot.variantes.map((v) => {
                    const active = colorId === v.id
                    const label = varianteEtiqueta(v)
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          pick(slot, {
                            varianteId: v.id,
                            varianteNombre: label,
                            ...(slot.eligeTalla ? { tallaId: undefined, tallaNombre: undefined } : {}),
                          })
                        }
                        className={clsx(
                          'inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition',
                          disabled && 'cursor-not-allowed opacity-50',
                          active
                            ? isPos
                              ? 'border-violet-600 bg-violet-50 text-violet-950 ring-1 ring-violet-300'
                              : 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,var(--cat-surface)_88%)] text-[var(--cat-text)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)]'
                            : isPos
                              ? 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-300'
                              : 'mc-pc-border bg-[var(--cat-surface)] text-[var(--cat-text)] hover:border-[color-mix(in_srgb,var(--cat-text)_22%,transparent)]',
                        )}
                      >
                        {v.hex ? (
                          <span
                            className="h-6 w-6 shrink-0 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: v.hex }}
                            aria-hidden
                          />
                        ) : null}
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {slot.eligeTalla ? (
              <div className={clsx('mt-3', slot.eligeColor && 'border-t border-neutral-100 pt-3')}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--cat-muted)]">
                  Talla
                </p>
                {!slot.eligeColor || colorId ? (
                  <div className="flex flex-wrap gap-2">
                    {slot.tallas.map((t) => {
                      const disp = prod ? tallaStock(prod, slot, colorId, t.id) : t.stock
                      const active = tallaId === t.id
                      const agotada = disp <= 0
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={disabled || agotada}
                          onClick={() => pick(slot, { tallaId: t.id, tallaNombre: t.nombre })}
                          className={clsx(
                            'inline-flex min-h-[44px] min-w-[3rem] items-center justify-center rounded-xl border px-3.5 py-2 text-[13px] font-bold transition',
                            agotada && 'cursor-not-allowed opacity-40',
                            active && !agotada
                              ? isPos
                                ? 'border-violet-600 bg-violet-50 text-violet-950 ring-1 ring-violet-300'
                                : 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,var(--cat-surface)_88%)] text-[var(--cat-text)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)]'
                              : !agotada &&
                                  (isPos
                                    ? 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-300'
                                    : 'mc-pc-border bg-[var(--cat-surface)] text-[var(--cat-text)] hover:border-[color-mix(in_srgb,var(--cat-text)_22%,transparent)]'),
                          )}
                        >
                          {t.nombre}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[12px] text-[var(--cat-muted)]">Elegí un color para ver las tallas disponibles.</p>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
