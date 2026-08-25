import { type FormEvent, useState } from 'react'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { norrisHero } from '@/landing/norris/norrisContent'
import { mcPlatformPublicHost } from '@/lib/storePublicUrl'
import { slugifyStoreName } from '@/lib/publicSlug'

type Props = {
  variant?: 'hero' | 'stacked'
}

export function LandingNorrisHeroForm({ variant = 'hero' }: Props) {
  const navigate = useNavigate()
  const [storeName, setStoreName] = useState('')
  const [focused, setFocused] = useState(false)

  const slugPreview = slugifyStoreName(storeName)
  const host = mcPlatformPublicHost()

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const name = storeName.trim()
    navigate('/registro', name ? { state: { nombreTienda: name } } : undefined)
  }

  return (
    <form
      className={clsx(
        'mc-norris-hero-form',
        variant === 'hero' && 'mc-norris-hero-form--inline',
        variant === 'hero' && !focused && !storeName && 'mc-norris-hero-form--idle',
      )}
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor="mc-norris-store-name">
        {norrisHero.inputPlaceholder}
      </label>
      <div className="mc-norris-hero-form__row">
        <input
          id="mc-norris-store-name"
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={norrisHero.inputPlaceholder}
          autoComplete="organization"
          className="mc-norris-hero-form__input"
        />
        <button type="submit" className="mc-norris-hero-form__cta">
          <span>{norrisHero.ctaLabel}</span>
          <svg className="mc-norris-hero-form__cta-arrow" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M3 8h10M9 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {slugPreview.length >= 3 ? (
        <span className="mc-norris-hero-form__preview">
          Tu link → <strong>{slugPreview}.{host}</strong>
        </span>
      ) : null}
    </form>
  )
}
