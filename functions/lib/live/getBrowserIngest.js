import { defineSecret } from 'firebase-functions/params';
import { LivekitBrowserIngest } from './livekitBrowserIngest.js';
export const livekitUrl = defineSecret('LIVEKIT_URL');
export const livekitApiKey = defineSecret('LIVEKIT_API_KEY');
export const livekitApiSecret = defineSecret('LIVEKIT_API_SECRET');
export function getBrowserIngest(opts) {
    const url = opts?.livekitUrl?.trim();
    const key = opts?.livekitApiKey?.trim();
    const secret = opts?.livekitApiSecret?.trim();
    if (!url || !key || !secret)
        return null;
    return new LivekitBrowserIngest(url, key, secret);
}
export const liveBrowserSecrets = [livekitUrl, livekitApiKey, livekitApiSecret];
