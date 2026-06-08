import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
/** Debe importarse antes que cualquier módulo que use Firestore a nivel de módulo. */
if (getApps().length === 0) {
    initializeApp();
}
export const db = getFirestore();
