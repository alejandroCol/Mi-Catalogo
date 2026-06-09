/** Normaliza subscriptionEndsAt desde Firestore (number o Timestamp). */
export function subscriptionEndsAtMs(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (value &&
        typeof value === 'object' &&
        'toMillis' in value &&
        typeof value.toMillis === 'function') {
        const ms = value.toMillis();
        return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
    }
    return null;
}
export function isSubscriptionEndsAtActive(value, nowMs = Date.now()) {
    const ms = subscriptionEndsAtMs(value);
    return ms !== null && ms > nowMs;
}
