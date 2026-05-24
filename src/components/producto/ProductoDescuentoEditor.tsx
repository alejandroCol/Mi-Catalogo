import clsx from 'clsx'
import { formatCop, formatIntegerEsCo } from '@/lib/formatCop'
import type { McDescuentoTipo } from '@/lib/productoDescuento'

export type ProductoDescuentoDraft = {
  activo: boolean
  tipo: McDescuentoTipo
  valor: string
}

export function productoDescuentoDraftFromProduct(prod: {
  descuentoActivo?: boolean
  descuentoTipo?: McDescuentoTipo
  descuentoValor?: number
}): ProductoDescuentoDraft {
  return {
    activo: !!prod.descuentoActivo,
    tipo: prod.descuentoTipo === 'monto_fijo' ? 'monto_fijo' : 'porcentaje',
    valor:
      prod.descuentoValor != null && prod.descuentoValor > 0
        ? prod.descuentoTipo === 'monto_fijo'
          ? formatIntegerEsCo(Math.round(prod.descuentoValor))
          : String(Math.round(prod.descuentoValor))
        : '',
  }
}

export function parseProductoDescuentoDraft(
  draft: ProductoDescuentoDraft,
  precioBaseCop: number,
): { ok: true; fields: { descuentoActivo: boolean; descuentoTipo?: McDescuentoTipo; descuentoValor?: number } } | { ok: false; error: string } {
  if (!draft.activo) {
    return { ok: true, fields: { descuentoActivo: false } }
  }

  const raw = draft.valor.replace(/\D/g, '')
  const valor = Number(raw)
  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, error: 'Indicá el valor del descuento.' }
  }

  if (draft.tipo === 'porcentaje') {
    if (valor > 100) return { ok: false, error: 'El porcentaje no puede superar 100 %.' }
    return {
      ok: true,
      fields: { descuentoActivo: true, descuentoTipo: 'porcentaje', descuentoValor: Math.round(valor) },
    }
  }

  if (valor >= precioBaseCop && precioBaseCop > 0) {
    return { ok: false, error: 'El descuento fijo debe ser menor al precio del producto.' }
  }

  return {
    ok: true,
    fields: { descuentoActivo: true, descuentoTipo: 'monto_fijo', descuentoValor: Math.round(valor) },
  }
}

function previewVenta(precioBaseCop: number, draft: ProductoDescuentoDraft): number | null {
  if (!draft.activo || precioBaseCop <= 0) return null
  const raw = draft.valor.replace(/\D/g, '')
  const valor = Number(raw)
  if (!Number.isFinite(valor) || valor <= 0) return null
  if (draft.tipo === 'porcentaje') {
    const p = Math.min(100, valor)
    return Math.max(0, precioBaseCop - Math.round((precioBaseCop * p) / 100))
  }
  if (valor >= precioBaseCop) return null
  return precioBaseCop - valor
}

export function ProductoDescuentoEditor({
  draft,
  onChange,
  precioBaseCop,
  disabled,
}: {
  draft: ProductoDescuentoDraft
  onChange: (next: ProductoDescuentoDraft) => void
  precioBaseCop: number
  disabled?: boolean
}) {
  const ventaPreview = previewVenta(precioBaseCop, draft)
  const pctPreview =
    ventaPreview != null && precioBaseCop > 0
      ? Math.max(1, Math.round(((precioBaseCop - ventaPreview) / precioBaseCop) * 100))
      : null

  function patch(partial: Partial<ProductoDescuentoDraft>) {
    onChange({ ...draft, ...partial })
  }

  function onValorChange(raw: string) {
    if (draft.tipo === 'monto_fijo') {
      const digits = raw.replace(/\D/g, '')
      if (digits === '') {
        patch({ valor: '' })
        return
      }
      const n = Number(digits)
      patch({ valor: Number.isFinite(n) ? formatIntegerEsCo(n) : '' })
      return
    }
    const digits = raw.replace(/\D/g, '').slice(0, 3)
    patch({ valor: digits })
  }

  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--cat-accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_5%,white_95%)] p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 accent-[var(--cat-accent)]"
          checked={draft.activo}
          disabled={disabled}
          onChange={(e) => patch({ activo: e.target.checked })}
        />
        <span>
          <span className="ios-subhead font-medium text-mc-900">Aplicar descuento en la tienda</span>
          <span className="ios-footnote mt-1 block leading-relaxed text-mc-600">
            Se verá el precio tachado y el precio final destacado, como en tiendas grandes.
          </span>
        </span>
      </label>

      {draft.activo && (
        <div className="mt-4 space-y-3 border-t border-[color-mix(in_srgb,var(--cat-accent)_12%,transparent)] pt-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de descuento">
            {(
              [
                ['porcentaje', 'Porcentaje %'],
                ['monto_fijo', 'Valor fijo COP'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                disabled={disabled}
                role="radio"
                aria-checked={draft.tipo === id}
                className={clsx(
                  'rounded-full border px-3.5 py-2 text-[13px] font-medium transition',
                  draft.tipo === id
                    ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,white_88%)] text-mc-900'
                    : 'border-neutral-200/80 bg-white text-mc-600 hover:border-neutral-300',
                )}
                onClick={() => patch({ tipo: id, valor: '' })}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="ios-footnote font-medium text-mc-700">
              {draft.tipo === 'porcentaje' ? 'Porcentaje de descuento' : 'Monto a descontar (COP)'}
            </label>
            <div className="relative mt-1.5">
              <input
                className="mc-input pr-10"
                inputMode="numeric"
                value={draft.valor}
                disabled={disabled}
                placeholder={draft.tipo === 'porcentaje' ? '20' : '5.000'}
                autoComplete="off"
                onChange={(e) => onValorChange(e.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-mc-500">
                {draft.tipo === 'porcentaje' ? '%' : 'COP'}
              </span>
            </div>
          </div>

          {ventaPreview != null && precioBaseCop > 0 && (
            <div className="rounded-lg border border-neutral-200/60 bg-white/80 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mc-500">Vista previa</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-sm text-mc-500 line-through">{formatCop(precioBaseCop)}</span>
                <span className="text-base font-bold tabular-nums text-mc-900">{formatCop(ventaPreview)}</span>
                {pctPreview != null && (
                  <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    −{pctPreview}%
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
