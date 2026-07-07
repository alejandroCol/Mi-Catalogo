import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { TallerCountdownDisplay } from '@/taller/components/TallerCountdownDisplay'
import { TallerPageShell } from '@/taller/components/TallerPageShell'
import { useTallerCountdown } from '@/taller/useTallerCountdown'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { callMcTallerGetMeetLink } from '@/lib/mcTallerApi'
import {
  formatMcTallerDate,
  mcTallerRegisterPath,
  readTallerMeetLinkFromData,
} from '@/lib/mcTallerFormat'
import { MC } from '@/lib/mcCollections'
import type { McTaller } from '@/types/mc'

export function TallerEventPage() {
  const { slug: slugParam } = useParams<{ slug: string }>()
  const slug = (slugParam ?? '').trim().toLowerCase()
  const [taller, setTaller] = useState<McTaller | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'inactive'>('loading')
  const [liveMeetHref, setLiveMeetHref] = useState<string | null>(null)
  const [meetLoading, setMeetLoading] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured || !slug) {
      setLoadState('missing')
      return
    }

    setLoadState('loading')
    const ref = doc(getDb(), MC.talleres, slug)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setTaller(null)
          setLoadState('missing')
          return
        }
        const data = snap.data() as McTaller
        if (data.active !== true) {
          setTaller(null)
          setLoadState('inactive')
          return
        }
        setTaller({ ...data, slug: snap.id })
        setLoadState('ready')
      },
      () => setLoadState('missing'),
    )

    return () => unsub()
  }, [slug])

  const countdown = useTallerCountdown(taller?.dateMs)
  const docMeetHref = readTallerMeetLinkFromData(taller)
  const meetHref = liveMeetHref ?? docMeetHref
  const requirements = (taller?.requirements ?? []).filter((r) => r.trim())

  useEffect(() => {
    if (!countdown.isLive || !slug) {
      setLiveMeetHref(null)
      setMeetLoading(false)
      return
    }

    const fromDoc = readTallerMeetLinkFromData(taller)
    if (fromDoc) {
      setLiveMeetHref(fromDoc)
      setMeetLoading(false)
      return
    }

    let cancelled = false
    setMeetLoading(true)
    void callMcTallerGetMeetLink(slug)
      .then((res) => {
        if (cancelled) return
        setLiveMeetHref(res.meetLink ?? null)
      })
      .catch(() => {
        if (!cancelled) setLiveMeetHref(null)
      })
      .finally(() => {
        if (!cancelled) setMeetLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [countdown.isLive, slug, taller?.zoomLink, taller?.meetLink, taller?.updatedAt])

  function openMeetLink() {
    if (!meetHref) return
    window.open(meetHref, '_blank', 'noopener,noreferrer')
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

  if (loadState === 'missing' || loadState === 'inactive' || !taller) {
    return (
      <TallerPageShell
        eyebrow="Taller"
        title={loadState === 'inactive' ? 'Este taller no está disponible' : 'Taller no encontrado'}
        subtitle={
          loadState === 'inactive'
            ? 'La sala está cerrada por ahora.'
            : 'Revisá el enlace o contactá al organizador.'
        }
      >
        <div className="mx-auto max-w-md text-center">
          <Link to="/" className="mc-landing-btn-primary mt-4 inline-flex no-underline">
            Volver al inicio
          </Link>
        </div>
      </TallerPageShell>
    )
  }

  return (
    <TallerPageShell eyebrow="Taller en vivo" title={taller.title} subtitle={taller.description || undefined}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="mc-taller-event-card">
          <div className="rounded-[1.25rem] border border-neutral-200/70 bg-white/90 p-6 shadow-[0_20px_48px_-28px_rgba(28,27,31,0.28)] backdrop-blur-sm sm:p-8">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mc-brand-gold">Fecha del evento</p>
              <p className="mt-2 text-[17px] font-medium leading-snug text-mc-brand-gray">
                {formatMcTallerDate(taller.dateMs)}
              </p>
            </div>

            {!countdown.isLive ? (
              <div className="mt-8 space-y-7">
                <div className="text-center">
                  <Link
                    to={mcTallerRegisterPath(slug)}
                    className="mc-landing-btn-primary inline-flex no-underline"
                  >
                    Inscribirme al taller
                  </Link>
                </div>

                <div className="mc-taller-countdown-block">
                  <p className="mc-taller-countdown-block__title">El taller comienza en</p>
                  <TallerCountdownDisplay countdown={countdown} />
                  <div className="mc-taller-link-notice">
                    <span className="mc-taller-link-notice__icon" aria-hidden>
                      ◷
                    </span>
                    <p className="mc-taller-link-notice__text">
                      El enlace para unirte se habilitará automáticamente cuando el contador llegue a{' '}
                      <strong>cero</strong>.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8">
                <div className="mc-taller-live-panel">
                  <p className="mc-taller-live-panel__eyebrow">Google Meet</p>
                  {meetLoading ? (
                    <p className="mc-taller-live-panel__waiting">Cargando enlace de la videollamada…</p>
                  ) : meetHref ? (
                    <>
                      <button type="button" className="mc-taller-live-panel__btn" onClick={openMeetLink}>
                        Unirme al taller
                      </button>
                      <p className="mc-taller-live-panel__hint">Se abrirá Google Meet en una pestaña nueva.</p>
                    </>
                  ) : (
                    <p className="mc-taller-live-panel__waiting">
                      Todavía no hay enlace de Google Meet configurado. Pedile al organizador que lo cargue en súper
                      admin → Talleres.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {requirements.length > 0 ? (
          <div className="rounded-[1.25rem] border border-neutral-200/70 bg-white/90 p-6 sm:p-8">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-mc-brand-gold">
              Requisitos
            </p>
            <ul className="space-y-2">
              {requirements.map((req) => (
                <li
                  key={req}
                  className="flex gap-3 rounded-xl border border-neutral-200/60 bg-[#faf9f7]/80 px-4 py-3 text-[14px] leading-snug text-mc-brand-gray"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mc-brand-gold/20 text-[11px] font-bold text-mc-brand-gold-dark">
                    ✓
                  </span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col items-center pt-2 text-center">
          <Link to="/" className="mc-landing-btn-ghost text-[14px] no-underline">
            Volver a mi catálogo
          </Link>
        </div>
      </div>
    </TallerPageShell>
  )
}
