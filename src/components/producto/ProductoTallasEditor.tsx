import clsx from 'clsx'
import {
  CURVA_TALLAS_DEFAULT,
  TALLA_UNICA_NOMBRE,
  createCurvaTallasDraft,
  createTallaDraft,
  createTallaUnicaDraft,
  type TallaDraft,
} from '@/lib/productoTallas'

type Props = {
  tallas: TallaDraft[]
  onChange: (next: TallaDraft[]) => void
  disabled?: boolean
  /** Oculta inputs de stock (p. ej. cuando el stock va en matriz color × talla). */
  hideStock?: boolean
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function patchAt(rows: TallaDraft[], i: number, partial: Partial<TallaDraft>): TallaDraft[] {
  return rows.map((t, j) => (j === i ? { ...t, ...partial } : t))
}

export function ProductoTallasEditor({ tallas, onChange, disabled = false, hideStock = false }: Props) {
  const stockTotal = hideStock
    ? 0
    : tallas.reduce((s, t) => {
        const n = Number(t.stock.replace(/\D/g, ''))
        return s + (Number.isFinite(n) && n > 0 ? n : 0)
      }, 0)

  const esTallaUnica = tallas.length === 1 && tallas[0]?.nombre === TALLA_UNICA_NOMBRE
  const nombresActivos = new Set(tallas.map((t) => t.nombre))
  const tallasFaltantes = CURVA_TALLAS_DEFAULT.filter((n) => !nombresActivos.has(n))

  function remove(i: number) {
    if (tallas.length <= 1) return
    onChange(tallas.filter((_, j) => j !== i))
  }

  function restoreCurva() {
    onChange(createCurvaTallasDraft())
  }

  function useTallaUnica() {
    onChange(createTallaUnicaDraft())
  }

  function addMissingTalla(nombre: string) {
    onChange([...tallas, createTallaDraft(nombre)])
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ios-footnote font-medium text-mc-700">
            {hideStock ? 'Curva de tallas' : 'Stock por talla'}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-mc-500">
            {hideStock
              ? 'Definí qué tallas ofrecés. El stock se carga en la matriz color × talla.'
              : 'Indicá cuántas unidades hay en cada talla. Quitá las que no uses con la X.'}
          </p>
        </div>
        {!hideStock && stockTotal > 0 ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
            {stockTotal} u.
          </span>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2">
        {tallas.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center gap-2.5 rounded-xl border border-neutral-300/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <span className="flex h-9 min-w-[2.75rem] shrink-0 items-center justify-center rounded-lg bg-neutral-100 px-2 text-[13px] font-bold text-mc-900">
              {t.nombre}
            </span>
            {!hideStock ? (
              <div className="min-w-0 flex-1">
                <label className="sr-only">Stock {t.nombre}</label>
                <input
                  className="mc-input mt-0 bg-white py-2.5 text-[15px]"
                  inputMode="numeric"
                  value={t.stock}
                  disabled={disabled}
                  onChange={(e) => onChange(patchAt(tallas, i, { stock: e.target.value.replace(/\D/g, '') }))}
                  placeholder="0"
                  autoComplete="off"
                />
              </div>
            ) : null}
            {tallas.length > 1 ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => remove(i)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mc-500 transition hover:bg-red-50 hover:text-red-700 active:scale-95"
                aria-label={`Quitar talla ${t.nombre}`}
              >
                <IconX className="h-4 w-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        {!esTallaUnica && tallasFaltantes.length > 0 ? (
          tallasFaltantes.map((nombre) => (
            <button
              key={nombre}
              type="button"
              disabled={disabled}
              onClick={() => addMissingTalla(nombre)}
              className="rounded-full border border-neutral-300/90 bg-white px-3 py-1.5 text-[12px] font-medium text-mc-700 transition hover:border-mc-900/30 active:scale-[0.98]"
            >
              + {nombre}
            </button>
          ))
        ) : null}
        {!esTallaUnica ? (
          <button
            type="button"
            disabled={disabled}
            onClick={useTallaUnica}
            className="rounded-full border border-neutral-300/90 bg-white px-3 py-1.5 text-[12px] font-medium text-mc-700 transition hover:border-mc-900/30 active:scale-[0.98]"
          >
            Usar talla única
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={restoreCurva}
            className="rounded-full border border-neutral-300/90 bg-white px-3 py-1.5 text-[12px] font-medium text-mc-700 transition hover:border-mc-900/30 active:scale-[0.98]"
          >
            Curva XS–XL
          </button>
        )}
      </div>

      {!hideStock ? (
        <p
          className={clsx(
            'mt-3 rounded-lg px-3 py-2 text-[12px] font-medium',
            stockTotal > 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900',
          )}
        >
          {stockTotal > 0
            ? `Stock total: ${stockTotal} unidades (suma de todas las tallas).`
            : 'Indicá el stock de al menos una talla para que el cliente pueda comprar.'}
        </p>
      ) : null}
    </div>
  )
}
