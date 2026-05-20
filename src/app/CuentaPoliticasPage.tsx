import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

export function CuentaPoliticasPage() {
  const { profile, tenant } = useMcAuth()
  const [politicasCambios, setPoliticasCambios] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant) return
    setPoliticasCambios(tenant.politicasCambios ?? '')
  }, [tenant])

  async function guardar() {
    if (!profile?.tenantId) return
    setBusy(true)
    setMsg(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), {
        politicasCambios: politicasCambios.trim() || '',
      })
      setMsg('Guardado.')
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  const politicasUrl = tenant?.slug ? `/c/${tenant.slug}/politicas` : null

  return (
    <ConfiguracionesSubpageLayout title="Políticas del catálogo">
      <div className="mc-card space-y-4">
        <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
          Texto en la página <strong className="font-medium text-[var(--cat-text)]">Políticas</strong> del catálogo
          público{politicasUrl ? ` (${politicasUrl})` : ''}. Dejá en blanco lo que no quieras mostrar.
        </p>
        <div>
          <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Cambios y devoluciones</label>
          <textarea
            className="mc-input mt-1 min-h-[120px] resize-y"
            value={politicasCambios}
            disabled={busy}
            onChange={(e) => setPoliticasCambios(e.target.value)}
            placeholder="Plazos, condiciones…"
          />
        </div>
        {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar
        </button>
      </div>
    </ConfiguracionesSubpageLayout>
  )
}
