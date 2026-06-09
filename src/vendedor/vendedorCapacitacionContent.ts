import {
  pitchPasarelaOnePay,
  pitchPasarelaTxCommissionLabel,
} from '@/vendedor/vendedorPitchContent'

export type CapacitacionSection = {
  id: string
  title: string
  summary: string
  points: string[]
  tip?: string
}

export type CapacitacionFaqItem = {
  id: string
  question: string
  answer: string
}

export const capacitacionIntro = {
  title: 'Capacitación comercial',
  subtitle: 'Estrategias probadas para cerrar marcas en visita presencial',
  description:
    'Este módulo te prepara para presentar Mi Catálogo con confianza. No vendés software: vendés más ventas, menos costos y una imagen profesional.',
}

export const capacitacionSections: CapacitacionSection[] = [
  {
    id: 'por-que-tienda',
    title: 'Por qué toda marca necesita tienda virtual hoy',
    summary: 'El comprador ya decidió en el celular antes de escribirte por WhatsApp.',
    points: [
      'El 70% de las decisiones de compra empiezan con una búsqueda o un link compartido.',
      'Un catálogo en PDF o fotos sueltas transmite improvisación; una tienda transmite confianza.',
      'Sin checkout, cada pedido depende de que alguien conteste rápido — y ahí se pierden ventas.',
      'La competencia que ya tiene tienda captura al cliente que vos dejaste esperando.',
    ],
    tip: 'Preguntá: «¿Cuántos clientes te escriben y no compran porque no ven precio, stock ni formas de pago claras?»',
  },
  {
    id: 'apertura-visita',
    title: 'Apertura de la visita (primeros 2 minutos)',
    summary: 'Conectá con su dolor real antes de mostrar pantallas.',
    points: [
      'Observá la tienda física: «Veo que tienen buen producto — ¿cómo lo muestran hoy a quien no puede venir?»',
      'Validá el canal actual: «¿El 80% de consultas llega por WhatsApp? ¿Quién responde y a qué hora?»',
      'Plantá la semilla: «¿Y si ese mismo catálogo pudiera cobrar solo, incluso de madrugada?»',
      'No abras con precio; abrí con tiempo perdido y ventas que no cerraron.',
    ],
    tip: 'Llevá el celular con una tienda demo ya cargada. La emoción visual vende más que la lista de funciones.',
  },
  {
    id: 'demo-en-vivo',
    title: 'Demo en vivo: el ritual de 5 minutos',
    summary: 'Mostrá la experiencia del cliente final, no el panel de admin.',
    points: [
      '1) Catálogo público: fotos, variantes, tab de ofertas — «Así ve tu cliente la marca».',
      '2) Agregar al carrito y checkout: datos, envío por ciudad, cupón — «Sin que usted conteste un mensaje».',
      '3) Confirmación y seguimiento: «El cliente ve estado del pedido como Rappi o Mercado Libre».',
      '4) Panel admin (opcional): pedidos, ventas del día — «Usted solo despacha».',
      '5) Cierre: «Esto cuesta $29.900 al mes, todo incluido. Sin dominio ni hosting aparte.»',
      '6) Si preguntan por cobro en línea: abrí el pitch (slide 6) y mostrá la pasarela OnePay.',
    ],
    tip: 'Usá el botón «Ver demo» de tu panel y elegí la tienda más parecida al rubro de la marca.',
  },
  {
    id: 'objeciones',
    title: 'Manejo de objeciones frecuentes',
    summary: 'Respondé con comparación concreta, no con tecnicismos.',
    points: [
      '«Ya vendo por Instagram» → «Perfecto; la tienda es el destino del link de la bio, con checkout y envío calculado.»',
      '«Shopify es más conocido» → «Sí, y cuesta 5× más al mes, más dominio, más apps. Nosotros ya incluimos lo que allá es extra.»',
      '«No tengo tiempo» → «En 30 minutos subís productos desde el celular. Nosotros te acompañamos en la activación.»',
      '«Mis clientes pagan contraentrega» → «Podés coordinar por WhatsApp o activar pasarela cuando quieras escalar.»',
      '«Es caro» → «Un vendedor part-time cuesta $800.000+. La tienda trabaja 24/7 por $29.900.»',
      '«La pasarela es cara» → «La comisión es de OnePay, no nuestra. Mi Catálogo no cobra % por venta — solo el plan mensual.»',
      '«No quiero crear otra cuenta» → «Podés empezar sin cuenta OnePay: cobrás en línea y retirás desde Ventas.»',
    ],
  },
  {
    id: 'cierre',
    title: 'Técnicas de cierre presencial',
    summary: 'Convertí interés en decisión el mismo día.',
    points: [
      'Cierre alternativo: «¿Preferís activar con pasarela o empezar coordinando por WhatsApp?»',
      'Urgencia real: «Si activamos hoy, mañana ya podés mandar el link en tus historias.»',
      'Prueba social: «Tenemos marcas de moda, belleza y accesorios vendiendo con el mismo formato.»',
      'Siguiente paso claro: «Te creo la tienda ahora y en 20 minutos te mando el link para probar.»',
      'Si dice «lo pienso»: agenda revisit con fecha — regístrala como pendiente en tu panel.',
    ],
    tip: 'Nunca digas que es gratis. Vendés valor: ventas automáticas, imagen y ahorro vs. contratar personal.',
  },
  {
    id: 'post-visita',
    title: 'Después de la visita',
    summary: 'El seguimiento define la tasa de cierre.',
    points: [
      'Venta exitosa: confirma activación en 24 h y ofrece ayuda con las primeras 5 fotos de producto.',
      'Pendiente: mensaje a las 48 h con screenshot de su rubro en una tienda demo.',
      'Rechazo: anotá el motivo en el panel — nos ayuda a mejorar el pitch.',
      'Revisá tu ratio visitas/vendidas cada semana en el dashboard.',
    ],
  },
]

