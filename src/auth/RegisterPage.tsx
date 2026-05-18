import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, deleteUser, updateProfile } from 'firebase/auth'
import type { UserCredential } from 'firebase/auth'
import { collection, deleteDoc, doc, setDoc, writeBatch } from 'firebase/firestore'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { MC_TRIAL_DAYS, trialEndMs } from '@/lib/subscription'
import { markPendingSellerOnboarding } from '@/lib/onboardingStorage'
import { resolveAvailablePublicSlug, slugifyStoreName } from '@/lib/publicSlug'
import { combineWaDigits, DEFAULT_WA_PREFIX, WA_COUNTRY_PREFIXES } from '@/lib/waPhonePrefixes'
import { IconPhotoStack } from '@/icons/McIcons'

type StepId = 'tienda' | 'whatsapp' | 'email' | 'clave'

const STEPS: StepId[] = ['tienda', 'whatsapp', 'email', 'clave']

function stepIndex(id: StepId) {
  return STEPS.indexOf(id)
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export function RegisterPage() {
  const nav = useNavigate()
  const [step, setStep] = useState<StepId>('tienda')
  const [nombreTienda, setNombreTienda] = useState('')
  const [waPrefix, setWaPrefix] = useState(DEFAULT_WA_PREFIX)
  const [waLocal, setWaLocal] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const slugPreview = useMemo(() => slugifyStoreName(nombreTienda), [nombreTienda])

  useEffect(() => {
    setErr(null)
  }, [step])

  function validateCurrent(partial?: { step?: StepId }): string | null {
    const s = partial?.step ?? step
    if (s === 'tienda') {
      const t = nombreTienda.trim()
      if (t.length < 2) {
        return 'Escribí el nombre de tu tienda.'
      }
      if (slugPreview.length < 3) {
        return 'El nombre debe generar una URL de al menos 3 letras o números. Agregá palabras o números.'
      }
    }
    if (s === 'whatsapp') {
      const full = combineWaDigits(waPrefix, waLocal)
      if (full.replace(/\D/g, '').length < 10) {
        return 'Ingresá un WhatsApp válido (número local sin 0 inicial).'
      }
      if (full.replace(/\D/g, '').length > 15) {
        return 'El número parece demasiado largo. Revisalo.'
      }
    }
    if (s === 'email') {
      if (!email.trim()) {
        return 'Ingresá tu correo.'
      }
      if (!emailOk(email)) {
        return 'Correo no válido.'
      }
    }
    if (s === 'clave') {
      if (password.length < 6) {
        return 'La contraseña debe tener al menos 6 caracteres.'
      }
    }
    return null
  }

  function goNext() {
    setErr(null)
    const e = validateCurrent()
    if (e) {
      setErr(e)
      return
    }
    const i = stepIndex(step)
    if (i < STEPS.length - 1) {
      setStep(STEPS[i + 1]!)
    }
  }

  function goBack() {
    setErr(null)
    const i = stepIndex(step)
    if (i > 0) {
      setStep(STEPS[i - 1]!)
    }
  }

  async function submitRegister() {
    setErr(null)
    if (!firebaseConfigured) {
      setErr('Configura Firebase.')
      return
    }
    const eTienda = validateCurrent({ step: 'tienda' })
    const eWa = validateCurrent({ step: 'whatsapp' })
    const eMail = validateCurrent({ step: 'email' })
    const ePw = validateCurrent({ step: 'clave' })
    const first = eTienda ?? eWa ?? eMail ?? ePw
    if (first) {
      setErr(first)
      return
    }

    setBusy(true)
    let cred: UserCredential | null = null
    let tid: string | null = null
    try {
      const db = getDb()
      const sl = await resolveAvailablePublicSlug(db, nombreTienda)

      const auth = getAuthApp()
      cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const wa = combineWaDigits(waPrefix, waLocal).replace(/\D/g, '')
      const friendlyName = nombreTienda.trim()
      await updateProfile(cred.user, { displayName: friendlyName })

      const newTenantRef = doc(collection(db, MC.tenants))
      tid = newTenantRef.id
      const emailNorm = (cred.user.email ?? email.trim()).toLowerCase()

      const batch = writeBatch(db)
      batch.set(newTenantRef, {
        ownerUid: cred.user.uid,
        slug: sl,
        nombreTienda: nombreTienda.trim(),
        whatsappNumero: wa,
        mensajeIntro: '',
        subscriptionEndsAt: trialEndMs(),
        createdAt: Date.now(),
        billingPlan: 'free',
      })
      batch.set(doc(db, MC.users, cred.user.uid), {
        uid: cred.user.uid,
        email: emailNorm,
        displayName: friendlyName,
        tenantId: tid,
        isSuperAdmin: false,
        createdAt: Date.now(),
      })
      await batch.commit()

      await setDoc(doc(db, MC.slugs, sl), {
        tenantId: tid,
        active: true,
        updatedAt: Date.now(),
      })

      markPendingSellerOnboarding(tid)
      nav('/app', { replace: true })
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : ''
      if (cred?.user && tid) {
        try {
          await deleteDoc(doc(getDb(), MC.users, cred.user.uid))
          await deleteDoc(doc(getDb(), MC.tenants, tid))
        } catch {
          /* best-effort */
        }
      }
      if (cred?.user && code !== 'auth/email-already-in-use') {
        try {
          await deleteUser(cred.user)
        } catch {
          /* */
        }
      }
      if (code === 'auth/email-already-in-use') {
        setErr('Ese correo ya está registrado. Probá iniciar sesión.')
      } else if (code === 'permission-denied') {
        setErr(
          'Permiso denegado en Firestore. Revisá que las reglas estén desplegadas en este proyecto y que Authentication esté activo.',
        )
      } else if (e instanceof Error && e.message === 'slug_too_short') {
        setErr('La URL generada es demasiado corta. Elegí un nombre de tienda más descriptivo.')
      } else {
        setErr(
          code
            ? `No se pudo crear la tienda (${code}).`
            : 'No se pudo crear la tienda. Probá de nuevo en unos segundos.',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const currentIndex = stepIndex(step)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="mc-page relative min-h-svh overflow-x-hidden px-4 py-8 pb-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border border-neutral-200/60 text-mc-900">
            <IconPhotoStack size={28} />
          </div>
          <h1 className="ios-large-title text-center tracking-tighter">Crear tienda</h1>
          <p className="ios-subhead max-w-sm px-2 text-center leading-relaxed">
            {MC_TRIAL_DAYS} días gratis. Unos pasos y listo.
          </p>
        </div>

        <div className="mb-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={STEPS[i]}
              className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                i <= currentIndex ? 'bg-mc-900' : 'bg-mc-200'
              }`}
              aria-hidden
            />
          ))}
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.repeat) return
            const t = e.target
            if (!(t instanceof HTMLInputElement)) return
            e.preventDefault()
            if (step === 'clave') {
              void submitRegister()
            } else {
              goNext()
            }
          }}
        >
          <div key={step} className="mc-reg-step-animate mc-card space-y-5">
            {step === 'tienda' && (
              <>
                <div>
                  <label className="ios-footnote font-medium text-mc-700">Nombre de tu tienda</label>
                  <input
                    className="mc-input mt-1.5"
                    value={nombreTienda}
                    onChange={(e) => setNombreTienda(e.target.value)}
                    autoComplete="organization"
                    autoFocus
                    placeholder="Ej. Flores del Valle"
                  />
                </div>
                <div className="rounded-md border border-neutral-200/60 bg-mc-50/80 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">Tu catálogo público</p>
                  <p className="mt-1 break-all text-[14px] font-medium text-mc-900">
                    {slugPreview.length >= 3 ? (
                      <>
                        {origin}
                        /c/{slugPreview}
                      </>
                    ) : (
                      <span className="text-mc-400">Se genera al escribir el nombre</span>
                    )}
                  </p>
                </div>
              </>
            )}

            {step === 'whatsapp' && (
              <div>
                <label className="ios-footnote font-medium text-mc-700">WhatsApp para pedidos</label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    className="mc-input max-w-[42%] shrink-0 py-3 text-[14px]"
                    value={waPrefix}
                    onChange={(e) => setWaPrefix(e.target.value)}
                    aria-label="Código de país"
                  >
                    {WA_COUNTRY_PREFIXES.map((p) => (
                      <option key={p.dial} value={p.dial}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="mc-input min-w-0 flex-1"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="300 123 4567"
                    value={waLocal}
                    onChange={(e) => setWaLocal(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {step === 'email' && (
              <div>
                <label className="ios-footnote font-medium text-mc-700">Correo</label>
                <input
                  type="email"
                  className="mc-input mt-1.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            )}

            {step === 'clave' && (
              <div>
                <label className="ios-footnote font-medium text-mc-700">Contraseña</label>
                <input
                  type="password"
                  className="mc-input mt-1.5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
            )}
          </div>

          {err && <p className="text-[15px] leading-relaxed text-red-800">{err}</p>}

          <div className="flex gap-3">
            {currentIndex > 0 && (
              <button type="button" className="mc-btn-secondary flex-1 py-3.5" onClick={goBack} disabled={busy}>
                Atrás
              </button>
            )}
            {step !== 'clave' ? (
              <button type="button" className="mc-btn-primary flex-1 py-3.5" onClick={goNext}>
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                className="mc-btn-primary flex-1 py-3.5"
                onClick={() => void submitRegister()}
              >
                {busy ? 'Creando…' : 'Crear mi catálogo'}
              </button>
            )}
          </div>
        </form>

        <p className="mt-8 text-center ios-subhead">
          ¿Ya tenés cuenta?{' '}
          <Link
            to="/login"
            className="font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition duration-200 ease-in-out hover:opacity-70"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
