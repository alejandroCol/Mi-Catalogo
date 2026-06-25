import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosVendors } from '@/pos/hooks/usePosVendors'
import { PosPageHeader } from '@/pos/components/PosPageHeader'

export function PosVendedoresPage() {
  const { tenant, profile } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const { sedes } = usePosSedes(tenantId)
  const { vendors, loading, error: vendorsError } = usePosVendors(tenantId)
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [posSedeId, setPosSedeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [editUid, setEditUid] = useState<string | null>(null)
  const [editSedeId, setEditSedeId] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [resetUid, setResetUid] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')

  function cerrarNuevo() {
    setNuevoAbierto(false)
    setDisplayName('')
    setEmail('')
    setPassword('')
    setPosSedeId('')
  }

  async function crearVendedor(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !firebaseConfigured) return
    setSaving(true)
    setMsg(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcCreatePosVendor')
      await fn({ tenantId, email, password, displayName, posSedeId })
      cerrarNuevo()
      setMsg('Vendedor creado. Ya puede ingresar al módulo POS.')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'No se pudo crear el vendedor.'
      setMsg(message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActivo(vendorUid: string, active: boolean) {
    if (!tenantId || !firebaseConfigured) return
    const fn = httpsCallable(getFirebaseFunctions(), 'mcSetPosVendorActive')
    await fn({ tenantId, vendorUid, active: !active })
  }

  function abrirEditar(vendorUid: string, nombre: string, sedeId?: string) {
    setEditUid(vendorUid)
    setEditNombre(nombre)
    setEditSedeId(sedeId ?? '')
  }

  async function guardarEdicion() {
    if (!tenantId || !editUid || !firebaseConfigured) return
    setSaving(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcUpdatePosVendor')
      await fn({ tenantId, vendorUid: editUid, posSedeId: editSedeId, displayName: editNombre })
      setEditUid(null)
      setMsg('Vendedor actualizado.')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'No se pudo actualizar.'
      setMsg(message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmarReset() {
    if (!tenantId || !resetUid || resetPassword.length < 8 || !firebaseConfigured) return
    setSaving(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcResetPosVendorPassword')
      await fn({ tenantId, vendorUid: resetUid, password: resetPassword })
      setResetUid(null)
      setResetPassword('')
      setMsg('Contraseña actualizada.')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'No se pudo resetear la contraseña.'
      setMsg(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mc-pos-page">
      <PosPageHeader
        icon="vendedores"
        eyebrow="Equipo"
        title="Vendedores POS"
        subtitle="Cajeros con acceso al módulo de ventas, caja e inventario (solo lectura)."
        action={
          <button
            type="button"
            className="mc-landing-btn-primary text-sm"
            disabled={sedes.filter((s) => s.activa).length === 0}
            onClick={() => setNuevoAbierto(true)}
          >
            + Nuevo
          </button>
        }
      />

      {msg && (
        <p className="mc-pos-status" role="status">
          {msg}
        </p>
      )}
      {vendorsError && (
        <p className="mc-pos-status mc-pos-status--error" role="alert">
          {vendorsError}
        </p>
      )}

      <div className="mc-pos-list">
        {loading && <p className="mc-pos-muted">Cargando…</p>}
        {vendors.map((v) => {
          const sede = sedes.find((s) => s.id === v.posSedeId)
          return (
            <article key={v.uid} className="mc-pos-list-card">
              <div className="mc-pos-list-card__head">
                <div>
                  <h3 className="mc-pos-list-card__title">{v.displayName}</h3>
                  <p className="mc-pos-list-card__meta">{v.email}</p>
                  {sede && (
                    <p className="mc-pos-list-card__meta">
                      {sede.codigo} — {sede.nombre}
                    </p>
                  )}
                </div>
                <span className={`mc-pos-badge ${v.active !== false ? 'mc-pos-badge--ok' : 'mc-pos-badge--off'}`}>
                  {v.active !== false ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="mc-pos-list-card__actions">
                <button
                  type="button"
                  className="mc-landing-btn-ghost text-sm"
                  onClick={() => abrirEditar(v.uid, v.displayName, v.posSedeId)}
                >
                  Cambiar sede
                </button>
                <button
                  type="button"
                  className="mc-landing-btn-ghost text-sm"
                  onClick={() => setResetUid(v.uid)}
                >
                  Reset contraseña
                </button>
                <button
                  type="button"
                  className="mc-landing-btn-ghost text-sm"
                  onClick={() => toggleActivo(v.uid, v.active !== false)}
                >
                  {v.active !== false ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </article>
          )
        })}
        {!loading && vendors.length === 0 && (
          <p className="mc-pos-muted">Aún no hay vendedores POS. Creá el primero con el botón Nuevo.</p>
        )}
      </div>

      {nuevoAbierto && (
        <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="mc-pos-modal mc-pos-modal--wide">
            <h2 className="mc-pos-modal__title">Nuevo vendedor</h2>
            <form className="mc-pos-form-grid" onSubmit={crearVendedor}>
              <label className="mc-pos-field">
                <span>Nombre</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoFocus />
              </label>
              <label className="mc-pos-field">
                <span>Correo</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label className="mc-pos-field">
                <span>Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <label className="mc-pos-field">
                <span>Sede</span>
                <select value={posSedeId} onChange={(e) => setPosSedeId(e.target.value)} required>
                  <option value="">Seleccionar…</option>
                  {sedes
                    .filter((s) => s.activa)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.codigo} — {s.nombre}
                      </option>
                    ))}
                </select>
              </label>
              <div className="mc-pos-modal__actions mc-pos-field--full">
                <button type="button" className="mc-landing-btn-ghost" onClick={cerrarNuevo}>
                  Cancelar
                </button>
                <button type="submit" className="mc-landing-btn-primary" disabled={saving}>
                  {saving ? 'Creando…' : 'Crear vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUid && (
        <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="mc-pos-modal">
            <h2 className="mc-pos-modal__title">Editar vendedor</h2>
            <label className="mc-pos-field">
              <span>Nombre</span>
              <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
            </label>
            <label className="mc-pos-field">
              <span>Sede</span>
              <select value={editSedeId} onChange={(e) => setEditSedeId(e.target.value)}>
                {sedes
                  .filter((s) => s.activa)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.codigo} — {s.nombre}
                    </option>
                  ))}
              </select>
            </label>
            <div className="mc-pos-modal__actions">
              <button type="button" className="mc-landing-btn-ghost" onClick={() => setEditUid(null)}>
                Cancelar
              </button>
              <button type="button" className="mc-landing-btn-primary" disabled={saving} onClick={guardarEdicion}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {resetUid && (
        <div className="mc-pos-modal-overlay" role="dialog" aria-modal="true">
          <div className="mc-pos-modal">
            <h2 className="mc-pos-modal__title">Nueva contraseña</h2>
            <label className="mc-pos-field">
              <span>Contraseña (mín. 8 caracteres)</span>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={8}
              />
            </label>
            <div className="mc-pos-modal__actions">
              <button type="button" className="mc-landing-btn-ghost" onClick={() => setResetUid(null)}>
                Cancelar
              </button>
              <button type="button" className="mc-landing-btn-primary" disabled={saving} onClick={confirmarReset}>
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
