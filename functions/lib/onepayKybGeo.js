import { db } from './firebaseAdmin.js';
import { isTenantMembershipActive } from './tenantMembership.js';
import { HttpsError } from 'firebase-functions/v2/https';
const ONEPAY_STATES_API = 'https://api.onepay.la/v1/states';
const ONEPAY_CITIES_API = 'https://api.onepay.la/v1/cities';
async function onepayGeoGetJson(platformSk, url) {
    let res;
    try {
        res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${platformSk.trim()}`,
                Accept: 'application/json',
            },
        });
    }
    catch {
        throw new HttpsError('unavailable', 'No se pudo contactar a OnePay.');
    }
    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
        throw new HttpsError('internal', `OnePay respondió ${res.status} sin JSON válido.`);
    }
    if (!res.ok) {
        const msg = json && typeof json === 'object' && 'message' in json && typeof json.message === 'string'
            ? json.message
            : `OnePay (${res.status}).`;
        throw new HttpsError(res.status === 401 || res.status === 403 ? 'permission-denied' : 'internal', msg);
    }
    return json;
}
function normalizeStateRow(row) {
    if (!row || typeof row !== 'object')
        return null;
    const o = row;
    const id = typeof o.id === 'number' && Number.isFinite(o.id) ? o.id : parseInt(String(o.id ?? ''), 10);
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    if (!Number.isFinite(id) || id <= 0 || name.length < 2)
        return null;
    return { id, name };
}
export function normalizeOnePayStatesPayload(raw) {
    const arr = Array.isArray(raw)
        ? raw
        : raw &&
            typeof raw === 'object' &&
            'data' in raw &&
            Array.isArray(raw.data)
            ? raw.data
            : [];
    const out = [];
    for (const row of arr) {
        const s = normalizeStateRow(row);
        if (s)
            out.push(s);
    }
    out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return out;
}
function normalizeCityRow(row) {
    if (!row || typeof row !== 'object')
        return null;
    const o = row;
    const id = typeof o.id === 'number' && Number.isFinite(o.id) ? o.id : parseInt(String(o.id ?? ''), 10);
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    if (!Number.isFinite(id) || id <= 0 || name.length < 2)
        return null;
    let state = null;
    if (o.state && typeof o.state === 'object') {
        state = normalizeStateRow(o.state);
    }
    if (!state)
        return null;
    return { id, name, state };
}
export function normalizeOnePayCitiesPayload(raw) {
    const empty = {
        cities: [],
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
    };
    if (!raw || typeof raw !== 'object')
        return empty;
    const root = raw;
    const arr = Array.isArray(root.data) ? root.data : [];
    const cities = [];
    for (const row of arr) {
        const c = normalizeCityRow(row);
        if (c)
            cities.push(c);
    }
    const num = (v, fallback) => {
        const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
        return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    return {
        cities,
        current_page: num(root.current_page, 1),
        last_page: num(root.last_page, 1),
        per_page: num(root.per_page, 15),
        total: num(root.total, cities.length),
    };
}
/** Dueño con membresía activa — mismo criterio que mcOnepayListBanksForKyb. */
export async function assertKybGeoCaller(request) {
    if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Iniciá sesión para continuar.');
    }
    const userSnap = await db.doc(`mc_users/${request.auth.uid}`).get();
    const tenantId = userSnap.data()?.tenantId;
    if (!tenantId) {
        throw new HttpsError('failed-precondition', 'Sin tienda asociada.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const td = tenantSnap.data();
    if (td.ownerUid !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño de la tienda puede solicitar la pasarela.');
    }
    if (!isTenantMembershipActive(td)) {
        throw new HttpsError('failed-precondition', 'Tu membresía está vencida.');
    }
}
export async function fetchOnePayStates(platformSk, filterName) {
    const u = new URL(ONEPAY_STATES_API);
    const name = filterName?.trim();
    if (name && name.length >= 2) {
        u.searchParams.set('filter[name]', name.slice(0, 80));
    }
    const raw = await onepayGeoGetJson(platformSk, u.toString());
    return normalizeOnePayStatesPayload(raw);
}
export async function fetchOnePayCities(platformSk, opts) {
    const u = new URL(ONEPAY_CITIES_API);
    if (typeof opts.stateId === 'number' && Number.isFinite(opts.stateId) && opts.stateId > 0) {
        u.searchParams.set('filter[state_id]', String(Math.floor(opts.stateId)));
    }
    const name = opts.filterName?.trim();
    if (name && name.length >= 2) {
        u.searchParams.set('filter[name]', name.slice(0, 80));
    }
    const page = typeof opts.page === 'number' && opts.page > 0 ? Math.floor(opts.page) : 1;
    const perPage = typeof opts.perPage === 'number' && opts.perPage > 0 ? Math.min(50, Math.floor(opts.perPage)) : 20;
    u.searchParams.set('page', String(page));
    u.searchParams.set('per_page', String(perPage));
    u.searchParams.set('sort', 'name');
    const raw = await onepayGeoGetJson(platformSk, u.toString());
    return normalizeOnePayCitiesPayload(raw);
}
