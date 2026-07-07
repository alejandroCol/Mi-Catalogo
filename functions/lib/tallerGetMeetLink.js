import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db } from './firebaseAdmin.js';
import { readTallerMeetLinkFromDoc } from './tallerMeetLinkUtils.js';
/** Devuelve el enlace Meet solo cuando el taller ya empezó (contador en cero). */
export const mcTallerGetMeetLink = onCall({ invoker: 'public' }, async (request) => {
    const data = (request.data && typeof request.data === 'object' ? request.data : {});
    const slug = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : '';
    if (!slug || slug.length < 3) {
        throw new HttpsError('invalid-argument', 'Taller no válido.');
    }
    const snap = await db.doc(`mc_talleres/${slug}`).get();
    if (!snap.exists) {
        throw new HttpsError('not-found', 'Taller no encontrado.');
    }
    const taller = snap.data();
    if (taller.active !== true) {
        throw new HttpsError('failed-precondition', 'Taller no activo.');
    }
    const dateMs = typeof taller.dateMs === 'number' ? taller.dateMs : 0;
    if (!dateMs || Date.now() < dateMs) {
        throw new HttpsError('failed-precondition', 'El taller todavía no empezó.');
    }
    const meetLink = readTallerMeetLinkFromDoc(snap.data());
    if (!meetLink) {
        throw new HttpsError('not-found', 'Todavía no hay enlace de Google Meet configurado.');
    }
    return { ok: true, meetLink };
});
