import { getAuth } from 'firebase-admin/auth';
import { markCarritoIniciadoAfterOrderPaid } from '../carritoIniciado.js';
import { catalogSaleOrderSliceFromData, resolveEmailCatalogThemeColors, sendCatalogCustomerPurchaseConfirmationEmail, sendCatalogSalePaidEmail, } from '../catalogSaleEmail.js';
import { fulfillCatalogOrderInventory } from '../catalogInventoryFulfill.js';
import { MC_RESEND_FROM } from '../mcResend.js';
import { buildStorePublicUrl } from '../storePublicUrl.js';
/**
 * Confirma un pedido de catálogo como pagado (SRP: side-effects post-pago).
 * Reutilizable por cualquier proveedor (Addi hoy; OnePay puede migrar después).
 */
export async function confirmCatalogOrderPaid(params) {
    const { db, storeId, orderId, paymentPatch, publicOrigin, resendApiKey } = params;
    const oref = db.doc(`mc_tenants/${storeId}/ordenes_catalogo/${orderId}`);
    const paidAt = Date.now();
    await oref.update({
        estado: 'pagado',
        updatedAt: paidAt,
        seguimientoCompraAt: paidAt,
        ...paymentPatch,
    });
    try {
        await fulfillCatalogOrderInventory(db, storeId, orderId);
    }
    catch (e) {
        console.error('[confirmCatalogOrderPaid] fulfill:', e);
    }
    const oSnap = await oref.get();
    const oRaw = (oSnap.data() || {});
    const o = oRaw;
    const oCarritoId = typeof o.carritoIniciadoId === 'string' ? o.carritoIniciadoId.trim() : '';
    if (oCarritoId) {
        try {
            await markCarritoIniciadoAfterOrderPaid(db, storeId, oCarritoId, orderId, typeof o.cuponCodigo === 'string' ? o.cuponCodigo : undefined);
        }
        catch {
            /* no bloquear */
        }
    }
    const pendingOwner = typeof o.ventaNotificacionEmailSentAt !== 'number';
    const pendingCliente = typeof o.ventaClienteConfirmacionEmailSentAt !== 'number';
    const ce = typeof o.clienteEmail === 'string' ? o.clienteEmail.trim() : '';
    if (!resendApiKey || (!pendingOwner && !pendingCliente))
        return;
    try {
        const tenantSnap = await db.doc(`mc_tenants/${storeId}`).get();
        const tdata = tenantSnap.data();
        const ownerUid = typeof tdata?.ownerUid === 'string' ? tdata.ownerUid : '';
        const nombreTienda = typeof tdata?.nombreTienda === 'string' && tdata.nombreTienda.trim()
            ? tdata.nombreTienda.trim()
            : 'Tu tienda';
        const themeColors = resolveEmailCatalogThemeColors(tdata);
        const origin = publicOrigin.replace(/\/$/, '');
        const slug = typeof tdata?.slug === 'string' && tdata.slug.trim() ? tdata.slug.trim().toLowerCase() : '';
        const catalogUrl = slug ? buildStorePublicUrl(origin, slug) : origin;
        const seguimientoUrl = slug
            ? buildStorePublicUrl(origin, slug, `/seguimiento?o=${encodeURIComponent(orderId)}`)
            : undefined;
        let toEmail = '';
        if (ownerUid) {
            try {
                const au = await getAuth().getUser(ownerUid);
                toEmail = au.email?.trim() ?? '';
            }
            catch {
                /* */
            }
        }
        const sale = catalogSaleOrderSliceFromData(oRaw);
        const pedidosUrl = `${origin}/app/pedidos?o=${encodeURIComponent(orderId)}`;
        const emailPatch = {};
        if (pendingOwner && toEmail) {
            const sent = await sendCatalogSalePaidEmail({
                resendApiKey,
                from: MC_RESEND_FROM,
                to: toEmail,
                nombreTienda,
                orderId,
                themeColors,
                pedidosUrl,
                ...sale,
            });
            if (sent.ok)
                emailPatch.ventaNotificacionEmailSentAt = Date.now();
            else
                console.error('[confirmCatalogOrderPaid] Resend dueño:', sent.error);
        }
        if (pendingCliente && ce) {
            const sentCliente = await sendCatalogCustomerPurchaseConfirmationEmail({
                resendApiKey,
                from: MC_RESEND_FROM,
                to: ce,
                nombreTienda,
                orderId,
                totalCop: sale.totalCop,
                lineas: sale.lineas,
                themeColors,
                clienteNombre: sale.clienteNombre,
                clienteTelefono: sale.clienteTelefono,
                clienteEmail: sale.clienteEmail,
                envioCiudad: sale.envioCiudad,
                envioDireccion: sale.envioDireccion,
                notaCliente: sale.notaCliente,
                numeroReferencia: sale.numeroReferencia,
                catalogUrl,
                seguimientoUrl,
            });
            if (sentCliente.ok)
                emailPatch.ventaClienteConfirmacionEmailSentAt = Date.now();
            else
                console.error('[confirmCatalogOrderPaid] Resend cliente:', sentCliente.error);
        }
        if (Object.keys(emailPatch).length > 0) {
            await oref.update(emailPatch);
        }
    }
    catch (e) {
        console.error('[confirmCatalogOrderPaid] email:', e);
    }
}
