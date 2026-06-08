/** Host raíz de la plataforma (parámetro MC_PUBLIC_ORIGIN en Functions). */
export const MC_PLATFORM_HOST_FALLBACK = 'micatalogo.io';
export const MC_RESERVED_STORE_SLUGS = new Set([
    'www',
    'app',
    'api',
    'admin',
    'mail',
    'smtp',
    'cdn',
    'static',
    'assets',
    'staging',
    'dev',
    'test',
    'beta',
    'demo',
    'help',
    'support',
    'status',
    'blog',
    'docs',
    'superadmin',
    'login',
    'registro',
    'firebase',
    'auth',
    'ftp',
    'ns',
    'mx',
    'c',
]);
function normalizeLeadingSlash(path) {
    if (!path || path === '/')
        return '/';
    return path.startsWith('/') ? path : `/${path}`;
}
export function isReservedStoreSlug(slug) {
    return MC_RESERVED_STORE_SLUGS.has(slug.trim().toLowerCase());
}
export function platformHostFromOrigin(origin) {
    try {
        return new URL(origin).hostname.replace(/^www\./, '').toLowerCase();
    }
    catch {
        return MC_PLATFORM_HOST_FALLBACK;
    }
}
export function inferStoreUrlModeFromOrigin(origin) {
    try {
        const { hostname } = new URL(origin);
        const host = hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1')
            return 'path';
        return 'subdomain';
    }
    catch {
        return 'subdomain';
    }
}
export function isStoreOriginForSlug(origin, slug) {
    try {
        const { hostname } = new URL(origin);
        const normalizedSlug = slug.trim().toLowerCase();
        const host = hostname.toLowerCase();
        if (host.endsWith('.localhost')) {
            return host.slice(0, -'.localhost'.length) === normalizedSlug;
        }
        const platformHost = MC_PLATFORM_HOST_FALLBACK;
        return host === `${normalizedSlug}.${platformHost}`;
    }
    catch {
        return false;
    }
}
/** URL absoluta del catálogo para correos, OnePay y recuperación de carrito. */
export function buildStorePublicUrl(platformOrigin, slug, path = '/', opts) {
    const normalizedPath = normalizeLeadingSlash(path);
    const normalizedSlug = slug.trim().toLowerCase();
    const requestOrigin = opts?.requestOrigin?.trim();
    const mode = requestOrigin
        ? inferStoreUrlModeFromOrigin(requestOrigin)
        : inferStoreUrlModeFromOrigin(platformOrigin);
    if (mode === 'path') {
        const base = (requestOrigin ?? platformOrigin).replace(/\/$/, '');
        const prefix = `/c/${encodeURIComponent(normalizedSlug)}`;
        if (normalizedPath === '/')
            return `${base}${prefix}`;
        return `${base}${prefix}${normalizedPath}`;
    }
    if (requestOrigin && isStoreOriginForSlug(requestOrigin, normalizedSlug)) {
        const base = requestOrigin.replace(/\/$/, '');
        if (normalizedPath === '/')
            return base;
        return `${base}${normalizedPath}`;
    }
    const platformHost = platformHostFromOrigin(platformOrigin);
    const protocol = (() => {
        try {
            return new URL(platformOrigin).protocol;
        }
        catch {
            return 'https:';
        }
    })();
    const origin = `${protocol}//${normalizedSlug}.${platformHost}`;
    if (normalizedPath === '/')
        return origin;
    return `${origin}${normalizedPath}`;
}