export const capacitacionPasarelaVisual = {
  moduleLabel: 'Módulo especial',
  title: 'Pasarela OnePay: cómo explicarla en campo',
  summary:
    'Usá el slide 6 del pitch cuando pregunten por cobro con tarjeta, Nequi o PSE. La clave: la comisión es de la pasarela, no de Mi Catálogo.',
  pitchCta: 'Ver pitch → slide 6 (Pasarela OnePay)',
  commissionLabel: pitchPasarelaTxCommissionLabel,
  commissionNote: pitchPasarelaOnePay.commissionNote,
  trustClients: pitchPasarelaOnePay.trustClients,
  trustFootnote: pitchPasarelaOnePay.trustFootnote,
  paymentMethods: pitchPasarelaOnePay.paymentMethods,
  modes: pitchPasarelaOnePay.modes,
  scriptTitle: 'Guión rápido (30 segundos)',
  scriptLines: [
    '«Cuando un cliente paga en tu tienda, la pasarela OnePay procesa el cobro — la misma que usan Movistar y empresas de servicios públicos.»',
    '«La comisión por transacción es {comisión} — eso lo cobra OnePay, no Mi Catálogo. Nosotros solo cobramos el plan mensual.»',
    '«Podés empezar sin crear cuenta OnePay: cobrás en línea y retirás a tu banco. Si más adelante querés escalar, abrís tu comercio OnePay y los retiros pueden ser diarios y gratis.»',
    '«Tu cliente puede pagar con Nequi, Bre-B, PSE o tarjeta de crédito, directo en el checkout.»',
  ],
  whenToShow: [
    'Preguntan «¿cobran con tarjeta?» o «¿aceptan Nequi?»',
    'Quieren vender de noche o fines de semana sin contestar WhatsApp',
    'Comparan con Mercado Pago, Wompi o datáfono',
    'Ya tienen volumen y les importa cuándo llega el dinero al banco',
  ],
  tip: 'Mostrá primero el checkout con pago en línea; después el slide 6 para números y confianza. No empieces por las comisiones.',
}

export const capacitacionPasarelaFaq: CapacitacionFaqItem[] = [
  {
    id: 'comision-micatalogo',
    question: '¿Mi Catálogo cobra comisión por cada venta?',
    answer:
      'No. Mi Catálogo solo cobra el plan mensual de $29.900. La comisión por transacción ({comisión}) la cobra OnePay, la pasarela de pagos — igual que en cualquier tienda en línea en Colombia.',
  },
  {
    id: 'diferencia-modos',
    question: '¿Cuál es la diferencia entre usar la pasarela sin cuenta OnePay y con cuenta?',
    answer:
      'Sin cuenta OnePay (Pasarela Mi Catálogo): activás cobro en línea rápido, retirás desde Ventas y cada dispersión cuesta 0,1% + $800 COP con plazo de 1 día hábil. Con cuenta OnePay propia: registrás tu empresa, los pagos van a tu comercio OnePay, las dispersiones son gratis y pueden ser diarias. En ambos casos la comisión por venta es la misma.',
  },
  {
    id: 'plazo-dinero',
    question: '¿Cuánto demora en llegar el dinero al banco?',
    answer:
      'Sin cuenta OnePay: al solicitar retiro, el abono se procesa en aproximadamente 1 día hábil. Con cuenta OnePay: podés configurar dispersiones diarias sin costo adicional por cada abono.',
  },
  {
    id: 'metodos-pago',
    question: '¿Qué métodos de pago acepta la pasarela?',
    answer:
      'Nequi, Bre-B, PSE y tarjeta de crédito. El cliente elige en el checkout de la tienda — no necesita app extra ni portal aparte.',
  },
  {
    id: 'por-que-onepay',
    question: '¿Por qué OnePay y no otra pasarela?',
    answer:
      'OnePay es una fintech colombiana usada por empresas como Movistar, Promigas, EPM Gas y Efigas. Procesa millones de transacciones al mes, tiene certificación PCI-DSS Level 1 y está pensada para el mercado local (PSE, Nequi, Bre-B). Mi Catálogo la integra para que la marca no tenga que negociar ni desarrollar la conexión.',
  },
  {
    id: 'empezar-sin-pasarela',
    question: '¿Puedo empezar sin activar la pasarela?',
    answer:
      'Sí. Podés arrancar coordinando pedidos por WhatsApp y activar cobro en línea cuando la marca quiera escalar. El cierre alternativo funciona bien: «¿Preferís empezar por WhatsApp o ya con cobro en línea?»',
  },
  {
    id: 'iva-comision',
    question: '¿El IVA se calcula sobre toda la venta?',
    answer:
      'No. El 19% de IVA se calcula solo sobre la comisión de OnePay (el 3,49% + $800), no sobre el monto total que pagó el cliente.',
  },
  {
    id: 'quien-cobra-dispersion',
    question: '¿Quién cobra el costo de la dispersión al banco?',
    answer:
      'Sin cuenta OnePay, el costo de dispersión (0,1% + $800 por retiro) lo define OnePay al transferir fondos a la cuenta bancaria del comercio. Con cuenta OnePay propia, las dispersiones no tienen ese cargo adicional.',
  },
]

export const capacitacionChecklist = [
  'Celular cargado y datos móviles',
  'Tienda demo del rubro de la marca seleccionada',
  'Pitch repasado (botón Ver pitch)',
  'Slide 6 de pasarela OnePay repasado (comisiones y dos modos)',
  'Tarjeta o contacto de seguimiento listo',
  'Registrar visita al salir (aunque sea pendiente)',
]
