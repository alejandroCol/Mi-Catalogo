import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { usePosClientes } from '@/pos/hooks/usePosClientes'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { PosEmptyState } from '@/pos/components/PosEmptyState'
import { clienteIniciales } from '@/pos/lib/posClientes'
import { posFormatFechaCorta } from '@/pos/lib/posDate'

export function PosClientesPage() {
  const { profile, tenant } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const { clientes, loading } = usePosClientes(tenantId)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.cedula.includes(q) ||
        c.ciudad.toLowerCase().includes(q) ||
        (c.direccion?.toLowerCase().includes(q) ?? false),
    )
  }, [clientes, search])

  const totalClientes = clientes.length
  const totalVentas = clientes.reduce((s, c) => s + (c.ventasCount ?? 0), 0)
  const totalCompras = clientes.reduce((s, c) => s + (c.totalComprasCop ?? 0), 0)

  return (
    <div className="mc-pos-page mc-pos-clientes-page">
      <PosPageHeader
        icon="clientes"
        eyebrow="CRM POS"
        title="Clientes"
        subtitle={`${totalClientes} registrados · ${totalVentas} ventas asociadas`}
        action={
          <Link to="/pos/admin/ventas" className="mc-landing-btn-ghost text-sm">
            ← Ventas
          </Link>
        }
      />

      <section className="mc-pos-clientes-summary" aria-label="Resumen de clientes">
        <article className="mc-pos-clientes-summary__card mc-pos-clientes-summary__card--main">
          <p className="mc-pos-clientes-summary__label">Clientes</p>
          <p className="mc-pos-clientes-summary__value">{loading ? '…' : totalClientes}</p>
        </article>
        <article className="mc-pos-clientes-summary__card">
          <p className="mc-pos-clientes-summary__label">Ventas asociadas</p>
          <p className="mc-pos-clientes-summary__value">{loading ? '…' : totalVentas}</p>
        </article>
        <article className="mc-pos-clientes-summary__card">
          <p className="mc-pos-clientes-summary__label">Total comprado</p>
          <p className="mc-pos-clientes-summary__value">{loading ? '…' : formatCop(totalCompras)}</p>
        </article>
      </section>

      <section className="mc-pos-clientes-toolbar">
        <input
          className="mc-pos-field-input"
          placeholder="Buscar por nombre, cédula, ciudad o dirección…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {loading ? (
        <div className="mc-pos-clientes-loading">
          <p className="mc-pos-muted">Cargando clientes…</p>
        </div>
      ) : filtered.length === 0 ? (
        <PosEmptyState
          variant="ventas"
          title={search.trim() ? 'Sin resultados' : 'Sin clientes aún'}
          hint={
            search.trim()
              ? 'Probá con otro término de búsqueda.'
              : 'Los clientes se crean al asociarlos en una venta desde el POS.'
          }
        />
      ) : (
        <section className="mc-pos-clientes-grid">
          {filtered.map((c) => (
            <article key={c.id} className="mc-pos-cliente-card">
              <div className="mc-pos-cliente-card__head">
                <span className="mc-pos-cliente-avatar mc-pos-cliente-avatar--lg" aria-hidden>
                  {clienteIniciales(c.nombre)}
                </span>
                <div className="mc-pos-cliente-card__identity">
                  <h2 className="mc-pos-cliente-card__name">{c.nombre}</h2>
                  <p className="mc-pos-cliente-card__doc">CC {c.cedula}</p>
                </div>
              </div>

              <div className="mc-pos-cliente-card__meta">
                <span className="mc-pos-cliente-card__chip">{c.ciudad}</span>
                {c.direccion && (
                  <span className="mc-pos-cliente-card__chip mc-pos-cliente-card__chip--muted">
                    {c.direccion}
                  </span>
                )}
              </div>

              <div className="mc-pos-cliente-card__stats">
                <div>
                  <p className="mc-pos-cliente-card__stat-label">Compras</p>
                  <p className="mc-pos-cliente-card__stat-value">{c.ventasCount ?? 0}</p>
                </div>
                <div>
                  <p className="mc-pos-cliente-card__stat-label">Total</p>
                  <p className="mc-pos-cliente-card__stat-value">{formatCop(c.totalComprasCop ?? 0)}</p>
                </div>
                <div>
                  <p className="mc-pos-cliente-card__stat-label">Última</p>
                  <p className="mc-pos-cliente-card__stat-value mc-pos-cliente-card__stat-value--sm">
                    {c.ultimaCompraAt ? posFormatFechaCorta(c.ultimaCompraAt) : '—'}
                  </p>
                </div>
              </div>

              <Link
                to={`/pos/admin/clientes/${c.id}`}
                className="mc-landing-btn-primary mc-pos-cliente-card__cta"
              >
                Ver compras
              </Link>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
