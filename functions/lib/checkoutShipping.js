function normalizeCiudadKey(raw) {
    return raw
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}
function findListedTarifaPorCiudad(lista, ciudadKey, departamentoKey) {
    if (!ciudadKey || lista.length === 0)
        return undefined;
    const cityMatches = (x) => Boolean(x?.ciudad && normalizeCiudadKey(String(x.ciudad)) === ciudadKey);
    const deptoNormalized = normalizeCiudadKey(departamentoKey);
    if (deptoNormalized) {
        const explicit = lista.find((x) => cityMatches(x) &&
            x.departamento &&
            normalizeCiudadKey(String(x.departamento)) === deptoNormalized);
        if (explicit)
            return explicit;
        return lista.find((x) => cityMatches(x) && (!x.departamento || !String(x.departamento).trim()));
    }
    return lista.find((x) => cityMatches(x) && (!x.departamento || !String(x.departamento).trim()));
}
export function mergeTenantPlatformEnvio(tenant, platform) {
    const gratis = tenant?.envioGratisDesdeCop;
    const plat = platform;
    const platformHasTariffs = !!plat &&
        ((typeof plat.envioMicatalogoEstimadoCop === 'number' &&
            Number.isFinite(plat.envioMicatalogoEstimadoCop)) ||
            ((plat.envioMicatalogoPorCiudad?.length ?? 0) > 0));
    if (tenant?.envioUsarTarifasMicatalogo === true && platformHasTariffs && plat) {
        const platformDefault = typeof plat.envioMicatalogoEstimadoCop === 'number' &&
            Number.isFinite(plat.envioMicatalogoEstimadoCop)
            ? Math.max(0, Math.round(plat.envioMicatalogoEstimadoCop))
            : typeof tenant?.envioEstimadoCop === 'number' && Number.isFinite(tenant.envioEstimadoCop)
                ? Math.max(0, Math.round(tenant.envioEstimadoCop))
                : 0;
        return {
            envioEstimadoCop: platformDefault,
            envioPorCiudad: plat.envioMicatalogoPorCiudad ?? [],
            envioGratisDesdeCop: gratis,
        };
    }
    return {
        envioEstimadoCop: tenant?.envioEstimadoCop,
        envioPorCiudad: tenant?.envioPorCiudad,
        envioGratisDesdeCop: gratis,
    };
}
export function resolveEnvioCopForCheckout(tenant, ciudadInput, subtotalCop, departamentoInput) {
    const sub = Math.max(0, Math.round(subtotalCop));
    const defaultCop = typeof tenant?.envioEstimadoCop === 'number' && Number.isFinite(tenant.envioEstimadoCop)
        ? Math.max(0, Math.round(tenant.envioEstimadoCop))
        : 0;
    const lista = tenant?.envioPorCiudad ?? [];
    const ciudad = ciudadInput.trim();
    const key = ciudad ? normalizeCiudadKey(ciudad) : '';
    const dept = departamentoInput?.trim() ?? '';
    let base = defaultCop;
    if (key && lista.length > 0) {
        const found = findListedTarifaPorCiudad(lista, key, dept);
        if (found) {
            const c = typeof found.cop === 'number' && Number.isFinite(found.cop) ? Math.round(found.cop) : 0;
            base = Math.max(0, c);
        }
        else {
            base = defaultCop;
        }
    }
    else if (!key) {
        base = defaultCop;
    }
    const umbral = typeof tenant?.envioGratisDesdeCop === 'number' && Number.isFinite(tenant.envioGratisDesdeCop)
        ? Math.max(0, Math.round(tenant.envioGratisDesdeCop))
        : 0;
    if (umbral > 0 && sub >= umbral) {
        return 0;
    }
    return base;
}
