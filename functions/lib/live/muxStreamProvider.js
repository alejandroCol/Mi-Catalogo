import { MuxStreamProviderError } from './liveErrors.js';
function muxAuthHeader(tokenId, tokenSecret) {
    return `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')}`;
}
export class MuxStreamProvider {
    tokenId;
    tokenSecret;
    testMode;
    id = 'mux';
    constructor(tokenId, tokenSecret, testMode = false) {
        this.tokenId = tokenId;
        this.tokenSecret = tokenSecret;
        this.testMode = testMode;
    }
    async createStream(input) {
        const res = await fetch('https://api.mux.com/video/v1/live-streams', {
            method: 'POST',
            headers: {
                Authorization: muxAuthHeader(this.tokenId, this.tokenSecret),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playback_policy: ['public'],
                new_asset_settings: { playback_policy: ['public'], test: this.testMode },
                passthrough: input.passthrough.slice(0, 255),
                reduced_latency: true,
                test: this.testMode,
            }),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new MuxStreamProviderError(res.status, body);
        }
        const json = (await res.json());
        const data = json.data;
        const streamId = data?.id?.trim();
        const streamKey = data?.stream_key?.trim();
        const playbackId = data?.playback_ids?.[0]?.id?.trim();
        if (!streamId || !streamKey || !playbackId) {
            throw new Error('Mux response missing stream id, key or playback id');
        }
        return {
            provider: 'mux',
            streamId,
            playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
            ingestUrl: 'rtmps://global-live.mux.com:443/app',
            streamKey,
        };
    }
    async deleteStream(streamId) {
        const res = await fetch(`https://api.mux.com/video/v1/live-streams/${encodeURIComponent(streamId)}`, {
            method: 'DELETE',
            headers: { Authorization: muxAuthHeader(this.tokenId, this.tokenSecret) },
        });
        if (!res.ok && res.status !== 404) {
            const body = await res.text().catch(() => '');
            console.warn('[MuxStreamProvider] deleteStream', streamId, res.status, body.slice(0, 120));
        }
    }
    async getStreamStatus(streamId) {
        const res = await fetch(`https://api.mux.com/video/v1/live-streams/${encodeURIComponent(streamId)}`, {
            headers: { Authorization: muxAuthHeader(this.tokenId, this.tokenSecret) },
        });
        if (!res.ok)
            return 'unknown';
        const json = (await res.json());
        const status = json.data?.status;
        if (status === 'active')
            return 'active';
        if (status === 'idle')
            return 'idle';
        return 'unknown';
    }
}
