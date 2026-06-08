import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { mapFirestoreDataToMcUser, resolveMcHomePath } from '@/lib/mcUserFromFirestore'
import { AuthBrandHeader } from '@/brand/AuthBrandHeader'

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
      const cred = await signInWithEmailAndPassword(getAuthApp(), email.trim(), password)
      const userSnap = await getDoc(doc(getDb(), MC.users, cred.user.uid))
      const mapped = userSnap.exists()
        ? mapFirestoreDataToMcUser(userSnap.id, userSnap.data())
        : null
      nav(resolveMcHomePath(mapped), { replace: true })
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
        <AuthBrandHeader subtitle="Ingresá a tu tienda" />
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
          {err && <p className="text-[15px] leading-relaxed text-red-800">{err}</p>}
          <button type="submit" disabled={busy} className="mc-btn-primary w-full">
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-8 text-center ios-subhead">
          ¿No tenés cuenta?{' '}
          <Link
            to="/registro"
            className="font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition duration-200 ease-in-out hover:opacity-70"
          >
            Crear tienda
          </Link>
        </p>
      </div>
    </div>
  )
}
