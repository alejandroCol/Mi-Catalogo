import {
  CURVA_TALLAS_DEFAULT,
  CURVA_TALLAS_ZAPATOS,
  TALLA_UNICA_NOMBRE,
  createCurvaTallasDraft,
  createCurvaZapatosDraft,
  createTallaDraft,
  createTallaUnicaDraft,
  type TallaDraft,
} from '@/lib/productoTallas'

type Props = {
  tallas: TallaDraft[]
  onChange: (next: TallaDraft[]) => void
  modo?: 'ropa' | 'zapatos'
  titulo?: string
  disabled?: boolean
  hideStock?: boolean
}

function patchAt(rows: TallaDraft[], i: number, partial: Partial<TallaDraft>): TallaDraft[] {
  return rows.map((t, j) => (j === i ? { ...t, ...partial } : t))
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export function PosTallasStockEditor({
  tallas,
  onChange,
  modo = 'ropa',
  titulo,
  disabled = false,
  hideStock = false,
}: Props) {
  const stockTotal = hideStock
    ? 0
    : tallas.reduce((s, t) => {
        const n = Number(t.stock.replace(/\D/g, ''))
        return s + (Number.isFinite(n) && n > 0 ? n : 0)
      }, 0)

  const tituloUi =
    titulo ?? (hideStock ? 'Curva de tallas' : modo === 'ropa' ? 'Stock por talla (ropa)' : 'Stock por talla (zapatos)')

  const esTallaUnica = modo === 'ropa' && tallas.length === 1 && tallas[0]?.nombre === TALLA_UNICA_NOMBRE
  const nombresActivos = new Set(tallas.map((t) => t.nombre))
  const curvaReferencia = modo === 'zapatos' ? CURVA_TALLAS_ZAPATOS : CURVA_TALLAS_DEFAULT
  const tallasFaltantes = curvaReferencia.filter((n) => !nombresActivos.has(n))

  function remove(i: number) {
    if (tallas.length <= 1) return
    onChange(tallas.filter((_, j) => j !== i))
  }

  function restoreCurva() {
    onChange(modo === 'zapatos' ? createCurvaZapatosDraft() : createCurvaTallasDraft())
  }

  function useTallaUnica() {
    onChange(createTallaUnicaDraft())
  }

  function addMissingTalla(nombre: string) {
    onChange([...tallas, createTallaDraft(nombre)])
  }

  return (
    <div className="mc-pos-tallas-editor">
      <div className="mc-pos-tallas-editor__head">
        <p className="mc-pos-tallas-editor__title">{tituloUi}</p>
        {stockTotal > 0 ? (
          <span className="mc-pos-badge mc-pos-badge--ok">{stockTotal} u.</span>
        ) : null}
      </div>
      <p className="mc-pos-muted text-xs">
        {hideStock
          ? 'Definí qué tallas ofrecés. El stock se carga en la matriz color × talla.'
          : 'Indicá cuántas unidades hay en cada talla. Quitá las que no uses con la X.'}
      </p>
      <ul className="mc-pos-tallas-editor__list">
        {tallas.map((t, i) => (
          <li key={t.id} className="mc-pos-tallas-editor__row">
            <span className="mc-pos-tallas-editor__label">{t.nombre}</span>
            {!hideStock ? (
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
            ) : null}
            {tallas.length > 1 ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(i)}
                className="mc-pos-tallas-editor__remove"
                aria-label={`Quitar talla ${t.nombre}`}
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mc-pos-tallas-editor__actions">
        {!esTallaUnica && tallasFaltantes.length > 0
          ? tallasFaltantes.map((nombre) => (
              <button
                key={nombre}
                type="button"
                disabled={disabled}
                onClick={() => addMissingTalla(nombre)}
                className="mc-pos-tallas-editor__chip"
              >
                + {nombre}
              </button>
            ))
          : null}
        {modo === 'ropa' ? (
          !esTallaUnica ? (
            <button type="button" disabled={disabled} onClick={useTallaUnica} className="mc-pos-tallas-editor__chip">
              Usar talla única
            </button>
          ) : (
            <button type="button" disabled={disabled} onClick={restoreCurva} className="mc-pos-tallas-editor__chip">
              Curva XS–Única
            </button>
          )
        ) : (
          <button type="button" disabled={disabled} onClick={restoreCurva} className="mc-pos-tallas-editor__chip">
            Restaurar curva zapatos
          </button>
        )}
      </div>

      {!hideStock && stockTotal <= 0 ? (
        <p className="mc-pos-tallas-editor__hint">Indicá stock en al menos una talla.</p>
      ) : null}
    </div>
  )
}
