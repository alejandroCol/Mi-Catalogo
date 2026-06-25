import { Link } from 'react-router-dom'
import { PosIcon, PosIconBox } from '@/pos/components/PosIcon'

const FEATURES = [
  { icon: 'multi-sede' as const, label: 'Multi-sede y bodega central' },
  { icon: 'caja' as const, label: 'Caja del día, ingresos/egresos y reportes' },
  { icon: 'printer' as const, label: 'Tickets ESC/POS y cajón monedero' },
  { icon: 'sync' as const, label: 'Sync de inventario con tu tienda online' },
]

export function LandingPosSection() {
  return (
    <section className="mc-landing-pos" id="pos">
      <div className="mc-landing-container">
        <div className="mc-landing-pos__head">
          <PosIconBox name="caja" tone="gold" size="lg" />
          <div>
            <p className="mc-landing-eyebrow">Punto de venta</p>
            <h2 className="mc-landing-section-title">
              Vendé en tienda física con el mismo inventario de tu catálogo
            </h2>
          </div>
        </div>
        <p className="mc-landing-section-lead">
          Mi Catálogo POS conecta caja, stock por sede e impresora térmica. Configurá sedes y
          vendedores gratis; activá Expert solo cuando quieras registrar ventas en caja.
        </p>
        <ul className="mc-landing-pos-features">
          {FEATURES.map((f) => (
            <li key={f.label}>
              <PosIconBox name={f.icon} tone="cream" size="sm" />
              <span>{f.label}</span>
            </li>
          ))}
        </ul>
        <div className="mc-landing-pos-cta">
          <Link to="/registro" className="mc-landing-btn-primary no-underline">
            Crear cuenta gratis
          </Link>
          <Link to="/pos" className="mc-landing-btn-secondary no-underline">
            <PosIcon name="ventas" size={18} />
            Conocer POS
          </Link>
        </div>
      </div>
    </section>
  )
}
