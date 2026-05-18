import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { reload, signOut } from 'firebase/auth'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getAuthApp } from '@/lib/firebase'
import { callMcSendAuthVerificationEmail } from '@/lib/mcSendAuthVerificationEmail'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { IconPhotoStack } from '@/icons/McIcons'

const RESEND_COOLDOWN_MS = 60_000

export function VerifyEmailPage() {
  const nav = useNavigate()
  const location = useLocation()
  const { firebaseUser, profile, loading } = useMcAuth()
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  /** Forces re-render every second while a cooldown timestamp is active (Math.ceil of remaining time). */
  const [, setCooldownTick] = useState(0)

  const email = firebaseUser?.email ?? ''

  useEffect(() => {
    if (!firebaseConfigured || loading) return
    if (!firebaseUser) {
      nav('/login', { replace: true })
      return
    }
    if (firebaseUser.emailVerified || isMcSuperAdminUser(profile)) {
      nav('/app', { replace: true })
    }
  }, [firebaseUser, profile, loading, nav])

  useEffect(() => {
    if (!firebaseUser || firebaseUser.emailVerified) return
    let cancelled = false
    void (async () => {
      try {
        await reload(firebaseUser)
        if (!cancelled && getAuthApp().currentUser?.emailVerified) {
          nav('/app', { replace: true })
        }
      } catch {
        /* ignorar */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [firebaseUser, nav])

  useEffect(() => {
    if (cooldownUntil <= 0) return
    const id = setInterval(() => {
      setCooldownTick((n) => n + 1)
      if (Date.now() >= cooldownUntil) {
        setCooldownUntil(0)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [cooldownUntil])

  useEffect(() => {
    const st = location.state as { verifySendError?: string } | null | undefined
    if (st?.verifySendError) {
      setErr(st.verifySendError)
      nav(`${location.pathname}${location.search}`, { replace: true, state: null })
    }
  }, [location.pathname, location.search, location.state, nav])

  useEffect(() => {
    const raw = sessionStorage.getItem('mcVerifyEmailCooldownUntil')
    if (!raw) return
    sessionStorage.removeItem('mcVerifyEmailCooldownUntil')
    const until = Number(raw)
    if (Number.isFinite(until) && until > Date.now()) {
      setCooldownUntil(until)
      setInfo(
        'Hay que esperar un poco entre un envío y otro. Cuando termine el temporizador podés usar «Reenviar correo».',
      )
    }
  }, [])

  async function resend() {
    setErr(null)
    setInfo(null)
    const u = getAuthApp().currentUser
    if (!u) return
    if (cooldownUntil > Date.now()) return
    setBusy(true)
    try {
      const r = await callMcSendAuthVerificationEmail()
      if (r.ok) {
        setInfo('Te enviamos otro correo. Revisá la carpeta de spam.')
        setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
      } else if (r.code === 'functions/resource-exhausted') {
        setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
        setInfo(
          'Demasiados intentos seguidos. Cuando el contador llegue a 0 podés pedir otro correo.',
        )
      } else {
        setErr(
          r.message ||
            `No pudimos reenviar el correo${r.code ? ` (${r.code})` : ''}. Intentá más tarde.`,
        )
      }
    } finally {
      setBusy(false)
    }
  }

  async function yaConfirme() {
    setErr(null)
    setInfo(null)
    const auth = getAuthApp()
    const u = auth.currentUser
    if (!u) return
    setBusy(true)
    try {
      await reload(u)
      if (auth.currentUser?.emailVerified) {
        nav('/app', { replace: true })
        return
      }
      setErr('Todavía no vemos la confirmación. Abrí el enlace del último correo o tocá «Reenviar».')
    } catch {
      setErr('No pudimos actualizar el estado. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function cerrarSesion() {
    await signOut(getAuthApp())
    nav('/login', { replace: true })
  }

  if (!firebaseConfigured) {
    return (
      <div className="mc-page flex items-center justify-center p-6">
        <p className="ios-subhead text-center">Configurá Firebase en <code className="text-mc-900">.env</code>.</p>
      </div>
    )
  }

  const cooldownSecs = cooldownUntil > Date.now() ? Math.ceil((cooldownUntil - Date.now()) / 1000) : 0

  return (
    <div className="mc-page flex min-h-svh flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border border-neutral-200/60 text-mc-900">
            <IconPhotoStack size={28} />
          </div>
          <h1 className="ios-large-title text-center tracking-tighter">Confirmá tu correo</h1>
          <p className="ios-subhead max-w-sm text-center leading-relaxed">
            Te enviamos un mensaje con un <strong className="font-medium text-mc-900">enlace seguro</strong> para validar que el correo es tuyo y activar tu cuenta.
          </p>
        </div>

        <div className="mc-card space-y-5">
          {email ? (
            <p className="text-[15px] leading-relaxed text-mc-800">
              Lo mandamos a{' '}
              <span className="break-all font-medium text-mc-900">{email}</span>. Cuando hagas clic en el enlace del correo,
              volvé acá y tocá «Ya confirmé».
            </p>
          ) : null}

          <p className="text-[13px] leading-relaxed text-mc-600">
            El mensaje puede tardar uno o dos minutos; revisá también spam o promociones.
          </p>

          {info && <p className="text-[15px] leading-relaxed text-emerald-800">{info}</p>}
          {err && <p className="text-[15px] leading-relaxed text-red-800">{err}</p>}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              className="mc-btn-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void yaConfirme()}
            >
              {busy ? 'Comprobando…' : 'Ya confirmé mi correo'}
            </button>
            <button
              type="button"
              disabled={busy || cooldownSecs > 0}
              className="mc-btn-secondary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void resend()}
            >
              {cooldownSecs > 0 ? `Reenviar en ${cooldownSecs}s` : busy ? 'Enviando…' : 'Reenviar correo'}
            </button>
          </div>

          {cooldownSecs > 0 ? (
            <p className="text-center text-[14px] leading-relaxed text-mc-600">
              Podés pedir otro correo en <span className="font-semibold tabular-nums text-mc-900">{cooldownSecs}s</span>.
            </p>
          ) : null}

          <div className="border-t border-neutral-200/60 pt-4">
            <button type="button" className="text-[14px] font-medium text-mc-600 underline underline-offset-4" onClick={() => void cerrarSesion()}>
              Cerrar sesión y usar otro correo
            </button>
          </div>
        </div>

        <p className="mt-8 text-center ios-subhead">
          ¿Correo equivocado en el registro?{' '}
          <Link to="/login" className="font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4">
            Entrá y cerrá sesión
          </Link>{' '}
          o creá una cuenta nueva.
        </p>
      </div>
    </div>
  )
}
