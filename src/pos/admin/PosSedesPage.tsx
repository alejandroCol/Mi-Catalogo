import { useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { mcPosSedesCollection } from '@/lib/mcPosCollections'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { PosBridgeDownloadButton } from '@/pos/components/PosBridgeDownloadButton'
import type { McPosSede, McPosSedeConfig } from '@/types/mc'

function nextSedeCodigo(sedes: McPosSede[]): string {
  const nums = sedes
    .map((s) => /^S(\d+)$/.exec(s.codigo)?.[1])
    .filter(Boolean)
    .map((n) => Number(n))
  const next = nums.length ? Math.max(...nums) + 1 : 1
  return `S${String(next).padStart(2, '0')}`
}

const defaultPosConfig = (): McPosSedeConfig => ({
  imprimirTicketAutomatico: true,
  abrirCajonEnVenta: true,
  nombreImpresora: 'JAL 58M',
  urlBridge: 'http://127.0.0.1:9123',
  cajonPin: 0,
})

export function PosSedesPage() {
  const { tenant, profile } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const { sedes, loading } = usePosSedes(tenantId)
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [mostrarVirtual, setMostrarVirtual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPos, setEditPos] = useState<McPosSedeConfig>(defaultPosConfig())
  const [bodegaId, setBodegaId] = useState(tenant?.posSedeBodegaId ?? '')
  const [savingBodega, setSavingBodega] = useState(false)

  const editing = useMemo(() => sedes.find((s) => s.id === editingId), [sedes, editingId])

  function cerrarNuevo() {
    setNuevoAbierto(false)
    setNombre('')
    setDireccion('')
    setMostrarVirtual(false)
  }

  async function guardarBodegaCentral() {
    if (!tenantId) return
    setSavingBodega(true)
    try {
      const db = getDb()
      await updateDoc(doc(db, MC.tenants, tenantId), {
        posSedeBodegaId: bodegaId || null,
        updatedAt: Date.now(),
      })
      setMsg('Bodega central actualizada.')
    } catch {
      setMsg('No se pudo guardar la bodega.')
    } finally {
      setSavingBodega(false)
    }
  }

  async function crearSede(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !nombre.trim()) return
    setSaving(true)
    setMsg(null)
    try {
      const db = getDb()
      const now = Date.now()
      await addDoc(collection(db, mcPosSedesCollection(tenantId)), {
        nombre: nombre.trim(),
        codigo: nextSedeCodigo(sedes),
        direccion: direccion.trim() || null,
        activa: true,
        mostrarEnTiendaVirtual: mostrarVirtual,
        pos: defaultPosConfig(),
        createdAt: now,
        updatedAt: now,
      })
      cerrarNuevo()
      setMsg('Sede creada correctamente.')
    } catch {
      setMsg('No se pudo crear la sede.')
    } finally {
      setSaving(false)
    }
  }

  async function guardarPos() {
    if (!tenantId || !editingId) return
    setSaving(true)
    try {
      const db = getDb()
      await updateDoc(doc(db, mcPosSedesCollection(tenantId), editingId), {
        pos: editPos,
        updatedAt: Date.now(),
      })
      setEditingId(null)
      setMsg('Configuración POS guardada.')
    } catch {
      setMsg('Error al guardar configuración.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActiva(sede: McPosSede & { id: string }) {
    if (!tenantId) return
    const db = getDb()
    await updateDoc(doc(db, mcPosSedesCollection(tenantId), sede.id), {
      activa: !sede.activa,
      updatedAt: Date.now(),
    })
  }

  async function toggleVirtual(sede: McPosSede & { id: string }) {
    if (!tenantId) return
    const db = getDb()
    await updateDoc(doc(db, mcPosSedesCollection(tenantId), sede.id), {
      mostrarEnTiendaVirtual: !sede.mostrarEnTiendaVirtual,
      updatedAt: Date.now(),
    })
  }

  function abrirEditor(sede: McPosSede & { id: string }) {
    setEditingId(sede.id)
    setEditPos({ ...defaultPosConfig(), ...sede.pos })
  }

  return (
    <div className="mc-pos-page">
      <PosPageHeader
        icon="sedes"
        eyebrow="Configuración"
        title="Sedes"
        subtitle="Puntos de venta, inventario por sede e impresora/cajón monedero."
        action={
          <button type="button" className="mc-landing-btn-primary text-sm" onClick={() => setNuevoAbierto(true)}>
            + Nuevo
          </button>
        }
      />

      {msg && (
        <p className="mc-pos-status" role="status">
          {msg}
        </p>
      )}

      <div className="mc-pos-form-card">
        <h2 className="mc-pos-form-card__title">Bodega central</h2>
        <p className="mc-pos-muted text-sm">
          Sede de referencia para consultar stock de bodega en inventario multi-sede.
        </p>
        <label className="mc-pos-field">
          <span>Sede bodega</span>
          <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)}>
            <option value="">Sin bodega asignada</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codigo} — {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="mc-landing-btn-secondary" disabled={savingBodega} onClick={guardarBodegaCentral}>
          Guardar bodega
        </button>
      </div>

      <div className="mc-pos-list">
        {loading && <p className="mc-pos-muted">Cargando sedes…</p>}
        {sedes.map((sede) => (
          <article key={sede.id} className="mc-pos-list-card">
            <div className="mc-pos-list-card__head">
              <div>
                <span className="mc-pos-list-card__code">{sede.codigo}</span>
                <h3 className="mc-pos-list-card__title">{sede.nombre}</h3>
                {sede.direccion && <p className="mc-pos-list-card__meta">{sede.direccion}</p>}
              </div>
              <span className={`mc-pos-badge ${sede.activa ? 'mc-pos-badge--ok' : 'mc-pos-badge--off'}`}>
                {sede.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="mc-pos-list-card__flags">
              <label className="mc-pos-check mc-pos-check--inline">
                <input
                  type="checkbox"
                  checked={sede.mostrarEnTiendaVirtual === true}
                  onChange={() => toggleVirtual(sede)}
                />
                Tienda virtual
              </label>
            </div>
            <div className="mc-pos-list-card__actions">
              <button type="button" className="mc-landing-btn-secondary text-sm" onClick={() => abrirEditor(sede)}>
                Impresora y cajón
              </button>
              <button type="button" className="mc-landing-btn-ghost text-sm" onClick={() => toggleActiva(sede)}>
                {sede.activa ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </article>
        ))}
        {!loading && sedes.length === 0 && (
          <p className="mc-pos-muted">Aún no hay sedes. Creá la primera con el botón Nuevo.</p>
        )}
      </div>

      {nuevoAbierto && (
        <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="mc-pos-modal">
            <h2 className="mc-pos-modal__title">Nueva sede</h2>
            <form className="mc-pos-form-grid" onSubmit={crearSede}>
              <label className="mc-pos-field mc-pos-field--full">
                <span>Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
              </label>
              <label className="mc-pos-field mc-pos-field--full">
                <span>Dirección</span>
                <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Opcional" />
              </label>
              <label className="mc-pos-check mc-pos-field--full">
                <input
                  type="checkbox"
                  checked={mostrarVirtual}
                  onChange={(e) => setMostrarVirtual(e.target.checked)}
                />
                Mostrar inventario en tienda virtual
              </label>
              <div className="mc-pos-modal__actions mc-pos-field--full">
                <button type="button" className="mc-landing-btn-ghost" onClick={cerrarNuevo}>
                  Cancelar
                </button>
                <button type="submit" className="mc-landing-btn-primary" disabled={saving}>
                  {saving ? 'Creando…' : 'Crear sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingId && (
        <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="mc-pos-modal">
            <h2 className="mc-pos-modal__title">Hardware POS — {editing?.nombre}</h2>
            <div className="mc-pos-form-grid">
              <label className="mc-pos-check">
                <input
                  type="checkbox"
                  checked={editPos.imprimirTicketAutomatico !== false}
                  onChange={(e) => setEditPos((p) => ({ ...p, imprimirTicketAutomatico: e.target.checked }))}
                />
                Imprimir ticket automático
              </label>
              <label className="mc-pos-check">
                <input
                  type="checkbox"
                  checked={editPos.abrirCajonEnVenta !== false}
                  onChange={(e) => setEditPos((p) => ({ ...p, abrirCajonEnVenta: e.target.checked }))}
                />
                Abrir cajón monedero en venta
              </label>
              <label className="mc-pos-field">
                <span>Nombre impresora</span>
                <input
                  value={editPos.nombreImpresora ?? ''}
                  onChange={(e) => setEditPos((p) => ({ ...p, nombreImpresora: e.target.value }))}
                />
              </label>
              <label className="mc-pos-field">
                <span>URL bridge local</span>
                <input
                  value={editPos.urlBridge ?? ''}
                  onChange={(e) => setEditPos((p) => ({ ...p, urlBridge: e.target.value }))}
                  placeholder="http://127.0.0.1:9123"
                />
              </label>
              <label className="mc-pos-field">
                <span>Pin cajón (0=Epson pin2, 1=pin5)</span>
                <select
                  value={editPos.cajonPin ?? 0}
                  onChange={(e) => setEditPos((p) => ({ ...p, cajonPin: Number(e.target.value) as 0 | 1 }))}
                >
                  <option value={0}>0 — Pin 2</option>
                  <option value={1}>1 — Pin 5</option>
                </select>
              </label>
            </div>
            <p className="mc-pos-muted text-sm">
              Instalá el bridge POS en la PC de caja (puerto 9123) para imprimir tickets y abrir el cajón.
            </p>
            <PosBridgeDownloadButton />
            <div className="mc-pos-modal__actions">
              <button type="button" className="mc-landing-btn-ghost" onClick={() => setEditingId(null)}>
                Cancelar
              </button>
              <button type="button" className="mc-landing-btn-primary" disabled={saving} onClick={guardarPos}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
