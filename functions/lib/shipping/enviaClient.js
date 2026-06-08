import { codigoDaneEnviaCiudad, codigoEnviaDepartamento } from './colombiaDane.js';
export const ENVIA_SHIPPING_BASE = 'https://api.envia.com';
export const ENVIA_CARRIERS_CO = ['coordinadora', 'servientrega', 'deprisa'];
export const ENVIA_CARRIER_LABELS = {
    coordinadora: 'Coordinadora',
    servientrega: 'Servientrega',
    deprisa: 'Deprisa',
};
async function readEnviaJson(res) {
    const text = await res.text();
    if (!text.trim())
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return { raw: text };
    }
}
export function buildEnviaAddress(input) {
    const city = codigoDaneEnviaCiudad(input.departamento, input.ciudad);
    const state = codigoEnviaDepartamento(input.departamento, input.ciudad);
    if (!city || !state)
        return null;
    const phone = input.phone.replace(/\D/g, '').slice(0, 15);
    const street = input.street.trim().slice(0, 500);
    if (!phone || !street)
        return null;
    return {
        name: input.name.trim().slice(0, 120) || 'Tienda',
        phone,
        street,
        city,
        state,
        country: 'CO',
        postalCode: city,
    };
}
export async function fetchEnviaRate(token, payload) {
    const res = await fetch(`${ENVIA_SHIPPING_BASE}/ship/rate/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            origin: payload.origin,
            destination: payload.destination,
            packages: payload.packages,
            settings: { currency: 'COP' },
            shipment: { type: 1, carrier: payload.carrier },
        }),
    });
    const body = (await readEnviaJson(res));
    if (!res.ok) {
        const msg = (body && typeof body === 'object' && 'error' in body && body.error?.message) ||
            (body && typeof body === 'object' && 'raw' in body && body.raw) ||
            `Envia HTTP ${res.status}`;
        return { ok: false, error: String(msg).slice(0, 300) };
    }
    const rows = body && typeof body === 'object' && 'data' in body ? (body.data ?? []) : [];
    const opciones = [];
    for (const row of rows) {
        const carrier = typeof row.carrier === 'string' ? row.carrier : payload.carrier;
        const service = typeof row.service === 'string' ? row.service : '';
        const priceRaw = row.totalPrice;
        const price = typeof priceRaw === 'number'
            ? priceRaw
            : typeof priceRaw === 'string'
                ? Number.parseFloat(priceRaw)
                : NaN;
        if (!service || !Number.isFinite(price) || price <= 0)
            continue;
        const carrierKey = carrier.toLowerCase();
        opciones.push({
            carrier,
            carrierLabel: ENVIA_CARRIER_LABELS[carrierKey] ?? carrier,
            service,
            serviceDescription: typeof row.serviceDescription === 'string' ? row.serviceDescription : undefined,
            totalPriceCop: Math.round(price),
            deliveryEstimate: typeof row.deliveryEstimate === 'string' ? row.deliveryEstimate : undefined,
        });
    }
    if (opciones.length === 0) {
        return { ok: false, error: 'Sin tarifas para esta ruta.' };
    }
    opciones.sort((a, b) => a.totalPriceCop - b.totalPriceCop);
    return { ok: true, opciones };
}
export async function quoteEnviaCarriersParallel(token, input) {
    const carriers = input.carriers ?? ENVIA_CARRIERS_CO;
    const results = await Promise.allSettled(carriers.map((carrier) => fetchEnviaRate(token, {
        origin: input.origin,
        destination: input.destination,
        packages: input.packages,
        carrier,
    })));
    const merged = [];
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value.ok) {
            merged.push(...r.value.opciones);
        }
    }
    merged.sort((a, b) => a.totalPriceCop - b.totalPriceCop);
    return merged;
}
export function selectEnvioQuoteOption(opciones, transportadoraFavorita) {
    if (opciones.length === 0)
        return undefined;
    const sorted = [...opciones].sort((a, b) => a.totalPriceCop - b.totalPriceCop);
    const fav = transportadoraFavorita?.trim().toLowerCase();
    if (fav && ENVIA_CARRIERS_CO.includes(fav)) {
        const match = sorted.find((o) => o.carrier.toLowerCase() === fav);
        if (match)
            return match;
    }
    return sorted[0];
}
