export function demoPosAdminPath(demoId: string, sub?: string) {
  const base = `/vendedor/demo-pos-admin/${demoId}`
  return sub ? `${base}/${sub}` : base
}

export function demoPosVendorPath(demoId: string, sub?: string) {
  const base = `/vendedor/demo-pos-vendor/${demoId}`
  return sub ? `${base}/${sub}` : base
}
