import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { firebaseConfigured, getAuthApp } from '@/lib/firebase'
import { IconPhotoStack } from '@/icons/McIcons'

export function LoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!firebaseConfigured) {
      setErr('Configura Firebase (.env).')
      return
    }
    setBusy(true)
    try {
      await signInWithEmailAndPassword(getAuthApp(), email.trim(), password)
      nav('/app', { replace: true })
    } catch {
      setErr('No pudimos iniciar sesión. Revisa correo y contraseña.')
    } finally {
      setBusy(false)
    }
  }

  if (!firebaseConfigured) {
    return (
      <div className="mc-page flex items-center justify-center p-6">
        <p className="ios-subhead text-center">Copiá `.env.example` a `.env` en mi-catalogo y completá Firebase.</p>
      </div>
    )
  }

  return (
    <div className="mc-page flex min-h-svh flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-ios-blue/12 text-ios-blue">
            <IconPhotoStack size={32} />
          </div>
          <h1 className="ios-large-title text-center">Mi Catálogo</h1>
          <p className="ios-subhead text-center">Ingresá a tu tienda</p>
        </div>
        <form onSubmit={onSubmit} className="mc-card space-y-5">
          <div>
            <label className="ios-footnote font-medium text-mc-700">Correo</label>
            <input
              type="email"
              autoComplete="email"
              className="mc-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              className="mc-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <p className="text-[15px] text-ios-red">{err}</p>}
          <button type="submit" disabled={busy} className="mc-btn-primary w-full">
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-8 text-center ios-subhead">
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="font-semibold text-ios-blue">
            Crear tienda
          </Link>
        </p>
      </div>
    </div>
  )
}
