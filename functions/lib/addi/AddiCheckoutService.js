import { HttpsError } from 'firebase-functions/v2/https';
import { buildStorePublicUrl } from '../storePublicUrl.js';
import { AddiAccessPolicy } from './AddiAccessPolicy.js';
import { AddiApplicationsClient } from './AddiApplicationsClient.js';
import { AddiAuthClient } from './AddiAuthClient.js';
import { buildAndPersistCatalogCheckoutOrder, } from './catalogOrderFactory.js';
import { addiIdemDocPath } from './config.js';
import { addiCellphoneCo, addiCityCo, addiClip, addiCleanDigits, addiSplitName, } from './textSanitize.js';
import { ADDI_DEFAULT_MAX_COP, ADDI_DEFAULT_MIN_COP, } from './types.js';
/**
 * Orquesta checkout Addi (Facade): acceso → credenciales → orden → application → redirect.
 */
export class AddiCheckoutService {
    db;
    credentials;
    constructor(db, credentials) {
        this.db = db;
        this.credentials = credentials;
    }
    async start(params) {
        const redirectOrigin = params.redirectOrigin.trim();
        if (!redirectOrigin.startsWith('https://') && !redirectOrigin.startsWith('http://localhost')) {
            throw new HttpsError('invalid-argument', 'Origen de retorno inválido.');
        }
        const idem = typeof params.idempotencyKey === 'string' && params.idempotencyKey.length >= 8
            ? params.idempotencyKey.slice(0, 120)
            : '';
        if (!idem)
            throw new HttpsError('invalid-argument', 'Falta idempotencyKey.');
        // Resolver tenant temprano para política Master (vía slug).
        const slug = params.slug.trim().toLowerCase();
        const slugSnap = await this.db.doc(`mc_slugs/${slug}`).get();
        if (!slugSnap.exists)
            throw new HttpsError('not-found', 'Tienda no disponible.');
        const tenantId = slugSnap.data().tenantId;
        const tenantSnap = await this.db.doc(`mc_tenants/${tenantId}`).get();
        if (!tenantSnap.exists)
            throw new HttpsError('not-found', 'Tienda no encontrada.');
        const tenant = tenantSnap.data();
        AddiAccessPolicy.assertMasterTenant(tenant, { requireEnabled: true });
        const cred = await this.credentials.get(tenantId);
        if (!cred) {
            throw new HttpsError('failed-precondition', 'Esta tienda no tiene credenciales Addi configuradas.');
        }
        const idemRef = this.db.doc(addiIdemDocPath(tenantId, idem));
        const idemExists = await idemRef.get();
        if (idemExists.exists) {
            const d = idemExists.data();
            if (d?.paymentLink && d?.orderId) {
                return {
                    orderId: d.orderId,
                    addiViewToken: d.addiViewToken || '',
                    paymentLink: d.paymentLink,
                    applicationId: d.applicationId,
                };
            }
            if (d?.orderId) {
                await this.db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${d.orderId}`).delete();
                await idemRef.delete();
            }
        }
        const viewTokenPlaceholder = 'pending';
        const built = await buildAndPersistCatalogCheckoutOrder(this.db, {
            slug,
            lineas: params.lineas,
            cuponCodigo: params.cuponCodigo,
            nombre: params.nombre,
            telefono: params.telefono,
            email: params.email,
            nota: params.nota,
            envioCiudad: params.envioCiudad,
            envioDepartamento: params.envioDepartamento,
            envioDireccion: params.envioDireccion,
            envioReferencia: params.envioReferencia,
            clienteTipoDocumento: params.clienteTipoDocumento,
            clienteDocumentoNumero: params.clienteDocumentoNumero,
            carritoIniciadoId: params.carritoIniciadoId,
            esRegalo: params.esRegalo,
            wishlistId: params.wishlistId,
            destinatarioNombre: params.destinatarioNombre,
            enviaToken: params.enviaToken,
            paymentSeed: {
                addiViewToken: viewTokenPlaceholder,
                addiApplicationId: null,
            },
        });
        // Reemplazar view token real
        await built.orderRef.update({ addiViewToken: built.viewToken });
        const apps = new AddiApplicationsClient(cred.sandbox === true);
        const limits = await apps.fetchAllyAmountLimits(cred.allySlug);
        const minCop = limits?.minAmount ?? ADDI_DEFAULT_MIN_COP;
        const maxCop = limits?.maxAmount ?? ADDI_DEFAULT_MAX_COP;
        if (built.totalFinal < minCop || built.totalFinal > maxCop) {
            await built.orderRef.delete();
            throw new HttpsError('failed-precondition', `Addi acepta montos entre ${minCop.toLocaleString('es-CO')} y ${maxCop.toLocaleString('es-CO')} COP.`);
        }
        const routeKey = typeof tenant.addiWebHookK === 'string' && tenant.addiWebHookK.length >= 16
            ? tenant.addiWebHookK
            : '';
        if (!routeKey) {
            await built.orderRef.delete();
            throw new HttpsError('failed-precondition', 'Falta la ruta de webhook Addi. Volvé a vincular credenciales.');
        }
        const callbackUrl = `${params.webhookBaseUrl}?k=${encodeURIComponent(routeKey)}`;
        const redirectionUrl = buildStorePublicUrl(params.publicOrigin, built.slug, `/checkout/pago-validando?addi=1&o=${encodeURIComponent(built.orderId)}&ov=${encodeURIComponent(built.viewToken)}`, { requestOrigin: redirectOrigin });
        const checkoutUrl = buildStorePublicUrl(params.publicOrigin, built.slug, '/checkout', {
            requestOrigin: redirectOrigin,
        });
        const { firstName, lastName } = addiSplitName(built.cliente.nombre);
        const address = {
            lineOne: addiClip(built.envio.direccion, 60),
            city: addiCityCo(built.envio.ciudad),
            country: 'CO',
        };
        const payload = {
            orderId: built.orderId,
            totalAmount: built.totalFinal.toFixed(1),
            shippingAmount: built.envioCop.toFixed(1),
            totalTaxesAmount: '0.0',
            currency: 'COP',
            items: built.lineasRes.map((l) => ({
                sku: l.productId.slice(0, 50),
                name: addiClip(l.nombre, 50),
                quantity: String(l.cantidad),
                unitPrice: Math.round(l.precioUnitarioCop),
                tax: 0,
                category: 'general',
                brand: addiClip(built.tenantNombreTienda, 40),
            })),
            client: {
                idType: built.cliente.tipoDocumento === 'CC' ? 'CC' : built.cliente.tipoDocumento.slice(0, 8),
                idNumber: addiCleanDigits(built.cliente.documentoNumero) || built.cliente.documentoNumero,
                firstName,
                lastName,
                email: built.cliente.email,
                cellphone: addiCellphoneCo(built.cliente.telefono),
                cellphoneCountryCode: '+57',
                address,
            },
            shippingAddress: address,
            billingAddress: address,
            allyUrlRedirection: {
                ...(built.tenantLogoUrl && built.tenantLogoUrl.startsWith('https://')
                    ? { logoUrl: built.tenantLogoUrl }
                    : {}),
                callbackUrl,
                redirectionUrl,
                checkoutUrl,
            },
        };
        try {
            const auth = new AddiAuthClient(cred.sandbox === true);
            const { accessToken } = await auth.fetchAccessToken(cred.clientId, cred.clientSecret);
            const created = await apps.createOnlineApplication(accessToken, payload);
            await built.orderRef.update({
                addiApplicationId: created.applicationId || null,
                updatedAt: Date.now(),
            });
            await idemRef.set({
                orderId: built.orderId,
                addiViewToken: built.viewToken,
                paymentLink: created.redirectUrl,
                applicationId: created.applicationId || null,
                createdAt: Date.now(),
            });
            return {
                orderId: built.orderId,
                addiViewToken: built.viewToken,
                paymentLink: created.redirectUrl,
                applicationId: created.applicationId,
            };
        }
        catch (e) {
            await built.orderRef.delete().catch(() => undefined);
            const msg = e instanceof Error ? e.message : 'Error con Addi.';
            throw new HttpsError('internal', msg);
        }
    }
}
