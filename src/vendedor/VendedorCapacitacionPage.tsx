import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconBankCard, IconCheck, IconChevronRight, IconCoins } from '@/icons/McIcons'
import { VendedorPageHeader } from '@/vendedor/components/VendedorPageHeader'
import {
  capacitacionChecklist,
  capacitacionIntro,
  capacitacionPasarelaFaq,
  capacitacionPasarelaVisual,
  capacitacionSections,
  type CapacitacionFaqItem,
  type CapacitacionSection,
} from '@/vendedor/vendedorCapacitacionContent'

function withCommissionLabel(text: string, commissionLabel: string): string {
  return text.replace(/\{comisión\}/g, commissionLabel)
}

function CapacitacionSectionCard({ section, idx }: { section: CapacitacionSection; idx: number }) {
  return (
    <article className="mc-vendedor-cap-card">
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
  )
}

function CapacitacionPasarelaVisual() {
  const {
    moduleLabel,
    title,
    summary,
    pitchCta,
    commissionLabel,
    commissionNote,
    trustClients,
    trustFootnote,
    paymentMethods,
    modes,
    scriptTitle,
    scriptLines,
    whenToShow,
    tip,
  } = capacitacionPasarelaVisual

  return (
    <section className="mc-vendedor-cap-pasarela" aria-labelledby="cap-pasarela-title">
      <div className="mc-vendedor-cap-pasarela__hero">
        <p className="mc-landing-eyebrow mb-2 text-white/70">{moduleLabel}</p>
        <h2 id="cap-pasarela-title" className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-[15px]">{summary}</p>
        <Link
          to="/vendedor/pitch"
          className="mc-vendedor-cap-pasarela__pitch-link mt-5 inline-flex items-center gap-1.5 no-underline"
        >
          {pitchCta}
          <IconChevronRight size={16} />
        </Link>
      </div>

      <div className="mc-vendedor-cap-pasarela__body space-y-5">
        <div className="mc-vendedor-cap-pasarela__commission">
          <div className="flex flex-wrap items-center gap-3">
            <span className="mc-vendedor-cap-pasarela__commission-icon" aria-hidden>
              <IconBankCard size={20} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mc-600">
                Comisión por transacción (ambos modos)
              </p>
              <p className="text-[clamp(1rem,2.2vw,1.2rem)] font-semibold tracking-tight text-mc-brand-gray">
                {commissionLabel}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-mc-600">{commissionNote}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map((mode) => (
            <article
              key={mode.id}
              className={`mc-vendedor-cap-pasarela__mode ${mode.recommended ? 'mc-vendedor-cap-pasarela__mode--recommended' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    mode.recommended
                      ? 'border-[color-mix(in_srgb,var(--mc-landing-gold)_40%,white)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_12%,white)] text-mc-brand-gold'
                      : 'border-neutral-200/70 bg-neutral-50 text-mc-600'
                  }`}
                >
                  {mode.id === 'sin-cuenta' ? <IconCoins size={18} /> : <IconBankCard size={18} />}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${
                    mode.recommended
                      ? 'bg-[color-mix(in_srgb,var(--mc-landing-gold)_18%,white)] text-mc-brand-gray'
                      : 'bg-neutral-100 text-mc-600'
                  }`}
                >
                  {mode.badge}
                </span>
              </div>
              <h3 className="mt-3 text-[15px] font-semibold text-mc-brand-gray">{mode.title}</h3>
              <p className="mt-1 text-[13px] leading-snug text-mc-600">{mode.subtitle}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-neutral-50 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-mc-500">Dispersión</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-mc-brand-gray">{mode.dispersionLabel}</p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-mc-500">Plazo</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-mc-brand-gray">{mode.timingLabel}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mc-vendedor-cap-pasarela__trust">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mc-600">Confían en OnePay</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {trustClients.map((client) => (
              <span key={client} className="mc-vendedor-cap-pasarela__trust-chip">
                {client}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-mc-500">{trustFootnote}</p>
        </div>

        <div className="mc-vendedor-cap-pasarela__methods">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mc-600">Métodos de pago</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {paymentMethods.map((method) => (
              <span key={method} className="mc-vendedor-cap-pasarela__method-chip">
                {method}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="mc-vendedor-cap-pasarela__script">
            <h3 className="text-sm font-semibold text-mc-brand-gray">{scriptTitle}</h3>
            <ul className="mt-3 space-y-2.5">
              {scriptLines.map((line) => (
                <li key={line} className="flex gap-2.5 text-[13px] leading-relaxed text-mc-600">
                  <span className="font-bold text-mc-brand-gold">»</span>
                  {withCommissionLabel(line, commissionLabel)}
                </li>
              ))}
            </ul>
          </div>
          <div className="mc-vendedor-cap-pasarela__when">
            <h3 className="text-sm font-semibold text-mc-brand-gray">Cuándo mostrar el slide 6</h3>
            <ul className="mt-3 space-y-2">
              {whenToShow.map((item) => (
                <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-mc-600">
                  <IconCheck size={14} className="mt-0.5 shrink-0 text-mc-brand-gold" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--mc-landing-gold)_35%,white)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_8%,white)] px-3.5 py-3 text-[13px] leading-relaxed text-mc-brand-gray">
              <strong className="font-semibold">Tip:</strong> {tip}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function CapacitacionFaqItemCard({
  item,
  open,
  onToggle,
  commissionLabel,
}: {
  item: CapacitacionFaqItem
  open: boolean
  onToggle: () => void
  commissionLabel: string
}) {
  return (
    <div className={`mc-vendedor-cap-faq__item ${open ? 'mc-vendedor-cap-faq__item--open' : ''}`}>
      <button
        type="button"
        className="mc-vendedor-cap-faq__trigger"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="text-left text-[15px] font-semibold tracking-tight text-mc-brand-gray">{item.question}</span>
        <span className={`mc-vendedor-cap-faq__chevron ${open ? 'mc-vendedor-cap-faq__chevron--open' : ''}`} aria-hidden>
          <IconChevronRight size={18} />
        </span>
      </button>
      {open ? (
        <div className="mc-vendedor-cap-faq__answer">
          <p className="text-sm leading-relaxed text-mc-600">{withCommissionLabel(item.answer, commissionLabel)}</p>
        </div>
      ) : null}
    </div>
  )
}

function CapacitacionFaqSection() {
  const [openId, setOpenId] = useState<string | null>(capacitacionPasarelaFaq[0]?.id ?? null)
  const commissionLabel = capacitacionPasarelaVisual.commissionLabel

  return (
    <section className="mc-vendedor-cap-faq" aria-labelledby="cap-faq-title">
      <div className="mc-vendedor-cap-faq__head">
        <p className="mc-landing-eyebrow mb-2">Preguntas frecuentes</p>
        <h2 id="cap-faq-title" className="text-lg font-semibold tracking-tight text-mc-brand-gray sm:text-xl">
          Pasarela OnePay en campo
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-mc-600">
          Respuestas listas para objeciones sobre comisiones, plazos y métodos de pago.
        </p>
      </div>
      <div className="mc-vendedor-cap-faq__list">
        {capacitacionPasarelaFaq.map((item) => (
          <CapacitacionFaqItemCard
            key={item.id}
            item={item}
            open={openId === item.id}
            commissionLabel={commissionLabel}
            onToggle={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
          />
        ))}
      </div>
    </section>
  )
}

export function VendedorCapacitacionPage() {
  const pasarelaInsertAfter = capacitacionSections.findIndex((s) => s.id === 'demo-en-vivo')
  const beforePasarela = capacitacionSections.slice(0, pasarelaInsertAfter + 1)
  const afterPasarela = capacitacionSections.slice(pasarelaInsertAfter + 1)

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
        {beforePasarela.map((section, idx) => (
          <CapacitacionSectionCard key={section.id} section={section} idx={idx} />
        ))}

        <CapacitacionPasarelaVisual />
        <CapacitacionFaqSection />

        {afterPasarela.map((section, idx) => (
          <CapacitacionSectionCard key={section.id} section={section} idx={pasarelaInsertAfter + 1 + idx} />
        ))}
      </div>
    </div>
  )
}
