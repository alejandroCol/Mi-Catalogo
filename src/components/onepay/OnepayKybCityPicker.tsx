import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { httpsCallable } from 'firebase/functions'
import { McOptionCombobox } from '@/components/McOptionCombobox'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import {
  formatOnepayCityLabel,
  type OnepayGeoCity,
  type OnepayGeoState,
} from '@/lib/onepayGeo'

function callableErrorMessage(e: unknown): string {
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return 'No se pudo cargar el listado.'
}

type Props = {
  cityId: string
  onCityIdChange: (id: string) => void
  /** Etiqueta guardada al reabrir el paso (opcional). */
  cityLabel?: string
  onCityLabelChange?: (label: string) => void
  disabled?: boolean
}

/**
 * Selector departamento + ciudad con IDs oficiales de OnePay (`city_id` en crear empresa).
 */
export function OnepayKybCityPicker({
  cityId,
  onCityIdChange,
  cityLabel = '',
  onCityLabelChange,
  disabled,
}: Props) {
  const [states, setStates] = useState<OnepayGeoState[]>([])
  const [statesLoading, setStatesLoading] = useState(false)
  const [statesErr, setStatesErr] = useState<string | null>(null)

  const [stateId, setStateId] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [cityHits, setCityHits] = useState<OnepayGeoCity[]>([])
  const [cityHitsOpen, setCityHitsOpen] = useState(false)
  const [cityHitsLoading, setCityHitsLoading] = useState(false)
  const [cityHitsErr, setCityHitsErr] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<OnepayGeoCity | null>(null)

  const citySearchAbortRef = useRef<AbortController | null>(null)
  const citySearchTimerRef = useRef<number | null>(null)
  const statesLoadedRef = useRef(false)
  const cityWrapRef = useRef<HTMLDivElement>(null)

  const stateOptions = useMemo(
    () => states.map((s) => ({ value: String(s.id), label: s.name })),
    [states],
  )

  const selectedStateName = states.find((s) => String(s.id) === stateId)?.name ?? ''

  const loadStates = useCallback(async () => {
    if (!firebaseConfigured) {
      setStatesErr('Firebase no está configurado.')
      return
    }
    setStatesLoading(true)
    setStatesErr(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayListStatesForKyb')
      const res = (await fn({})) as { data?: { states?: OnepayGeoState[] } }
      const list = res.data?.states
      setStates(Array.isArray(list) ? list : [])
      statesLoadedRef.current = true
    } catch (e) {
      setStatesErr(callableErrorMessage(e))
      setStates([])
    } finally {
      setStatesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (statesLoadedRef.current || statesLoading) return
    void loadStates()
  }, [loadStates, statesLoading])

  useEffect(() => {
    if (!cityId.trim() || !/^\d+$/.test(cityId.trim())) {
      setSelectedCity(null)
      return
    }
    if (selectedCity && String(selectedCity.id) === cityId.trim()) return
    if (!cityLabel.trim()) return
    const parts = cityLabel.split(',').map((p) => p.trim())
    const name = parts[0] ?? cityLabel
    const stateName = parts.slice(1).join(', ') || selectedStateName
    const restored: OnepayGeoCity = {
      id: parseInt(cityId.trim(), 10),
      name,
      state: {
        id: stateId ? parseInt(stateId, 10) : 0,
        name: stateName || '—',
      },
    }
    setSelectedCity(restored)
    if (!cityQuery.trim()) setCityQuery(cityLabel)
  }, [cityId, cityLabel, selectedCity, selectedStateName, stateId, cityQuery])

  useEffect(() => {
    if (citySearchTimerRef.current) window.clearTimeout(citySearchTimerRef.current)
    citySearchAbortRef.current?.abort()

    if (!stateId) {
      setCityHits([])
      setCityHitsLoading(false)
      setCityHitsErr(null)
      return
    }

    const q = cityQuery.trim()
    if (q.length < 2) {
      setCityHits([])
      setCityHitsLoading(false)
      setCityHitsErr(null)
      return
    }

    citySearchTimerRef.current = window.setTimeout(() => {
      const ctrl = new AbortController()
      citySearchAbortRef.current = ctrl
      setCityHitsLoading(true)
      setCityHitsErr(null)

      const run = async () => {
        try {
          const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayListCitiesForKyb')
          const res = (await fn({
            stateId: parseInt(stateId, 10),
            filterName: q,
            page: 1,
            perPage: 24,
          })) as { data?: { cities?: OnepayGeoCity[] } }
          if (ctrl.signal.aborted) return
          const list = res.data?.cities
          setCityHits(Array.isArray(list) ? list : [])
          setCityHitsOpen(true)
        } catch (e) {
          if (ctrl.signal.aborted) return
          setCityHitsErr(callableErrorMessage(e))
          setCityHits([])
        } finally {
          if (!ctrl.signal.aborted) setCityHitsLoading(false)
        }
      }
      void run()
    }, 320)

    return () => {
      if (citySearchTimerRef.current) window.clearTimeout(citySearchTimerRef.current)
      citySearchAbortRef.current?.abort()
    }
  }, [cityQuery, stateId])

  useEffect(() => {
    return () => {
      if (citySearchTimerRef.current) window.clearTimeout(citySearchTimerRef.current)
      citySearchAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!cityWrapRef.current?.contains(e.target as Node)) {
        setCityHitsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  function pickCity(city: OnepayGeoCity) {
    onCityIdChange(String(city.id))
    onCityLabelChange?.(formatOnepayCityLabel(city))
    setSelectedCity(city)
    setStateId(String(city.state.id))
    setCityQuery(formatOnepayCityLabel(city))
    setCityHits([])
    setCityHitsOpen(false)
    setCityHitsErr(null)
  }

  function clearCity() {
    onCityIdChange('')
    onCityLabelChange?.('')
    setSelectedCity(null)
    setCityQuery('')
    setCityHits([])
    setCityHitsOpen(false)
  }

  function onStateChange(next: string) {
    setStateId(next)
    if (next !== stateId) {
      clearCity()
    }
  }

  const cityConfirmed = Boolean(cityId.trim() && /^\d+$/.test(cityId.trim()) && selectedCity)

  return (
    <div className="space-y-4 rounded-lg border border-neutral-200/55 bg-[color-mix(in_srgb,var(--cat-surface)_88%,transparent)] p-4">
      <p className="text-[13px] font-semibold text-[var(--cat-text)]">Ciudad del comercio</p>

      <label className="block space-y-1.5">
        <span className="text-[12px] font-medium text-[var(--cat-muted)]">Departamento</span>
        <McOptionCombobox
          value={stateId}
          onChange={onStateChange}
          options={stateOptions}
          disabled={disabled || statesLoading}
          inputClassName="mc-input w-full"
          placeholder={statesLoading ? 'Cargando departamentos…' : 'Buscar departamento…'}
          emptyMessage={statesLoading ? 'Cargando…' : 'Sin departamentos'}
        />
        {statesErr ? (
          <p className="text-[11px] text-red-700">
            {statesErr}{' '}
            <button type="button" className="underline" onClick={() => void loadStates()} disabled={disabled}>
              Reintentar
            </button>
          </p>
        ) : null}
      </label>

      <div className="space-y-1.5" ref={cityWrapRef}>
        <label className="block space-y-1">
          <span className="text-[12px] font-medium text-[var(--cat-muted)]">Ciudad o municipio</span>
          <div className="relative">
            <input
              className={clsx(
                'mc-input w-full',
                !stateId && 'cursor-not-allowed opacity-60',
              )}
              value={cityQuery}
              disabled={disabled || !stateId || statesLoading}
              autoComplete="off"
              placeholder={
                stateId
                  ? selectedStateName
                    ? `Buscar en ${selectedStateName}…`
                    : 'Escribí al menos 2 letras…'
                  : 'Elegí un departamento primero'
              }
              onChange={(e) => {
                setCityQuery(e.target.value)
                if (selectedCity && e.target.value !== formatOnepayCityLabel(selectedCity)) {
                  onCityIdChange('')
                  onCityLabelChange?.('')
                  setSelectedCity(null)
                }
                setCityHitsOpen(true)
              }}
              onFocus={() => cityHits.length > 0 && setCityHitsOpen(true)}
            />
            {cityHitsOpen && cityHits.length > 0 ? (
              <ul
                role="listbox"
                className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-neutral-200/80 bg-[var(--cat-surface)] py-1 shadow-md"
              >
                {cityHits.map((city) => (
                  <li key={city.id}>
                    <button
                      type="button"
                      role="option"
                      className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-neutral-100/80"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickCity(city)}
                    >
                      <span className="text-[14px] font-medium text-[var(--cat-text)]">{city.name}</span>
                      <span className="text-[11px] text-[var(--cat-muted)]">
                        {city.state.name} · ID {city.id}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </label>
        {cityHitsLoading ? (
          <p className="text-[11px] text-[var(--cat-muted)]">Buscando en OnePay…</p>
        ) : null}
        {cityHitsErr ? <p className="text-[11px] text-red-700">{cityHitsErr}</p> : null}
        {!cityHitsLoading &&
        !cityHitsErr &&
        stateId &&
        cityQuery.trim().length >= 2 &&
        cityHits.length === 0 &&
        !cityConfirmed ? (
          <p className="text-[11px] text-[var(--cat-muted)]">
            No hay coincidencias. Probá otro nombre o revisá el departamento.
          </p>
        ) : null}
        {stateId && cityQuery.trim().length > 0 && cityQuery.trim().length < 2 ? (
          <p className="text-[11px] text-[var(--cat-muted)]">Escribí al menos 2 caracteres para buscar.</p>
        ) : null}
      </div>

      {cityConfirmed && selectedCity ? (
        <div className="flex items-start justify-between gap-3 border border-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_10%,transparent)] px-3 py-2.5">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-accent)]">
              Ciudad seleccionada
            </p>
            <p className="text-[14px] font-medium text-[var(--cat-text)]">{formatOnepayCityLabel(selectedCity)}</p>
            <p className="font-mono text-[11px] text-[var(--cat-muted)]">city_id: {selectedCity.id}</p>
          </div>
          <button
            type="button"
            className="shrink-0 text-[12px] text-[var(--cat-muted)] underline hover:text-[var(--cat-text)]"
            disabled={disabled}
            onClick={clearCity}
          >
            Cambiar
          </button>
        </div>
      ) : null}
    </div>
  )
}
