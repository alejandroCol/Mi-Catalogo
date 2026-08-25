import {
  MC_SITE_NAME,
  MC_SITE_ORIGIN,
  mcAbsoluteUrl,
  upsertJsonLd,
  removeJsonLd,
} from '@/seo/mcSeo'
import {
  landingHomeFaqItems,
  landingHomeFeatureNames,
  landingHomeHowToSteps,
} from '@/seo/landingHomeSeoContent'

const JSON_LD_ID = 'mc-landing-home-jsonld'

export function applyLandingHomeJsonLd() {
  upsertJsonLd(JSON_LD_ID, {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${MC_SITE_ORIGIN}/#webpage`,
        url: `${MC_SITE_ORIGIN}/`,
        name: 'Mi Catálogo — Crear tienda virtual en Colombia',
        description:
          'Plataforma para crear tienda virtual, catálogo online y ventas por WhatsApp. Registro gratis, diseño editorial y POS integrado.',
        isPartOf: { '@id': `${MC_SITE_ORIGIN}/#website` },
        inLanguage: 'es-CO',
        about: {
          '@type': 'Thing',
          name: 'Crear tienda virtual',
          description: 'Ecommerce y catálogo online para emprendedores en Colombia',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${MC_SITE_ORIGIN}/#faq`,
        mainEntity: landingHomeFaqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
      {
        '@type': 'HowTo',
        '@id': `${MC_SITE_ORIGIN}/#howto`,
        name: 'Cómo crear una tienda virtual con Mi Catálogo',
        description:
          'Guía para crear tu tienda online en Colombia: registro, productos, diseño y link para vender por WhatsApp o checkout.',
        totalTime: 'PT15M',
        inLanguage: 'es-CO',
        step: landingHomeHowToSteps.map((step, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: step.name,
          text: step.text,
          url: `${MC_SITE_ORIGIN}/#paso-${i + 1}`,
        })),
      },
      {
        '@type': 'ItemList',
        '@id': `${MC_SITE_ORIGIN}/#features`,
        name: `Funcionalidades de ${MC_SITE_NAME}`,
        itemListElement: landingHomeFeatureNames.map((name, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name,
        })),
      },
    ],
  })
}

export function clearLandingHomeJsonLd() {
  removeJsonLd(JSON_LD_ID)
}

export function landingHomeRegisterUrl() {
  return mcAbsoluteUrl('/registro')
}
