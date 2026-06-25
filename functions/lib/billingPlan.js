export function isPaidBillingPlan(plan) {
    return plan === 'expert' || plan === 'master';
}
export function isMasterBillingPlan(plan) {
    return plan === 'master';
}
export function isFreeBillingPlan(plan) {
    return !isPaidBillingPlan(plan);
}
