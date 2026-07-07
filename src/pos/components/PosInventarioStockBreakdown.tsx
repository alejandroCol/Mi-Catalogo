import clsx from 'clsx'
import { varianteEtiqueta } from '@/lib/productoVariantes'
import type { PosInventarioBreakdown } from '@/pos/lib/posProductoSkus'

type Props = {
  breakdown: PosInventarioBreakdown
}

function QtyCell({ qty }: { qty: number }) {
  return (
    <span
      className={clsx(
        'inline-flex min-w-[1.75rem] justify-center font-semibold tabular-nums',
        qty > 0 ? 'text-mc-brand-gray' : 'text-mc-brand-gray/35',
      )}
    >
      {qty}
    </span>
  )
}

export function PosInventarioStockBreakdown({ breakdown }: Props) {
  if (breakdown.type === 'list') {
    return (
      <div className="mc-pos-inventory-breakdown">
        <p className="mc-pos-inventory-breakdown__heading">{breakdown.heading}</p>
        <div className="mc-pos-inventory-breakdown__chips">
          {breakdown.items.map((item) => (
            <span
              key={item.label}
              className={clsx(
                'mc-pos-inventory-breakdown__chip',
                item.cantidad <= 0 && 'mc-pos-inventory-breakdown__chip--empty',
              )}
            >
              {item.hex ? (
                <span
                  className="mc-pos-inventory-breakdown__swatch"
                  style={{ backgroundColor: item.hex }}
                  aria-hidden
                />
              ) : null}
              <span className="mc-pos-inventory-breakdown__chip-label">{item.label}</span>
              <span className="mc-pos-inventory-breakdown__chip-qty">{item.cantidad}</span>
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mc-pos-inventory-breakdown">
      <p className="mc-pos-inventory-breakdown__heading">Stock por color × talla</p>
      <div className="mc-pos-inventory-breakdown__matrix-wrap">
        <table className="mc-pos-inventory-breakdown__matrix">
          <thead>
            <tr>
              <th scope="col">Color</th>
              {breakdown.tallas.map((t) => (
                <th key={t.id} scope="col">
                  {t.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {breakdown.colores.map((c) => (
              <tr key={c.id}>
                <th scope="row">
                  <span className="mc-pos-inventory-breakdown__color">
                    {c.hex ? (
                      <span
                        className="mc-pos-inventory-breakdown__swatch"
                        style={{ backgroundColor: c.hex }}
                        aria-hidden
                      />
                    ) : null}
                    {varianteEtiqueta(c)}
                  </span>
                </th>
                {breakdown.tallas.map((t) => (
                  <td key={t.id}>
                    <QtyCell qty={breakdown.qty(c.id, t.id)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
