import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { LandingBrandLogo } from '@/landing/components/LandingBrandLogo'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { callMcTallerRegister } from '@/lib/mcTallerApi'
import { formatMcTallerDate, mcTallerEventPath } from '@/lib/mcTallerFormat'
import { MC_TALLER_BRAND_TYPE_OPTIONS } from '@/lib/tallerBrandTypes'
import { MC } from '@/lib/mcCollections'
import { combineWaDigits, DEFAULT_WA_PREFIX, WA_COUNTRY_PREFIXES } from '@/lib/waPhonePrefixes'
import type { McTaller, McTallerBrandType } from '@/types/mc'

type StepId = 'nombre' | 'marca' | 'tipo' | 'email' | 'whatsapp' | 'confirmacion'

const STEPS: StepId[] = ['nombre', 'marca', 'tipo', 'email', 'whatsapp', 'confirmacion']

const STEP_META: Record<Exclude<StepId, 'confirmacion'>, { title: string; subtitle: string }> = {
  nombre: {
    title: '¿Cómo te llamás?',
    subtitle: 'Queremos conocerte para personalizar tu experiencia en el taller.',
  },
  marca: {
    title: '¿Cuál es el nombre de tu marca?',
    subtitle: 'Puede ser el nombre comercial o cómo te conocen tus clientes.',
  },
  tipo: {
    title: '¿En qué etapa está tu marca?',
    subtitle: 'Nos ayuda a orientar mejor el contenido del taller.',
  },
  email: {
    title: '¿Cuál es tu correo?',
    subtitle: 'Te enviaremos la confirmación y el acceso al taller.',
  },
  whatsapp: {
    title: '¿Tu WhatsApp?',
    subtitle: 'Por si necesitamos contactarte antes del evento.',
  },
}

