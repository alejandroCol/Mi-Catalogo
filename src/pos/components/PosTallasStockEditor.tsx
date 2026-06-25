import type { TallaDraft } from '@/lib/productoTallas'

type Props = {
  tallas: TallaDraft[]
  onChange: (next: TallaDraft[]) => void
  modo?: 'ropa' | 'zapatos'
  titulo?: string
  disabled?: boolean
}

function patchAt(rows: TallaDraft[], i: number, partial: Partial<TallaDraft>): TallaDraft[] {
  return rows.map((t, j) => (j === i ? { ...t, ...partial } : t))
}

export function PosTallasStockEditor({ tallas, onChange, modo = 'ropa', titulo, disabled = false }: Props) {
  const stockTotal = tallas.reduce((s, t) => {
    const n = Number(t.stock.replace(/\D/g, ''))
    return s + (Number.isFinite(n) && n > 0 ? n : 0)
  }, 0)

  const tituloUi = titulo ?? (modo === 'ropa' ? 'Stock por talla (ropa)' : 'Stock por talla (zapatos)')

  return (
    <div className="mc-pos-tallas-editor">
      <div className="mc-pos-tallas-editor__head">
        <p className="mc-pos-tallas-editor__title">{tituloUi}</p>
        {stockTotal > 0 ? (
          <span className="mc-pos-badge mc-pos-badge--ok">{stockTotal} u.</span>
        ) : null}
      </div>
      <p className="mc-pos-muted text-xs">
        Mismas tallas que en la tienda virtual. Indicá cuántas unidades hay en cada una.
      </p>
      <ul className="mc-pos-tallas-editor__list">
        {tallas.map((t, i) => (
          <li key={t.id} className="mc-pos-tallas-editor__row">
            <span className="mc-pos-tallas-editor__label">{t.nombre}</span>
            <input
              className="mc-pos-tallas-editor__input"
              inputMode="numeric"
              value={t.stock}
              disabled={disabled}
              onChange={(e) => onChange(patchAt(tallas, i, { stock: e.target.value.replace(/\D/g, '') }))}
              placeholder="0"
              autoComplete="off"
              aria-label={`Stock talla ${t.nombre}`}
            />
          </li>
        ))}
      </ul>
      {stockTotal <= 0 ? (
        <p className="mc-pos-tallas-editor__hint">Indicá stock en al menos una talla.</p>
      ) : null}
    </div>
  )
}
