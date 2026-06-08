import { useCallback, useEffect, useState } from 'react'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { TutorialCard } from '@/components/tutorials/TutorialCard'
import { IconPlayCircle } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { fetchVisibleTutorialSections } from '@/lib/tutorials/fetchTutorials'
import type { McTutorialSectionWithTutorials } from '@/lib/tutorials/types'

export function CuentaTutorialesPage() {
  const [sections, setSections] = useState<McTutorialSectionWithTutorials[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    setErr(null)
    try {
      const data = await fetchVisibleTutorialSections(getDb())
      setSections(data)
    } catch {
      setErr('No se pudieron cargar los tutoriales.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <ConfiguracionesSubpageLayout
      title="Tutoriales"
      headerExtra={
        <p className="ios-subhead max-w-xl text-[var(--cat-muted)]">
          Aprendé a sacarle el máximo provecho a Mi Catálogo con videos paso a paso.
        </p>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900" aria-hidden />
          <p className="ios-subhead text-mc-600">Cargando tutoriales…</p>
        </div>
      ) : err ? (
        <p className="border border-red-200/60 bg-red-50/40 px-3 py-2 text-[14px] text-red-900">{err}</p>
      ) : sections.length === 0 ? (
        <div className="mc-card flex flex-col items-center gap-4 px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mc-50 text-mc-700">
            <IconPlayCircle size={32} />
          </span>
          <div className="space-y-1">
            <p className="ios-headline font-semibold text-[var(--cat-text)]">Próximamente</p>
            <p className="ios-subhead max-w-sm text-[var(--cat-muted)]">
              Estamos preparando videos tutoriales para ayudarte a configurar tu tienda.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-10 pb-8">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`tutorial-section-${section.id}`} className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-mc-200/60 bg-gradient-to-br from-mc-50/90 via-white to-white px-5 py-4 sm:px-6 sm:py-5">
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-mc-200/30 blur-2xl"
                  aria-hidden
                />
                <div className="relative flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-mc-800 shadow-sm ring-1 ring-mc-200/50">
                    <IconPlayCircle size={22} />
                  </span>
                  <div>
                    <h2 id={`tutorial-section-${section.id}`} className="ios-headline text-[18px] font-semibold">
                      {section.title}
                    </h2>
                    <p className="ios-footnote mt-0.5 text-[var(--cat-muted)]">
                      {section.tutorials.length} video{section.tutorials.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {section.tutorials.map((tutorial, index) => (
                  <TutorialCard key={tutorial.id} tutorial={tutorial} index={index} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </ConfiguracionesSubpageLayout>
  )
}
