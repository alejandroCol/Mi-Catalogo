import type { McPosSedeConfig } from '@/types/mc'

export const POS_CHARS_58MM = 32

export type PosTicketLinea = {
  descripcion: string
  cantidad: number
  subtotal: number
}

export type PosTicketData = {
  sedeNombre: string
  vendedorNombre: string
  ventaId: string
  fechaMs: number
  lineas: PosTicketLinea[]
  total: number
  descuentoGlobal?: number
  motivoDescuentoGlobal?: string
  pagos: { etiqueta: string; monto: number }[]
  esCredito?: boolean
}

export type PosPrintJob = {
  printerName: string
  data: Uint8Array
}

export type PosTransportResult = {
  ok: boolean
  error?: string
}

export type PosTransport = {
  send(job: PosPrintJob): Promise<PosTransportResult>
  ping?(): Promise<boolean>
}

export type McPosVentaPayload = {
  ticket: PosTicketData
  config?: McPosSedeConfig
}

export type PosHardwareStatus = {
  bridgeReachable: boolean
  lastError: string | null
  lastPrintAt: number | null
}
