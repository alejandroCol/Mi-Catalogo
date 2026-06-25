import { buildDrawerKickEscPos, buildSaleTicketEscPos } from '@/pos/lib/ticketBuilder'
import { HttpEscPosTransport } from '@/pos/lib/httpEscPosTransport'
import type {
  McPosVentaPayload,
  PosHardwareStatus,
  PosTransport,
  PosTransportResult,
} from '@/pos/lib/posTypes'
import type { McPosSedeConfig } from '@/types/mc'

const DEFAULT_PRINTER_NAME = 'JAL 58M'

export type PosPrintOptions = {
  openDrawer?: boolean
  forcePrint?: boolean
  storeName?: string
}

function resolveConfig(config?: McPosSedeConfig) {
  return {
    imprimir: config?.imprimirTicketAutomatico !== false,
    abrirCajon: config?.abrirCajonEnVenta !== false,
    printerName: config?.nombreImpresora?.trim() || DEFAULT_PRINTER_NAME,
    bridgeUrl: config?.urlBridge?.trim() || undefined,
    drawerPin: (config?.cajonPin === 1 ? 1 : 0) as 0 | 1,
  }
}

export class PosPrinterService {
  private transport: PosTransport
  private lastVenta: McPosVentaPayload | null = null
  private status: PosHardwareStatus = {
    bridgeReachable: false,
    lastError: null,
    lastPrintAt: null,
  }

  constructor(transport?: PosTransport) {
    this.transport = transport ?? new HttpEscPosTransport()
  }

  getStatus(): PosHardwareStatus {
    return { ...this.status }
  }

  getLastVenta(): McPosVentaPayload | null {
    return this.lastVenta
  }

  async refreshBridgeStatus(bridgeUrl?: string): Promise<boolean> {
    if (bridgeUrl) this.transport = new HttpEscPosTransport(bridgeUrl)
    const ok = (await this.transport.ping?.()) ?? false
    this.status.bridgeReachable = ok
    return ok
  }

  async handleVenta(payload: McPosVentaPayload, options?: PosPrintOptions): Promise<PosTransportResult> {
    this.lastVenta = payload
    return this.printVenta(payload, options)
  }

  async reprintLast(options?: PosPrintOptions): Promise<PosTransportResult> {
    if (!this.lastVenta) return { ok: false, error: 'No hay ticket reciente.' }
    return this.printVenta(this.lastVenta, { ...options, openDrawer: false, forcePrint: true })
  }

  private async printVenta(
    payload: McPosVentaPayload,
    options?: PosPrintOptions,
  ): Promise<PosTransportResult> {
    const cfg = resolveConfig(payload.config)
    const transport = cfg.bridgeUrl ? new HttpEscPosTransport(cfg.bridgeUrl) : this.transport
    const openDrawer =
      options?.openDrawer !== false &&
      cfg.abrirCajon &&
      !payload.ticket.esCredito

    const shouldPrint = options?.forcePrint || cfg.imprimir

    if (!shouldPrint && !openDrawer) {
      return { ok: true }
    }

    try {
      let result: PosTransportResult = { ok: true }

      if (shouldPrint) {
        const job = buildSaleTicketEscPos(payload.ticket, {
          openDrawer,
          drawerPin: cfg.drawerPin,
          printerName: cfg.printerName,
          storeName: options?.storeName,
        })
        result = await transport.send(job)
      } else if (openDrawer) {
        const job = buildDrawerKickEscPos(cfg.drawerPin)
        job.printerName = cfg.printerName
        result = await transport.send(job)
      }

      if (result.ok) {
        this.status.lastPrintAt = Date.now()
        this.status.lastError = null
      } else {
        this.status.lastError = result.error ?? 'Error de impresión'
      }
      return result
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Error de impresión'
      this.status.lastError = error
      return { ok: false, error }
    }
  }
}

export const mcPosPrinter = new PosPrinterService()
