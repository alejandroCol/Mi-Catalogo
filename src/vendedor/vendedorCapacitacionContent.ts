export type CapacitacionSection = {
  id: string
  title: string
  summary: string
  points: string[]
  tip?: string
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

export const capacitacionChecklist = [
  'Celular cargado y datos móviles',
  'Tienda demo del rubro de la marca seleccionada',
  'Pitch repasado (botón Ver pitch)',
  'Tarjeta o contacto de seguimiento listo',
  'Registrar visita al salir (aunque sea pendiente)',
]
