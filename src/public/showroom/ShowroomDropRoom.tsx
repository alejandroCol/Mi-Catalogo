import { useState } from 'react'
import { FirebaseError } from 'firebase/app'
import { ShowroomCountdown } from '@/public/showroom/ShowroomCountdown'
import { resolveShowroomCopy, resolveShowroomMediaType, showroomDisplayFontStyle } from '@/lib/collectionShowroom'
import { showroomJoinWaitlist } from '@/lib/showroomApi'
import type { McCollectionShowroom } from '@/types/mc'

type Props = {
  slug: string
  storeName: string
  showroom: McCollectionShowroom
  onOpened: () => void
  onExit: () => void
  opening?: boolean
}

export function ShowroomDropRoom({
  slug,
  storeName,
  showroom,
  onOpened,
  onExit,
  opening = false,
}: Props) {
  const copy = resolveShowroomCopy(showroom)
  const mediaType = resolveShowroomMediaType(showroom)
  const isVideo = mediaType === 'video' && Boolean(showroom.teaserVideoUrl)
  const dropAt = showroom.dropAtMs ?? Date.now()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!showroom.waitlistEnabled) return
    setBusy(true)
    setError(null)
    try {
      const res = await showroomJoinWaitlist({
        slug,
        email,
        ...(name.trim() ? { name: name.trim() } : {}),
      })
      setDone(true)
      if (res.alreadyJoined) setError(null)
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : ''
      const raw =
        err instanceof FirebaseError
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : ''
      const cleaned = raw.replace(/^Firebase:\s*/i, '').replace(/\s*\(.*\)\s*$/, '').trim()
      if (
        (code === 'functions/failed-precondition' || code === 'functions/invalid-argument') &&
        cleaned
      ) {
        setError(cleaned)
      } else {
        setError(cleaned || 'No se pudo unir a la lista.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`mc-showroom-drop ${opening ? 'mc-showroom-drop--opening' : ''}`}
      data-mood={copy.mood}
      style={showroomDisplayFontStyle(showroom)}
    >
      <div className="mc-showroom-drop__media" aria-hidden>
        {isVideo ? (
          <video
            className="mc-showroom-drop__video"
            src={showroom.teaserVideoUrl}
            poster={showroom.teaserPosterUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : showroom.teaserImageUrl ? (
          <img src={showroom.teaserImageUrl} alt="" className="mc-showroom-drop__img" />
        ) : (
          <div className="mc-showroom-drop__placeholder" />
        )}
        <div className="mc-showroom-drop__scrim" />
        <div className="mc-showroom-drop__grain" />
      </div>

      <button type="button" className="mc-showroom-drop__back" onClick={onExit}>
        ← Salir
      </button>

      <div className="mc-showroom-drop__door" aria-hidden>
        <span className="mc-showroom-drop__door-panel mc-showroom-drop__door-panel--l" />
        <span className="mc-showroom-drop__door-panel mc-showroom-drop__door-panel--r" />
        <span className="mc-showroom-drop__lock" />
      </div>

      <div className="mc-showroom-drop__content">
        <div className="mc-showroom-drop__copy">
          <p className="mc-showroom-drop__eyebrow">{copy.teaserEyebrow}</p>
          <h1 className="mc-showroom-drop__headline">{copy.teaserHeadline}</h1>
          {storeName ? <p className="mc-showroom-drop__store">{storeName}</p> : null}
        </div>

        <ShowroomCountdown targetMs={dropAt} onComplete={onOpened} />

        {showroom.waitlistEnabled ? (
          done ? (
            <p className="mc-showroom-drop__joined">Estás en la lista. Te avisamos cuando abra.</p>
          ) : (
            <form className="mc-showroom-drop__form" onSubmit={(e) => void joinWaitlist(e)}>
              <input
                type="text"
                className="mc-showroom-drop__input"
                placeholder="Tu nombre (opcional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              <input
                type="email"
                required
                className="mc-showroom-drop__input"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
              />
              <button type="submit" className="mc-showroom-drop__cta" disabled={busy}>
                {busy ? 'Guardando…' : copy.teaserCtaLabel}
              </button>
              {error ? <p className="mc-showroom-drop__error">{error}</p> : null}
            </form>
          )
        ) : (
          <p className="mc-showroom-drop__hint">Volvé a esta hora. La puerta se abre sola.</p>
        )}
      </div>
    </div>
  )
}
