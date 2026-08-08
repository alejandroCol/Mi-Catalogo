/** Hosts públicos de Addi (CO). Docs: https://api-docs-sandbox.addi.com/auth/ */
export function addiHosts(sandbox) {
    if (sandbox) {
        return {
            authUrl: 'https://auth.addi-staging.com',
            apiUrl: 'https://api.addi-staging.com',
            audience: 'https://api.addi.com',
            channelsPublicApi: 'https://channels-public-api.addi-staging.com',
        };
    }
    return {
        authUrl: 'https://auth.addi.com',
        apiUrl: 'https://api.addi.com',
        audience: 'https://api.addi.com',
        channelsPublicApi: 'https://channels-public-api.addi.com',
    };
}
export function addiCredentialsDocPath(tenantId) {
    return `mc_tenants/${tenantId}/private_addi/credentials`;
}
export function addiIdemDocPath(tenantId, idem) {
    return `mc_tenants/${tenantId}/addi_idem/${idem}`;
}
export function addiWebhookRoutePath(routeKey) {
    return `mc_addi_webhook_routes/${routeKey}`;
}
export function addiEventLogPath(applicationId, status) {
    const st = status.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    return `mc_addi_event_log/${applicationId}__${st}`;
}
