import { IconCheck } from '@/icons/McIcons'
import { VendedorPageHeader } from '@/vendedor/components/VendedorPageHeader'
import {
  capacitacionChecklist,
  capacitacionIntro,
  capacitacionSections,
} from '@/vendedor/vendedorCapacitacionContent'

export function VendedorCapacitacionPage() {
  return (
    <div className="mc-vendedor-page pb-4">
      <VendedorPageHeader
        eyebrow="Capacitación"
        title={capacitacionIntro.title}
        titleAccent={` ${capacitacionIntro.subtitle}`}
        lead={capacitacionIntro.description}
      />

      <section className="mc-vendedor-tip">
        <span className="mc-vendedor-tip__icon" aria-hidden>
          ✓
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-mc-brand-gray">Checklist antes de salir a campo</h2>
          <ul className="mt-4 space-y-2.5">
            {capacitacionChecklist.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-mc-600">
                <IconCheck size={16} className="mt-0.5 shrink-0 text-mc-brand-gold" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="space-y-5 sm:space-y-6">
        {capacitacionSections.map((section, idx) => (
          <article key={section.id} className="mc-vendedor-cap-card">
            <div className="mc-vendedor-cap-card__head">
              <p className="mc-landing-eyebrow mb-2">Módulo {idx + 1}</p>
              <h2 className="text-lg font-semibold tracking-tight text-mc-brand-gray sm:text-xl">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mc-600">{section.summary}</p>
            </div>
            <div className="mc-vendedor-cap-card__body">
              {section.points.map((point) => (
                <p key={point} className="flex gap-3 text-sm leading-relaxed text-mc-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mc-brand-gold" aria-hidden />
                  {point}
                </p>
              ))}
              {section.tip ? (
                <p className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--mc-landing-gold)_35%,white)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_8%,white)] px-4 py-3 text-sm leading-relaxed text-mc-brand-gray">
                  <strong className="font-semibold">Tip:</strong> {section.tip}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
