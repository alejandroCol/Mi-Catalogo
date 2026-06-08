import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, deleteUser, updateProfile } from 'firebase/auth'
import type { UserCredential } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore'
import { PlatformTermsModal } from '@/components/legal/PlatformTermsModal'
import { PublicStoreSlugField } from '@/components/store/PublicStoreSlugField'
import { StorePublicHostDisplay } from '@/components/store/StorePublicHostDisplay'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC, mcLegalAcceptanceDoc } from '@/lib/mcCollections'
import { hashTermsContent, resolvePlatformTerms } from '@/lib/platformTerms'
import type { McLegalAcceptance, McPlatformSettings } from '@/types/mc'
import { markPendingSellerOnboarding } from '@/lib/onboardingStorage'
import {
  assertPublicSlugAvailableForRegistration,
  formatPublicSlugHostPreview,
  publicSlugValidationMessage,
} from '@/lib/publicSlug'
import { useRegisterStoreSlug } from '@/auth/useRegisterStoreSlug'
import { combineWaDigits, DEFAULT_WA_PREFIX, WA_COUNTRY_PREFIXES } from '@/lib/waPhonePrefixes'
import { callMcSendAuthVerificationEmail } from '@/lib/mcSendAuthVerificationEmail'
import { trackMcEvent, MC_ANALYTICS_EVENTS } from '@/lib/mcAnalytics'
import { AuthBrandHeader } from '@/brand/AuthBrandHeader'

