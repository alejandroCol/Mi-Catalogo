import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { mcRegisterProveedor } from '@/lib/mcProveedorWrites'

export function ProveedorOnboardingPage() {
  const { firebaseUser, effectiveTenantId, tenant } = useMcAuth()
  const navigate = useNavigate()
  const { showSaveSuccess } = useSaveSuccess()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showExtra, setShowExtra] = useState(false)

  const [nombre, setNombre] = useState(tenant?.nombreTienda ?? '')
  const [whatsapp, setWhatsapp] = useState(tenant?.whatsappNumero ?? '')
  const [ciudadBodega, setCiudadBodega] = useState('')
  const [email, setEmail] = useState(firebaseUser?.email ?? '')
  const [direccionBodega, setDireccionBodega] = useState('')
  const [departamentoBodega, setDepartamentoBodega] = useState('')
  const [horariosDespacho, setHorariosDespacho] = useState('Lun–Vie 9:00–17:00')
  const [bancoNombre, setBancoNombre] = useState('')
  const [bancoNumeroCuenta, setBancoNumeroCuenta] = useState('')
  const [bancoTitular, setBancoTitular] = useState('')
  const [bio, setBio] = useState('')

  const canSubmit =
    nombre.trim().length >= 2 && whatsapp.trim().length >= 7 && ciudadBodega.trim().length >= 2

  async function finish() {
    if (!firebaseUser || !canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const { id } = await mcRegisterProveedor({
        ownerUid: firebaseUser.uid,
        sourceTenantId: effectiveTenantId || undefined,
        nombre,
        whatsapp,
        email,
        ciudadBodega,
        departamentoBodega,
        direccionBodega,
        horariosDespacho,
        logisticaModo: 'manual',
        bancoNombre,
        bancoTipoCuenta: 'Ahorros',
        bancoNumeroCuenta,
        bancoTitular,
        bio,
      })
      showSaveSuccess({ message: 'Perfil proveedor listo' })
      navigate(`/app/proveedor?id=${id}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el perfil')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to="/app/proveedores" label="← Proveedores" />
        <h1 className="ios-large-title mt-3">Ser proveedor</h1>
        <p className="ios-subhead mt-2 max-w-lg leading-relaxed text-[var(--cat-muted)]">
          Publicá tu bodega para que otras tiendas importen tus productos. Cuando vendan, te llega
          el pedido para despachar.
        </p>
      </div>

      <div className="mc-card space-y-4">
        <label className="block">
          <span className="text-[13px] font-medium">Nombre comercial</span>
          <input
            className="mc-input mt-1"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="organization"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium">WhatsApp</span>
          <input
            className="mc-input mt-1"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            placeholder="3001234567"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium">Ciudad de bodega</span>
          <input
            className="mc-input mt-1"
            value={ciudadBodega}
            onChange={(e) => setCiudadBodega(e.target.value)}
            placeholder="Medellín"
          />
        </label>

        <button
          type="button"
          className="text-[13px] font-medium text-[var(--cat-muted)] underline underline-offset-2"
          onClick={() => setShowExtra((v) => !v)}
        >
          {showExtra ? 'Ocultar datos opcionales' : 'Agregar dirección, banco u otros (opcional)'}
        </button>

        {showExtra ? (
          <div className="space-y-4 border-t border-neutral-100 pt-4">
            <label className="block">
              <span className="text-[13px] font-medium">Email</span>
              <input
                className="mc-input mt-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium">Departamento</span>
              <input
                className="mc-input mt-1"
                value={departamentoBodega}
                onChange={(e) => setDepartamentoBodega(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium">Dirección de bodega</span>
              <input
                className="mc-input mt-1"
                value={direccionBodega}
                onChange={(e) => setDireccionBodega(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium">Horarios de despacho</span>
              <input
                className="mc-input mt-1"
                value={horariosDespacho}
                onChange={(e) => setHorariosDespacho(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium">Bio corta</span>
              <textarea
                className="mc-input mt-1 min-h-[68px]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Qué vendés y a qué ciudades despachás…"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium">Banco</span>
              <input
                className="mc-input mt-1"
                value={bancoNombre}
                onChange={(e) => setBancoNombre(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium">Número de cuenta</span>
              <input
                className="mc-input mt-1"
                value={bancoNumeroCuenta}
                onChange={(e) => setBancoNumeroCuenta(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium">Titular</span>
              <input
                className="mc-input mt-1"
                value={bancoTitular}
                onChange={(e) => setBancoTitular(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</p>
        ) : null}

        <button
          type="button"
          className="mc-btn-primary w-full"
          disabled={busy || !canSubmit}
          onClick={() => void finish()}
        >
          {busy ? 'Creando…' : 'Activar proveedor'}
        </button>
      </div>
    </div>
  )
}
