/** Tiempo que debe transcurrir desde el cobro antes de poder retirar el neto de una venta. */
export const PASARELA_SALDO_HOLD_MS = 24 * 60 * 60 * 1000;
export function pasarelaSaldoPaidAtMs(input) {
    if (typeof input.seguimientoCompraAt === 'number' && input.seguimientoCompraAt > 0) {
        return input.seguimientoCompraAt;
    }
    if (typeof input.updatedAt === 'number' && input.updatedAt > 0) {
        return input.updatedAt;
    }
    if (typeof input.createdAt === 'number' && input.createdAt > 0) {
        return input.createdAt;
    }
    return 0;
}
export function pasarelaSaldoReleaseAtMs(paidAtMs) {
    return paidAtMs + PASARELA_SALDO_HOLD_MS;
}
export function pasarelaSaldoIsReleased(paidAtMs, nowMs = Date.now()) {
    if (paidAtMs <= 0)
        return false;
    return nowMs >= pasarelaSaldoReleaseAtMs(paidAtMs);
}