const VERIFY_EMAIL_COOLDOWN_MS = 60_000

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
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsModalOpen, setTermsModalOpen] = useState(false)
  const [termsLoading, setTermsLoading] = useState(true)
  const [platformTerms, setPlatformTerms] = useState(() => resolvePlatformTerms(null))

  const db = useMemo(() => (firebaseConfigured ? getDb() : null), [])
  const slugState = useRegisterStoreSlug(db, nombreTienda)

  useEffect(() => {
    if (!firebaseConfigured) {
      setTermsLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
        if (cancelled) return
        const data = snap.exists() ? (snap.data() as McPlatformSettings) : null
        setPlatformTerms(resolvePlatformTerms(data))
      } catch {
        if (!cancelled) setPlatformTerms(resolvePlatformTerms(null))
      } finally {
        if (!cancelled) setTermsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
      if (slugState.slugFromName.length < 3) {
        return 'El nombre debe generar una URL de al menos 3 letras o números. Agregá palabras o números.'
      }
      if (slugState.effectiveProbe.status === 'checking') {
        return 'Estamos comprobando tu enlace. Esperá un segundo.'
      }
      if (slugState.needsCustomSlug) {
        if (!slugState.customSlugInput.trim()) {
          return 'Elegí otro enlace para tu catálogo.'
        }
        if (slugState.effectiveProbe.status === 'taken') {
          return 'Ese enlace ya está en uso. Probá con otro.'
        }
        if (slugState.effectiveProbe.status === 'reserved') {
          return publicSlugValidationMessage('reserved')
        }
        if (slugState.effectiveProbe.status === 'invalid' && slugState.effectiveProbe.issue) {
          return publicSlugValidationMessage(slugState.effectiveProbe.issue)
        }
        if (slugState.effectiveProbe.status !== 'available') {
          return 'Revisá el enlace de tu catálogo antes de continuar.'
        }
      } else if (slugState.autoSlugProbe.status !== 'available') {
        if (slugState.autoSlugProbe.status === 'checking') {
          return 'Estamos comprobando tu enlace. Esperá un segundo.'
        }
        return 'Esperá a que validemos tu enlace.'
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
      if (!termsAccepted) {
        return 'Debés aceptar los términos y condiciones para crear tu tienda.'
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
    let slug: string | null = null
    let slugWritten = false
    let legalAcceptanceWritten = false
    let termsVersionForRollback = platformTerms.version
    try {
      const db = getDb()
      slug = await assertPublicSlugAvailableForRegistration(
        db,
        slugState.needsCustomSlug ? slugState.customSlugInput : slugState.slugFromName,
      )

      const termsSnap = await getDoc(doc(db, MC.mcPlatform, MC.mcPlatformSettingsDoc))
      const freshTerms = resolvePlatformTerms(
        termsSnap.exists() ? (termsSnap.data() as McPlatformSettings) : null,
      )
      setPlatformTerms(freshTerms)

      const auth = getAuthApp()
      cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const wa = combineWaDigits(waPrefix, waLocal).replace(/\D/g, '')
      const friendlyName = nombreTienda.trim()
      await updateProfile(cred.user, { displayName: friendlyName })

      const newTenantRef = doc(collection(db, MC.tenants))
      tid = newTenantRef.id
      /** Debe coincidir con `request.auth.token.email` (reglas Firestore); no normalizar a minúsculas. */
      const emailForFirestore = cred.user.email ?? email.trim()
      const acceptedAt = Date.now()
      const termsVersion = freshTerms.version
      termsVersionForRollback = termsVersion
      const termsContentHash = hashTermsContent(freshTerms.text)
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : undefined

      const batch = writeBatch(db)
      batch.set(newTenantRef, {
        ownerUid: cred.user.uid,
        slug: slug,
        nombreTienda: nombreTienda.trim(),
        whatsappNumero: wa,
        mensajeIntro: '',
        createdAt: acceptedAt,
        billingPlan: 'free',
        platformTermsAcceptedAt: acceptedAt,
        platformTermsVersion: termsVersion,
        platformTermsAcceptedByUid: cred.user.uid,
        platformTermsAcceptedByEmail: emailForFirestore,
        platformTermsContentHash: termsContentHash,
        ...(userAgent ? { platformTermsUserAgent: userAgent } : {}),
      })
      batch.set(doc(db, MC.users, cred.user.uid), {
        uid: cred.user.uid,
        email: emailForFirestore,
        displayName: friendlyName,
        tenantId: tid,
        isSuperAdmin: false,
        createdAt: Date.now(),
      })
      await batch.commit()

      const acceptance: McLegalAcceptance = {
        acceptedAt,
        termsVersion,
        termsContentHash,
        acceptedByUid: cred.user.uid,
        acceptedByEmail: emailForFirestore,
        context: 'registration',
        ...(userAgent ? { userAgent } : {}),
      }
      await setDoc(doc(db, mcLegalAcceptanceDoc(tid, termsVersion)), acceptance)
      legalAcceptanceWritten = true

      await setDoc(doc(db, MC.slugs, slug), {
        tenantId: tid,
        active: true,
        updatedAt: Date.now(),
      })
      slugWritten = true

      markPendingSellerOnboarding(tid)

      void trackMcEvent(MC_ANALYTICS_EVENTS.sellerRegistration, {
        store_slug: slug,
        billing_plan: 'free',
      })

      let verifyNavState: { verifySendError?: string } | undefined
      const sent = await callMcSendAuthVerificationEmail()
      if (!sent.ok) {
        if (sent.code === 'functions/resource-exhausted') {
          sessionStorage.setItem('mcVerifyEmailCooldownUntil', String(Date.now() + VERIFY_EMAIL_COOLDOWN_MS))
        } else {
          verifyNavState = {
            verifySendError:
              sent.message ||
              'No pudimos enviar el correo de verificación. Probá «Reenviar correo» en la siguiente pantalla.',
          }
        }
      }

      nav('/verificar-email', { replace: true, state: verifyNavState })
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : ''
      if (cred?.user && tid) {
        try {
          const dbRollback = getDb()
          if (slugWritten && slug) {
            await deleteDoc(doc(dbRollback, MC.slugs, slug))
          }
          if (legalAcceptanceWritten) {
            await deleteDoc(doc(dbRollback, mcLegalAcceptanceDoc(tid, termsVersionForRollback)))
          }
          await deleteDoc(doc(dbRollback, MC.users, cred.user.uid))
          await deleteDoc(doc(dbRollback, MC.tenants, tid))
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
      } else if (e instanceof Error && e.message === 'slug_taken') {
        setErr('Ese enlace ya está en uso. Volvé al paso de tienda y elegí otro.')
        setStep('tienda')
      } else if (e instanceof Error && e.message === 'slug_reserved') {
        setErr('Ese enlace está reservado. Volvé al paso de tienda y elegí otro.')
        setStep('tienda')
      } else if (e instanceof Error && e.message === 'slug_invalid') {
        setErr('El enlace del catálogo no es válido. Revisalo en el primer paso.')
        setStep('tienda')
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
  const autoSlugHostPreview =
    slugState.slugFromName.length >= 3 ? formatPublicSlugHostPreview(slugState.slugFromName) : ''

  return (
    <div className="mc-page relative min-h-svh overflow-x-hidden px-4 py-8 pb-16">
      <div className="mx-auto max-w-md">
        <AuthBrandHeader
          className="mb-8"
          title="Crear tienda"
          subtitle="Creá tu tienda gratis"
        />

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
                {slugState.slugFromName.length >= 3 && !slugState.needsCustomSlug ? (
                  <div className="rounded-md border border-neutral-200/60 bg-mc-50/80 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">
                      Tu catálogo público
                    </p>
                    <p className="mt-1 break-all text-[14px] font-medium text-mc-900">
                      {slugState.autoSlugProbe.status === 'checking' ? (
                        <span className="text-mc-500">Comprobando enlace…</span>
                      ) : slugState.storeUrlPreview ? (
                        <StorePublicHostDisplay host={slugState.storeUrlPreview} variant="prominent" />
                      ) : (
                        <span className="text-mc-400">Se genera al escribir el nombre</span>
                      )}
                    </p>
                    {slugState.autoSlugProbe.status === 'available' && slugState.storeUrlPreview ? (
                      <p className="mt-2 text-[12px] font-medium text-emerald-800">Enlace disponible</p>
                    ) : null}
                  </div>
                ) : null}
                {slugState.needsCustomSlug ? (
                  <div className="space-y-3 rounded-md border border-amber-200/70 bg-amber-50/50 px-4 py-4">
                    <p className="text-[13px] leading-relaxed text-amber-950">
                      {slugState.autoSlugProbe.status === 'reserved' ? (
                        <>
                          La dirección{' '}
                          <StorePublicHostDisplay host={autoSlugHostPreview} variant="highlight" /> está reservada
                          para la plataforma. Elegí otro enlace para tu catálogo (el nombre de la tienda no cambia).
                        </>
                      ) : (
                        <>
                          La dirección{' '}
                          <StorePublicHostDisplay host={autoSlugHostPreview} variant="highlight" /> ya está en uso.
                          Elegí otro enlace para tu catálogo (el nombre de la tienda no cambia).
                        </>
                      )}
                    </p>
                    <PublicStoreSlugField
                      value={slugState.customSlugInput}
                      onChange={slugState.setCustomSlugInput}
                      status={slugState.customSlugProbe.status}
                      issue={slugState.customSlugProbe.issue}
                      autoFocus
                    />
                  </div>
                ) : slugState.slugFromName.length < 3 ? (
                  <div className="rounded-md border border-neutral-200/60 bg-mc-50/80 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">
                      Tu catálogo público
                    </p>
                    <p className="mt-1 text-[14px] text-mc-400">Se genera al escribir el nombre</p>
                  </div>
                ) : null}
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
                <p className="mt-2 text-[13px] leading-relaxed text-mc-600">
                  Te enviaremos un enlace para confirmar que este correo es tuyo antes de usar el panel.
                </p>
              </div>
            )}

            {step === 'clave' && (
              <>
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
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200/60 bg-mc-50/50 p-4 text-[14px] leading-relaxed text-mc-800">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    disabled={busy || termsLoading}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300"
                  />
                  <span>
                    {termsLoading ? (
                      'Cargando términos…'
                    ) : (
                      <button
                        type="button"
                        className="text-left font-medium text-mc-900 underline decoration-neutral-300 underline-offset-2 transition hover:opacity-70"
                        onClick={(e) => {
                          e.preventDefault()
                          setTermsModalOpen(true)
                        }}
                      >
                        Acepto términos y condiciones
                      </button>
                    )}
                  </span>
                </label>
              </>
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
                disabled={busy || termsLoading || !termsAccepted}
                className="mc-btn-primary flex-1 py-3.5 disabled:opacity-50"
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

      <PlatformTermsModal
        open={termsModalOpen}
        version={platformTerms.version}
        text={platformTerms.text}
        onClose={() => setTermsModalOpen(false)}
      />
    </div>
  )
}
