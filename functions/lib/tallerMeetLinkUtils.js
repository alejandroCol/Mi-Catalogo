const MEET_CODE_PATTERN = /^[a-z]{3,4}-[a-z]{3,4}-[a-z]{3,4}$/i;
export function normalizeTallerMeetLink(raw) {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed)
        return null;
    if (MEET_CODE_PATTERN.test(trimmed)) {
        return `https://meet.google.com/${trimmed.toLowerCase()}`;
    }
    let url = trimmed;
    if (/^\/\/.+/.test(url))
        url = `https:${url}`;
    else if (!/^https?:\/\//i.test(url))
        url = `https://${url.replace(/^\/+/, '')}`;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
            return null;
        return parsed.toString();
    }
    catch {
        return null;
    }
}
export function readTallerMeetLinkFromDoc(data) {
    if (!data)
        return null;
    return normalizeTallerMeetLink(data.zoomLink) ?? normalizeTallerMeetLink(data.meetLink);
}
