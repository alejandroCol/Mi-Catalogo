import { HttpsError } from 'firebase-functions/v2/https';
export class MuxStreamProviderError extends Error {
    status;
    muxBody;
    constructor(status, muxBody) {
        super(`Mux create live stream failed (${status}): ${muxBody.slice(0, 200)}`);
        this.name = 'MuxStreamProviderError';
        this.status = status;
        this.muxBody = muxBody;
    }
}
function muxErrorMessage(body) {
    try {
        const parsed = JSON.parse(body);
        const messages = parsed.error?.messages;
        if (Array.isArray(messages) && messages.length > 0) {
            return messages.join(' ');
        }
    }
    catch {
        /* ignore */
    }
    return null;
}
/** Convierte fallos de Mux / live en errores callable legibles (evita 500 genérico). */
export function throwLiveServiceError(err) {
    if (err instanceof HttpsError)
        throw err;
    const message = err instanceof Error ? err.message : String(err);
    const muxDetail = err instanceof MuxStreamProviderError ? muxErrorMessage(err.muxBody) : null;
    if (message.includes('free plan') ||
        muxDetail?.toLowerCase().includes('free plan')) {
        throw new HttpsError('failed-precondition', 'Tu cuenta de Mux está en plan gratuito y no permite live streams. Activá un plan de pago en mux.com (Mux Video) o usá modo demo: MC_LIVE_USE_MOCK=true en Functions.');
    }
    if (err instanceof MuxStreamProviderError || message.includes('Mux create live stream failed')) {
        throw new HttpsError('failed-precondition', muxDetail
            ? `Mux rechazó crear el live: ${muxDetail}`
            : 'No se pudo crear el stream en Mux. Revisá las credenciales MUX_TOKEN_ID y MUX_TOKEN_SECRET.');
    }
    console.error('[live] unhandled error', err);
    throw new HttpsError('internal', 'Error interno al crear el live. Intentá de nuevo.');
}
