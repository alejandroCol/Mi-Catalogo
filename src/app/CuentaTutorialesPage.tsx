import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { GuideCategoryNav } from '@/components/tutorials/GuideCategoryNav'
import { GuideFaqList } from '@/components/tutorials/GuideFaqList'
import { GuideFlowCard } from '@/components/tutorials/GuideFlowCard'
import { GuideFlowPanel } from '@/components/tutorials/GuideFlowPanel'
import { TutorialCard } from '@/components/tutorials/TutorialCard'
import { IconPlayCircle } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import {
  findGuide,
  GUIDE_CATEGORIES,
  GUIDE_FAQS,
  guidesForCategory,
  type GuideCategoryId,
} from '@/lib/tutorials/guideContent'
import { fetchVisibleTutorialSections } from '@/lib/tutorials/fetchTutorials'
import type { McTutorialSectionWithTutorials } from '@/lib/tutorials/types'

function isGuideCategoryId(value: string | null): value is GuideCategoryId {
  return GUIDE_CATEGORIES.some((c) => c.id === value)
}

const SECTION_COPY: Record<
  Exclude<GuideCategoryId, 'videos'>,
  { title: string; subtitle: string }
> = {
  inicio: {
    title: 'Empezá por acá',
    subtitle: 'Los flujos más útiles. Tocá uno y seguí el paso a paso.',
  },
  configuracion: {
    title: 'Configuración',
    subtitle: 'Cobro, envíos, WhatsApp y lo esencial para vender.',
  },
  personalizacion: {
    title: 'Personalización',
    subtitle: 'Estilo, logo, tipografía y banners de tu marca.',
  },
  inventario: {
    title: 'Inventario y POS',
    subtitle: 'Stock único, productos, sedes y caja.',
  },
  preguntas: {
    title: 'Preguntas frecuentes',
    subtitle: 'Respuestas cortas sobre publicación, POS, pagos y diseño.',
  },
}

export function CuentaTutorialesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const guiaParam = searchParams.get('guia')
  const tabParam = searchParams.get('tab')

  const [category, setCategory] = useState<GuideCategoryId>(() =>
    isGuideCategoryId(tabParam) ? tabParam : 'inicio',
  )
  const [activeGuideId, setActiveGuideId] = useState<string | null>(() =>
    guiaParam && findGuide(guiaParam) ? guiaParam : null,
  )
  const [sections, setSections] = useState<McTutorialSectionWithTutorials[]>([])
  const [videosLoading, setVideosLoading] = useState(true)

  useEffect(() => {
    if (guiaParam && findGuide(guiaParam)) {
      setActiveGuideId(guiaParam)
      const guide = findGuide(guiaParam)
      if (guide) setCategory(guide.featured ? 'inicio' : guide.category)
    }
  }, [guiaParam])

  useEffect(() => {
    if (isGuideCategoryId(tabParam)) {
      setCategory(tabParam)
      if (tabParam === 'preguntas' || tabParam === 'videos') setActiveGuideId(null)
    }
  }, [tabParam])

  const loadVideos = useCallback(async () => {
    if (!firebaseConfigured) {
      setVideosLoading(false)
      return
    }
    setVideosLoading(true)
    try {
      const data = await fetchVisibleTutorialSections(getDb())
      setSections(data)
    } catch {
      setSections([])
    } finally {
      setVideosLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVideos()
  }, [loadVideos])

  const videoCount = useMemo(
    () => sections.reduce((n, s) => n + s.tutorials.length, 0),
    [sections],
  )

  const guides = useMemo(() => guidesForCategory(category), [category])
  const activeGuide = activeGuideId ? (findGuide(activeGuideId) ?? null) : null
  const sectionCopy = category === 'videos' ? null : SECTION_COPY[category]

  function handleCategoryChange(id: GuideCategoryId) {
    setCategory(id)
    setActiveGuideId(null)
    setSearchParams(id === 'inicio' ? {} : { tab: id }, { replace: true })
  }

  function openGuide(id: string) {
    setActiveGuideId(id)
    setSearchParams({ guia: id }, { replace: true })
  }

  function closeGuide() {
    setActiveGuideId(null)
    setSearchParams(category === 'inicio' ? {} : { tab: category }, { replace: true })
  }

  return (
    <ConfiguracionesSubpageLayout
      title="Tutoriales"
      headerExtra={
        <p className="ios-subhead max-w-xl text-[var(--cat-muted)]">
          Menú de guías paso a paso. Elegí un tema y seguí el flujo.
        </p>
      }
    >
      <GuideCategoryNav
        active={category}
        onChange={handleCategoryChange}
        videoCount={videoCount}
      />

      {category !== 'preguntas' && category !== 'videos' ? (
        activeGuide ? (
          <GuideFlowPanel guide={activeGuide} onClose={closeGuide} />
        ) : (
          <div className="space-y-4 pb-8">
            {sectionCopy ? (
              <div className="px-0.5">
                <h2 className="text-[17px] font-semibold tracking-tight text-[var(--cat-text)]">
                  {sectionCopy.title}
                </h2>
                <p className="mt-1 text-[14px] leading-relaxed text-[var(--cat-muted)]">
                  {sectionCopy.subtitle}
                </p>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {guides.map((guide, index) => (
                <GuideFlowCard
                  key={guide.id}
                  guide={guide}
                  index={index}
                  selected={activeGuideId === guide.id}
                  onSelect={() => openGuide(guide.id)}
                />
              ))}
            </div>
          </div>
        )
      ) : null}

      {category === 'preguntas' && sectionCopy ? (
        <div className="space-y-4 pb-8">
          <div className="px-0.5">
            <h2 className="text-[17px] font-semibold tracking-tight text-[var(--cat-text)]">
              {sectionCopy.title}
            </h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[var(--cat-muted)]">
              {sectionCopy.subtitle}
            </p>
          </div>
          <GuideFaqList items={GUIDE_FAQS} />
        </div>
      ) : null}

      {category === 'videos' ? (
        <div className="space-y-5 pb-8">
          {videosLoading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <span
                className="h-9 w-9 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900"
                aria-hidden
              />
              <p className="ios-subhead text-mc-600">Cargando videos…</p>
            </div>
          ) : sections.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-mc-700">
                <IconPlayCircle size={32} />
              </span>
              <p className="text-[17px] font-semibold text-[var(--cat-text)]">Videos en camino</p>
              <p className="max-w-sm text-[14px] leading-relaxed text-[var(--cat-muted)]">
                Mientras tanto, usá las guías del menú: mismo flujo, explicado paso a paso.
              </p>
              <button
                type="button"
                className="mt-1 rounded-xl bg-mc-900 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-black"
                onClick={() => handleCategoryChange('inicio')}
              >
                Ver guías de inicio
              </button>
            </div>
          ) : (
            sections.map((section) => (
              <section
                key={section.id}
                aria-labelledby={`tutorial-section-${section.id}`}
                className="space-y-3"
              >
                <div className="px-0.5">
                  <h2
                    id={`tutorial-section-${section.id}`}
                    className="text-[17px] font-semibold tracking-tight text-[var(--cat-text)]"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-0.5 text-[13px] text-[var(--cat-muted)]">
                    {section.tutorials.length} video
                    {section.tutorials.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {section.tutorials.map((tutorial, index) => (
                    <TutorialCard key={tutorial.id} tutorial={tutorial} index={index} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      ) : null}
    </ConfiguracionesSubpageLayout>
  )
}
