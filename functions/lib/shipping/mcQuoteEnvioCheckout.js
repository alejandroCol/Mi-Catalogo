import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { db } from '../firebaseAdmin.js';
import { resolveCheckoutEnvioCop } from './resolveCheckoutEnvio.js';
const enviaApiToken = defineSecret('ENVIA_API_TOKEN');
const PLATFORM_SETTINGS_REF = db.doc('mc_platform/settings');
export const mcQuoteEnvioCheckout = onCall({ invoker: 'public', secrets: [enviaApiToken] }, async (request) => {
    const data = (request.data && typeof request.data === 'object' ? request.data : {});
    const slug = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : '';
    if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) {
        throw new HttpsError('invalid-argument', 'Tienda inválida.');
    }
    const envioDepartamento = typeof data.envioDepartamento === 'string' ? data.envioDepartamento.trim() : '';
    const envioCiudad = typeof data.envioCiudad === 'string' ? data.envioCiudad.trim() : '';
    const envioDireccion = typeof data.envioDireccion === 'string' ? data.envioDireccion.trim() : '';
    if (!envioDepartamento || !envioCiudad || !envioDireccion) {
        throw new HttpsError('invalid-argument', 'Completá departamento, ciudad y dirección de envío.');
    }
    const subtotalCop = typeof data.subtotalCop === 'number' && Number.isFinite(data.subtotalCop)
        ? Math.max(0, Math.round(data.subtotalCop))
        : 0;
    const totalPiezas = typeof data.totalPiezas === 'number' && Number.isFinite(data.totalPiezas)
        ? Math.max(1, Math.round(data.totalPiezas))
        : 1;
    const slugSnap = await db.doc(`mc_slugs/${slug}`).get();
    if (!slugSnap.exists || slugSnap.data().active !== true) {
        throw new HttpsError('not-found', 'Tienda no disponible.');
    }
    const tenantId = slugSnap.data().tenantId;
    if (!tenantId) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenant = tenantSnap.data() ?? {};
    const platformSnap = await PLATFORM_SETTINGS_REF.get();
    const platform = platformSnap.exists ? platformSnap.data() : undefined;
    const resolution = await resolveCheckoutEnvioCop({
        tenant: tenant,
        platform: platform,
        enviaToken: enviaApiToken.value(),
        destinoDepartamento: envioDepartamento,
        destinoCiudad: envioCiudad,
        destinoDireccion: envioDireccion,
        destinoNombre: typeof data.destinoNombre === 'string' ? data.destinoNombre : undefined,
        destinoTelefono: typeof data.destinoTelefono === 'string' ? data.destinoTelefono : undefined,
        subtotalCop,
        totalPiezas,
    });
    const gratisUmbral = typeof tenant.envioGratisDesdeCop === 'number' &&
        tenant.envioGratisDesdeCop > 0 &&
        subtotalCop >= Math.round(tenant.envioGratisDesdeCop);
    let lineaEnvio = 'oculta';
    if (gratisUmbral) {
        lineaEnvio = 'gratis_umbral';
    }
    else if (resolution.envioCop > 0) {
        lineaEnvio = resolution.fuente === 'envia' ? 'cotizacion' : 'cobro';
    }
    return {
        ok: true,
        envioCop: resolution.envioCop,
        fuente: resolution.fuente,
        lineaEnvio,
        seleccionada: resolution.seleccionada
            ? {
                carrier: resolution.seleccionada.carrier,
                carrierLabel: resolution.seleccionada.carrierLabel,
                service: resolution.seleccionada.service,
                serviceDescription: resolution.seleccionada.serviceDescription,
                totalPriceCop: resolution.seleccionada.totalPriceCop,
                deliveryEstimate: resolution.seleccionada.deliveryEstimate,
            }
            : null,
        opciones: (resolution.opciones ?? []).map((o) => ({
            carrier: o.carrier,
            carrierLabel: o.carrierLabel,
            service: o.service,
            serviceDescription: o.serviceDescription,
            totalPriceCop: o.totalPriceCop,
            deliveryEstimate: o.deliveryEstimate,
        })),
    };
});
