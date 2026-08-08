/** Addi exige textos sin acentos y longitudes acotadas. */
export function addiStripAccents(str) {
    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
}
export function addiClip(str, max) {
    return addiStripAccents(str).trim().slice(0, max);
}
export function addiCleanDigits(str) {
    return String(str).replace(/\D/g, '');
}
export function addiCellphoneCo(raw) {
    let d = addiCleanDigits(raw);
    if (d.startsWith('57') && d.length >= 12)
        d = d.slice(2);
    if (d.length >= 10)
        return d.slice(0, 10);
    return d || '3000000000';
}
export function addiCityCo(raw) {
    let city = addiStripAccents(raw || 'Bogota').trim();
    if (city.toLowerCase().includes('bogota'))
        city = 'Bogota D.C';
    return city.slice(0, 60);
}
export function addiSplitName(fullName) {
    const parts = addiStripAccents(fullName).trim().split(/\s+/).filter(Boolean);
    const firstName = (parts[0] || 'Cliente').slice(0, 50);
    const lastName = (parts.slice(1).join(' ') || 'Apellido').slice(0, 50);
    return { firstName, lastName };
}
