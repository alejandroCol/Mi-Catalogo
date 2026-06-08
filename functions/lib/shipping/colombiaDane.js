import divipolaJson from '../data/colombia-divipola.json' with { type: 'json' };
const ROWS = divipolaJson;
function normalizeGeoKey(raw) {
    return raw
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}
export function buscarDivipolaMunicipio(departamento, municipio) {
    const d = departamento.trim();
    const m = municipio.trim();
    if (!d || !m)
        return null;
    const mk = normalizeGeoKey(m);
    for (const r of ROWS) {
        if (r.dpto !== d)
            continue;
        if (normalizeGeoKey(r.nom_mpio) === mk)
            return r;
    }
    return null;
}
export function codigoDaneEnviaCiudad(departamento, municipio) {
    const row = buscarDivipolaMunicipio(departamento, municipio);
    if (!row)
        return null;
    const cod = row.cod_mpio;
    return cod.length >= 8 ? cod.slice(0, 8) : cod.padEnd(8, '0');
}
export function codigoEnviaDepartamento(departamento, municipio) {
    const row = buscarDivipolaMunicipio(departamento, municipio);
    if (!row)
        return null;
    return row.cod_dpto === '11' ? 'DC' : row.cod_dpto;
}
