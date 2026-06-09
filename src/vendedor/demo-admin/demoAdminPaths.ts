export function demoAdminBasePath(demoId: string): string {
  return `/vendedor/demo-admin/${demoId}`
}

export function demoAdminPath(demoId: string, segment = ''): string {
  const base = demoAdminBasePath(demoId)
  if (!segment) return base
  return `${base}/${segment.replace(/^\//, '')}`
}