function stepIndex(id: StepId) {
  return STEPS.indexOf(id)
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export function TallerRegistrationPage() {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const slug = (slugParam ?? '').trim().toLowerCase()

  const [taller, setTaller] = useState<McTaller | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'inactive'>('loading')
  const [step, setStep] = useState<StepId>('nombre')
  const [fullName, setFullName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [brandType, setBrandType] = useState<McTallerBrandType | ''>('')
  const [brandTypeOther, setBrandTypeOther] = useState('')
  const [email, setEmail] = useState('')
  const [waPrefix, setWaPrefix] = useState(DEFAULT_WA_PREFIX)
  const [waLocal, setWaLocal] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [emailSent, setEmailSent] = useState(true)

  const loadTaller = useCallback(async () => {
    if (!firebaseConfigured || !slug) {
      setLoadState('missing')
      return
    }
    setLoadState('loading')
    try {
      const snap = await getDoc(doc(getDb(), MC.talleres, slug))
      if (!snap.exists()) {
        setLoadState('missing')
        return
      }
      const data = snap.data() as McTaller
      if (data.active !== true) {
        setLoadState('inactive')
        return
      }
      setTaller({ ...data, slug: snap.id })
      setLoadState('ready')
    } catch {
      setLoadState('missing')
    }
  }, [slug])

  useEffect(() => {
    void loadTaller()
  }, [loadTaller])

  useEffect(() => {
    setErr(null)
  }, [step])

  const inputSteps = useMemo(() => STEPS.filter((s) => s !== 'confirmacion'), [])
  const currentInputIndex = step === 'confirmacion' ? inputSteps.length : stepIndex(step)

  function validateCurrent(s: StepId = step): string | null {
    if (s === 'nombre') {
      if (fullName.trim().length < 2) return 'Ingresá tu nombre completo.'
    }
    if (s === 'marca') {
      if (brandName.trim().length < 2) return 'Ingresá el nombre de tu marca.'
    }
    if (s === 'tipo') {
      if (!brandType) return 'Elegí una opción.'
      if (brandType === 'other' && brandTypeOther.trim().length < 2) {
        return 'Contanos un poco más (campo «Otro»).'
      }
    }
    if (s === 'email') {
      if (!emailOk(email)) return 'Ingresá un correo válido.'
    }
    if (s === 'whatsapp') {
      const full = combineWaDigits(waPrefix, waLocal)
      if (full.replace(/\D/g, '').length < 10) return 'Ingresá un WhatsApp válido.'
    }
    return null
  }

  function goNext() {
    const v = validateCurrent()
    if (v) {
      setErr(v)
      return
    }
    const idx = stepIndex(step)
    if (idx < STEPS.length - 2) {
      setStep(STEPS[idx + 1]!)
    } else if (step === 'whatsapp') {
      void submitRegistration()
    }
  }

  function goBack() {
    const idx = stepIndex(step)
    if (idx > 0 && step !== 'confirmacion') {
      setStep(STEPS[idx - 1]!)
    }
  }

  async function submitRegistration() {
    const v = validateCurrent('whatsapp')
    if (v) {
      setErr(v)
      return
    }
    if (!taller || !brandType) return

    setBusy(true)
    setErr(null)
    try {
      const result = await callMcTallerRegister({
        slug,
        fullName: fullName.trim(),
        brandName: brandName.trim(),
        brandType,
        ...(brandType === 'other' ? { brandTypeOther: brandTypeOther.trim() } : {}),
        email: email.trim(),
        whatsapp: combineWaDigits(waPrefix, waLocal).replace(/\D/g, ''),
      })
      setEmailSent(result.emailSent !== false)
      setStep('confirmacion')
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : ''
      const message =
        e && typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: string }).message)
          : ''
      if (code === 'functions/already-exists') {
        setErr('Ya te inscribiste con este correo para este taller.')
      } else if (message) {
        setErr(message)
      } else {
        setErr('No pudimos completar la inscripción. Probá de nuevo.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="mc-landing mc-taller-page flex min-h-svh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-mc-brand-gray" />
          <p className="text-[15px] text-mc-600">Cargando taller…</p>
        </div>
      </div>
    )
  }

  if (loadState === 'missing' || loadState === 'inactive') {
    return (
      <div className="mc-landing mc-taller-page min-h-svh">
        <header className="mc-taller-page__header">
          <div className="mc-landing-container flex justify-center py-8">
            <Link to="/" aria-label="mi catálogo — inicio">
              <LandingBrandLogo />
            </Link>
          </div>
        </header>
        <main className="mc-landing-container flex flex-col items-center py-16 text-center">
          <p className="mc-landing-eyebrow">Taller</p>
          <h1 className="mc-landing-title mt-2">
            {loadState === 'inactive' ? 'Este taller no está disponible' : 'Taller no encontrado'}
          </h1>
          <p className="mc-landing-lead mx-auto">
            {loadState === 'inactive'
              ? 'La inscripción está cerrada por ahora.'
              : 'Revisá el enlace o contactá al organizador.'}
          </p>
          <Link to="/" className="mc-landing-btn-primary mt-8 no-underline">
            Volver al inicio
          </Link>
        </main>
      </div>
    )
  }

  if (!taller) return null

  const requirements = (taller.requirements ?? []).filter((r) => r.trim())
  const eventPath = mcTallerEventPath(slug)

  return (
    <div className="mc-landing mc-taller-page min-h-svh">
      <header className="mc-taller-page__header">
        <div className="mc-landing-container flex flex-col items-center gap-6 py-8 sm:py-10">
          <Link to="/" className="no-underline" aria-label="mi catálogo — inicio">
            <LandingBrandLogo />
          </Link>
          {step !== 'confirmacion' ? (
            <div className="max-w-lg text-center">
              <p className="mc-landing-eyebrow">{taller.title}</p>
              <h1 className="mt-2 text-[clamp(1.35rem,3.5vw,1.85rem)] font-semibold leading-tight tracking-tighter text-mc-brand-gray">
                Inscripción al taller
              </h1>
              {taller.description ? (
                <p className="mt-3 text-[15px] leading-relaxed text-mc-600">{taller.description}</p>
              ) : null}
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/70 px-4 py-2 text-[13px] font-medium text-mc-brand-gray backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-mc-brand-gold" aria-hidden />
                {formatMcTallerDate(taller.dateMs)}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mc-landing-container pb-20 pt-2 sm:pb-28">
        <div className="mx-auto max-w-md">
          {step !== 'confirmacion' ? (
            <>
              <div className="mb-6 flex justify-center gap-2" aria-hidden>
                {inputSteps.map((_, i) => (
                  <span
                    key={inputSteps[i]}
                    className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                      i <= currentInputIndex ? 'bg-mc-brand-gray' : 'bg-neutral-200'
                    }`}
                  />
                ))}
              </div>

              <div key={step} className="mc-reg-step-animate mc-taller-wizard-card">
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-semibold tracking-tight text-mc-brand-gray">
                    {STEP_META[step as Exclude<StepId, 'confirmacion'>].title}
                  </h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-mc-600">
                    {STEP_META[step as Exclude<StepId, 'confirmacion'>].subtitle}
                  </p>
                </div>

                {step === 'nombre' && (
                  <label className="block">
                    <span className="text-[13px] font-medium text-mc-700">Nombre completo</span>
                    <input
                      className="mc-input mt-1.5 rounded-xl border-neutral-200/80 bg-white"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      autoFocus
                      placeholder="Ej. María González"
                    />
                  </label>
                )}

                {step === 'marca' && (
                  <label className="block">
                    <span className="text-[13px] font-medium text-mc-700">Nombre de tu marca</span>
                    <input
                      className="mc-input mt-1.5 rounded-xl border-neutral-200/80 bg-white"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      autoComplete="organization"
                      autoFocus
                      placeholder="Ej. Flores del Valle"
                    />
                  </label>
                )}

                {step === 'tipo' && (
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-[13px] font-medium text-mc-700">Tipo de marca</span>
                      <select
                        className="mc-input mt-1.5 rounded-xl border-neutral-200/80 bg-white"
                        value={brandType}
                        onChange={(e) => setBrandType(e.target.value as McTallerBrandType | '')}
                        autoFocus
                      >
                        <option value="">Elegí una opción…</option>
                        {MC_TALLER_BRAND_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {brandType === 'other' ? (
                      <label className="block">
                        <span className="text-[13px] font-medium text-mc-700">Contanos más</span>
                        <input
                          className="mc-input mt-1.5 rounded-xl border-neutral-200/80 bg-white"
                          value={brandTypeOther}
                          onChange={(e) => setBrandTypeOther(e.target.value)}
                          placeholder="Tu situación o tipo de negocio"
                        />
                      </label>
                    ) : null}
                  </div>
                )}

                {step === 'email' && (
                  <label className="block">
                    <span className="text-[13px] font-medium text-mc-700">Correo electrónico</span>
                    <input
                      className="mc-input mt-1.5 rounded-xl border-neutral-200/80 bg-white"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                      placeholder="tu@correo.com"
                    />
                  </label>
                )}

                {step === 'whatsapp' && (
                  <div className="space-y-3">
                    <span className="text-[13px] font-medium text-mc-700">WhatsApp</span>
                    <div className="flex gap-2">
                      <select
                        className="mc-input mt-0 w-[38%] shrink-0 rounded-xl border-neutral-200/80 bg-white py-2.5"
                        value={waPrefix}
                        onChange={(e) => setWaPrefix(e.target.value)}
                      >
                        {WA_COUNTRY_PREFIXES.map((p) => (
                          <option key={p.dial} value={p.dial}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="mc-input mt-0 min-w-0 flex-1 rounded-xl border-neutral-200/80 bg-white"
                        inputMode="tel"
                        value={waLocal}
                        onChange={(e) => setWaLocal(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                        placeholder="300 123 4567"
                      />
                    </div>
                  </div>
                )}

                {err ? <p className="mt-4 text-[13px] text-red-800">{err}</p> : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  {stepIndex(step) > 0 ? (
                    <button type="button" className="mc-landing-btn-secondary w-full sm:w-auto" onClick={goBack}>
                      Atrás
                    </button>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                  <button
                    type="button"
                    className="mc-landing-btn-primary w-full sm:ml-auto sm:w-auto"
                    disabled={busy}
                    onClick={() => (step === 'whatsapp' ? void submitRegistration() : goNext())}
                  >
                    {busy ? 'Enviando…' : step === 'whatsapp' ? 'Confirmar inscripción' : 'Continuar'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="mc-reg-step-animate mc-taller-success">
              <div className="mc-taller-success__glow" aria-hidden />
              <div className="relative overflow-hidden rounded-[1.25rem] border border-neutral-200/70 bg-white shadow-[0_24px_64px_-32px_rgba(28,27,31,0.35)]">
                <div className="border-b border-neutral-100 bg-gradient-to-br from-[#faf9f7] to-white px-6 py-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mc-brand-gray text-2xl text-white">
                    ✓
                  </div>
                  <p className="mc-landing-eyebrow">¡Listo!</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-mc-brand-gray">
                    Te inscribiste al taller
                  </h2>
                  <p className="mt-2 text-[15px] text-mc-600">{taller.title}</p>
                  {!emailSent ? (
                    <p className="mt-3 text-[13px] text-amber-800">
                      Guardá esta pantalla: no pudimos enviar el correo automáticamente.
                    </p>
                  ) : (
                    <p className="mt-3 text-[13px] text-mc-600">
                      Te enviamos un correo a <strong>{email.trim()}</strong> con todos los detalles.
                    </p>
                  )}
                </div>

                <div className="space-y-5 px-6 py-6">
                  <div className="rounded-xl border border-neutral-200/60 bg-[#faf9f7]/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mc-brand-gold">Fecha</p>
                    <p className="mt-1 text-[15px] font-medium text-mc-brand-gray">{formatMcTallerDate(taller.dateMs)}</p>
                  </div>

                  <div className="rounded-xl border border-mc-brand-gray/15 bg-mc-brand-gray px-4 py-5 text-center text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Acceso al taller</p>
                    <p className="mt-3 text-[13px] leading-relaxed text-white/80">
                      El enlace de Google Meet se habilitará en la página del taller cuando empiece el evento.
                    </p>
                    <Link
                      to={eventPath}
                      className="mc-landing-btn-primary mt-4 inline-flex bg-white text-mc-brand-gray no-underline hover:bg-neutral-100"
                    >
                      Unirme al taller
                    </Link>
                  </div>

                  {requirements.length > 0 ? (
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-mc-brand-gold">
                        Requisitos
                      </p>
                      <ul className="space-y-2">
                        {requirements.map((req) => (
                          <li
                            key={req}
                            className="flex gap-3 rounded-xl border border-neutral-200/60 bg-white px-4 py-3 text-[14px] leading-snug text-mc-brand-gray"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mc-brand-gold/20 text-[11px] font-bold text-mc-brand-gold-dark">
                              •
                            </span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 text-center">
                <Link to="/" className="mc-landing-btn-ghost text-[15px] no-underline">
                  Volver a mi catálogo
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
