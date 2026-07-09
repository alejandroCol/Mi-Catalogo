import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { clienteIniciales, normalizeCedula } from '@/pos/lib/posClientes'
import type { McPosCliente } from '@/types/mc'

type ClienteRow = McPosCliente & { id: string }

type Props = {
  clientes: ClienteRow[]
  loading: boolean
  onClose: () => void
  onSelect: (cliente: ClienteRow) => void
  onCrear: (input: { nombre: string; cedula: string; ciudad: string; direccion?: string }) => Promise<ClienteRow>
}

type Tab = 'buscar' | 'nuevo'

export function PosAsociarClienteModal({ clientes, loading, onClose, onSelect, onCrear }: Props) {
  const [tab, setTab] = useState<Tab>('buscar')
  const [search, setSearch] = useState('')
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [direccion, setDireccion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.cedula.includes(q) ||
        c.ciudad.toLowerCase().includes(q),
    )
  }, [clientes, search])

  const cedulaNormalizada = normalizeCedula(cedula)
  const cedulaExistente = useMemo(
    () => clientes.find((c) => c.cedula === cedulaNormalizada),
    [clientes, cedulaNormalizada],
  )

  async function crearCliente(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !cedulaNormalizada || !ciudad.trim()) {
      setMsg('Completá nombre, cédula y ciudad.')
      return
    }
    if (cedulaExistente) {
      onSelect(cedulaExistente)
      return
    }
    setGuardando(true)
    setMsg(null)
    try {
      const nuevo = await onCrear({
        nombre: nombre.trim(),
        cedula,
        ciudad: ciudad.trim(),
        direccion: direccion.trim() || undefined,
      })
      onSelect(nuevo)
    } catch {
      setMsg('No se pudo crear el cliente.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="mc-pos-modal mc-pos-modal--wide mc-pos-modal--stacked"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mc-pos-modal__title">Asociar cliente</h2>
        <p className="mc-pos-modal__subtitle">Buscá un cliente existente o creá uno nuevo para esta venta.</p>

        <div className="mc-pos-cliente-modal__tabs">
          <button
            type="button"
            className={clsx('mc-pos-cliente-modal__tab', tab === 'buscar' && 'mc-pos-cliente-modal__tab--active')}
            onClick={() => setTab('buscar')}
          >
            Buscar
          </button>
          <button
            type="button"
            className={clsx('mc-pos-cliente-modal__tab', tab === 'nuevo' && 'mc-pos-cliente-modal__tab--active')}
            onClick={() => setTab('nuevo')}
          >
            Nuevo cliente
          </button>
        </div>

        <div className="mc-pos-modal__body">
          {tab === 'buscar' ? (
            <>
              <input
                className="mc-pos-field-input"
                placeholder="Buscar por nombre, cédula o ciudad…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {loading ? (
                <p className="mc-pos-muted py-6 text-center">Cargando clientes…</p>
              ) : filtered.length === 0 ? (
                <p className="mc-pos-muted py-6 text-center">
                  {search.trim() ? 'Sin resultados.' : 'Aún no hay clientes registrados.'}
                </p>
              ) : (
                <ul className="mc-pos-cliente-modal__list">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="mc-pos-cliente-modal__item"
                        onClick={() => onSelect(c)}
                      >
                        <span className="mc-pos-cliente-avatar" aria-hidden>
                          {clienteIniciales(c.nombre)}
                        </span>
                        <span className="mc-pos-cliente-modal__item-main">
                          <span className="mc-pos-cliente-modal__item-name">{c.nombre}</span>
                          <span className="mc-pos-cliente-modal__item-meta">
                            CC {c.cedula} · {c.ciudad}
                            {c.direccion ? ` · ${c.direccion}` : ''}
                          </span>
                        </span>
                        <span className="mc-pos-cliente-modal__item-action">Seleccionar</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <form className="mc-pos-cliente-modal__form" onSubmit={crearCliente}>
              <label className="mc-pos-field">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </label>
              <label className="mc-pos-field">
                <span>Cédula</span>
                <input
                  inputMode="numeric"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  required
                />
              </label>
              {cedulaExistente && (
                <p className="mc-pos-status text-sm">
                  Ya existe un cliente con esta cédula: <strong>{cedulaExistente.nombre}</strong>. Se usará ese registro.
                </p>
              )}
              <label className="mc-pos-field">
                <span>Ciudad</span>
                <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} required />
              </label>
              <label className="mc-pos-field">
                <span>Dirección (opcional)</span>
                <input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              </label>
              {msg && (
                <p className="mc-pos-status mc-pos-status--error" role="alert">
                  {msg}
                </p>
              )}
              <button type="submit" className="mc-landing-btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : cedulaExistente ? 'Usar cliente existente' : 'Crear y asociar'}
              </button>
            </form>
          )}
        </div>

        <div className="mc-pos-modal__actions">
          <button type="button" className="mc-landing-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
