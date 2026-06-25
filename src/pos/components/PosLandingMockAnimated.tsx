import { useEffect, useState } from 'react'
import { PosIcon, PosIconBox } from '@/pos/components/PosIcon'

const SCENES = [
  {
    total: 0,
    lines: [] as { name: string; qty: number; price: string }[],
    badge: null as string | null,
  },
  {
    total: 86000,
    lines: [{ name: 'Blusa lino', qty: 2, price: '$ 86.000' }],
    badge: null,
  },
  {
    total: 128500,
    lines: [
      { name: 'Blusa lino', qty: 2, price: '$ 86.000' },
      { name: 'Aretes dorados', qty: 1, price: '$ 42.500' },
    ],
    badge: null,
  },
  {
    total: 128500,
    lines: [
      { name: 'Blusa lino', qty: 2, price: '$ 86.000' },
      { name: 'Aretes dorados', qty: 1, price: '$ 42.500' },
    ],
    badge: 'En catálogo',
  },
]

function formatTotal(n: number) {
  return n > 0 ? `$ ${n.toLocaleString('es-CO')}` : '$ —'
}

export function PosLandingMockAnimated() {
  const [scene, setScene] = useState(0)
  const [tick, setTick] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setScene((s) => (s + 1) % SCENES.length)
      setTick((t) => !t)
    }, 2800)
    return () => window.clearInterval(id)
  }, [])

  const cur = SCENES[scene]!

  return (
    <div className="mc-pos-landing__visual" aria-hidden>
      <div className={`mc-pos-landing__mock mc-pos-landing__mock--live ${tick ? 'mc-pos-landing__mock--pulse' : ''}`}>
        <div className="mc-pos-landing__mock-header">
          <PosIconBox name="ventas" tone="gold" size="sm" />
          <span className="mc-pos-landing__mock-title">Mi Catálogo POS</span>
          {cur.badge && <span className="mc-pos-landing__mock-catalog-badge">{cur.badge}</span>}
        </div>
        <p className="mc-pos-landing__mock-eyebrow">Venta en curso</p>
        <p className="mc-pos-landing__mock-total mc-pos-landing__mock-total--animated" key={cur.total}>
          {formatTotal(cur.total)}
        </p>
        <ul className="mc-pos-landing__mock-lines">
          {cur.lines.map((l) => (
            <li key={l.name} className="mc-pos-landing__mock-line-enter">
              <span>
                {l.name} × {l.qty}
              </span>
              <span>{l.price}</span>
            </li>
          ))}
          {cur.lines.length === 0 && (
            <li className="mc-pos-landing__mock-line-empty">
              <span>Agregá productos al carrito…</span>
            </li>
          )}
        </ul>
        <div className="mc-pos-landing__mock-pills">
          <span className="mc-pos-landing__mock-pill mc-pos-landing__mock-pill--active">Efectivo</span>
          <span className="mc-pos-landing__mock-pill">Transf.</span>
          <span className="mc-pos-landing__mock-pill">Mixto</span>
        </div>
        <div className={`mc-pos-landing__mock-btn ${cur.total > 0 ? 'mc-pos-landing__mock-btn--ready' : ''}`}>
          <PosIcon name="caja" size={16} />
          Cobrar venta
        </div>
      </div>
      <div className={`mc-pos-landing__mock-float ${cur.badge ? 'mc-pos-landing__mock-float--show' : ''}`}>
        <PosIconBox name="check" tone="emerald" size="sm" />
        <div>
          <p>Stock actualizado</p>
          <small>Catálogo online</small>
        </div>
      </div>
    </div>
  )
}
