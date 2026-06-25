import { formatCop } from '@/lib/formatCop'
import {
  EscPosEncoder,
  concatEscPos,
  escPosLinePair,
  escPosRule,
  escPosWrap,
  type EscPosDrawerPin,
} from '@/pos/lib/escpos'
import { POS_CHARS_58MM, type PosPrintJob, type PosTicketData } from '@/pos/lib/posTypes'

export type BuildTicketOptions = {
  openDrawer?: boolean
  drawerPin?: EscPosDrawerPin
  printerName?: string
  charsPerLine?: number
  storeName?: string
}

function formatFechaTicket(ms: number): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(ms))
}

function formatCopTicket(value: number): string {
  return formatCop(value).replace(/\u00A0/g, ' ')
}

export function buildSaleTicketEscPos(
  data: PosTicketData,
  options: BuildTicketOptions = {},
): PosPrintJob {
  const width = options.charsPerLine ?? POS_CHARS_58MM
  const pin = options.drawerPin ?? 0
  const parts: Uint8Array[] = []

  if (options.openDrawer) {
    parts.push(new EscPosEncoder().init().openDrawer(pin).build())
  }

  const body = new EscPosEncoder().init()
  const brand = options.storeName?.trim() || 'MI CATALOGO'

  body.align('center').bold(true).size('double-height').text(brand).newline()
  body.size('normal').bold(false).text(data.sedeNombre).newline()
  body.text(formatFechaTicket(data.fechaMs)).newline()
  body.align('left').newline()

  body.text(escPosLinePair('Vendedor:', data.vendedorNombre, width)).newline()
  body.text(escPosLinePair('Ticket:', data.ventaId.slice(-8).toUpperCase(), width)).newline()
  body.text(escPosRule(width)).newline()

  for (const linea of data.lineas) {
    for (const wrapped of escPosWrap(linea.descripcion, width)) {
      body.text(wrapped).newline()
    }
    const qtyLine = escPosLinePair(`  x${linea.cantidad}`, formatCopTicket(linea.subtotal), width)
    body.text(qtyLine).newline()
  }

  body.text(escPosRule(width)).newline()

  if (data.descuentoGlobal && data.descuentoGlobal > 0) {
    body.text(escPosLinePair('Descuento:', formatCopTicket(data.descuentoGlobal), width)).newline()
    if (data.motivoDescuentoGlobal?.trim()) {
      for (const w of escPosWrap(data.motivoDescuentoGlobal.trim(), width)) {
        body.text(w).newline()
      }
    }
  }

  body.bold(true).text(escPosLinePair('TOTAL:', formatCopTicket(data.total), width)).newline()
  body.bold(false)

  if (data.esCredito) {
    body.text('*** CREDITO / PENDIENTE ***').newline()
  } else {
    for (const pago of data.pagos) {
      body.text(escPosLinePair(pago.etiqueta, formatCopTicket(pago.monto), width)).newline()
    }
  }

  body.newline().align('center').text('Gracias por tu compra').newline()
  body.feed(3).cut()
  parts.push(body.build())

  return {
    printerName: options.printerName?.trim() || 'JAL 58M',
    data: concatEscPos(...parts),
  }
}

export function buildDrawerKickEscPos(pin: EscPosDrawerPin = 0): PosPrintJob {
  return {
    printerName: 'JAL 58M',
    data: new EscPosEncoder().init().openDrawer(pin).build(),
  }
}
