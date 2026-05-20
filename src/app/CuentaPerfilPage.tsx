import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

export function CuentaPerfilPage() {
  const { profile, firebaseUser } = useMcAuth()
  const [ownerDisplayName, setOwnerDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setOwnerDisplayName(profile?.displayName?.trim() ?? '')
  }, [profile?.displayName])

  async function guardar() {
    if (!profile?.uid) return
    setBusy(true)
    setMsg(null)
    try {
      const dn = ownerDisplayName.trim()
      await updateDoc(doc(getDb(), MC.users, profile.uid), { displayName: dn })
      if (firebaseUser) await updateProfile(firebaseUser, { displayName: dn })
      setMsg('Guardado.')
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfiguracionesSubpageLayout title="Tu perfil">
      <div className="mc-card space-y-4">
        <div>
          <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Tu nombre (opcional)</label>
          <input
            className="mc-input"
            value={ownerDisplayName}
            onChange={(e) => setOwnerDisplayName(e.target.value)}
            placeholder="Cómo te mostramos en el panel"
            autoComplete="name"
            disabled={busy}
          />
          <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">Solo visible para vos en el panel.</p>
        </div>
        {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar
        </button>
      </div>
      {firebaseUser?.email && (
        <p className="text-center ios-footnote text-[var(--cat-muted)]">{firebaseUser.email}</p>
      )}
    </ConfiguracionesSubpageLayout>
  )
}
