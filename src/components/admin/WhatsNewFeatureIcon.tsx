/** Iconos propios para la grilla «Lo nuevo» — squircle estilo iOS. */
export function WhatsNewFeatureIcon({ id }: { id: string }) {
  return (
    <span className="mc-whats-new-grid__icon" aria-hidden>
      <svg viewBox="0 0 24 24" fill="currentColor">
        {iconPath(id)}
      </svg>
    </span>
  )
}

function iconPath(id: string) {
  switch (id) {
    case 'combos':
      return (
        <path d="M5 7h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1zm2 3h10v5H7v-5zm2 2v1h6v-1H9z" />
      )
    case 'proveedores':
      return (
        <path d="M12 3 4 7v10l8 4 8-4V7l-8-4zm0 2.5 5.8 2.9L12 11.3 6.2 8.4 12 5.5zM6 10.2 12 13l6-2.8V16l-6 3-6-3v-5.8z" />
      )
    case 'carritos-abandonados':
      return (
        <path d="M6 6h14l-1.5 7.5H7.5L6 6zm2.5 2 1.2 6h7.6l1-5H8.5zM9 17a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm7 0a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0z" />
      )
    case 'reportes-catalogo':
      return <path d="M5 19V5h2v14H5zm5-4V9h2v6H10zm5 6V3h2v18h-2z" />
    case 'resenas-producto':
      return (
        <path d="M12 4.2l1.9 3.8 4.2.6-3 3 .7 4.2L12 14.5l-3.8 2 .7-4.2-3-3 4.2-.6L12 4.2z" />
      )
    case 'envio-estimador-carrito':
      return (
        <path d="M3 6h11v9H3V6zm13 2h3l2 3v4h-5V8zM5 17a2 2 0 110-4 2 2 0 010 4zm11 0a2 2 0 110-4 2 2 0 010 4z" />
      )
    case 'senal-confianza-checkout':
      return (
        <path d="M12 3.4 5.5 6v5.4c0 3.8 2.6 7.2 6.5 8.6 3.9-1.4 6.5-4.8 6.5-8.6V6L12 3.4zM11 12.8l-2.8-2.8 1.4-1.4 1.4 1.4 3.8-3.8 1.4 1.4L11 12.8z" />
      )
    case 'estadisticas-visita':
      return <path d="M4 18V6h2v12H4zm5-6v6h2v-6H9zm5-3v9h2V9h-2z" />
    case 'live-shopping':
      return (
        <path d="M9 8.5v7l6.5-3.5L9 8.5zm11.2-5.2a2.5 2.5 0 012.4 1.8 4.2 4.2 0 010 6.4 2.5 2.5 0 01-4.8-.9 4.2 4.2 0 010-7.3z" />
      )
    case 'showroom-drop-room':
      return <path d="M5 8h14v10H5V8zm2 2v6h10v-6H7zm4 8h2v2h-2v-2zM12 3v3" />
    case 'landing-interactiva':
      return (
        <path d="M4 12c2.8-3.5 5.4-5 8-5s5.2 1.5 8 5c-2.8 3.5-5.4 5-8 5s-5.2-1.5-8-5zm8-3a3 3 0 100 6 3 3 0 000-6zm0 1.6a1.4 1.4 0 110 2.8 1.4 1.4 0 010-2.8z" />
      )
    case 'addi-cuotas':
      return <path d="M4 6h16v3H4V6zm0 5h11v2H4v-2zm0 4h7v2H4v-2zm9 0h7v5h-7v-5z" />
    default:
      return <path d="M6 8h12v8H6V8zm2 2v4h8v-4H8z" />
  }
}
