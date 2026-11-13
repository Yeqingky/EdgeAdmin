import type { PageMenuItem } from '../../components/PageHeader'

export function reverseProxyMenu(serverId: number, locationId: number, active: 'index' | 'scheduling' | 'setting'): PageMenuItem[] {
  const query = `?serverId=${serverId}&locationId=${locationId}`
  return [
    { name: '源站列表', href: `#/servers/server/settings/locations/reverseProxy${query}`, active: active === 'index' },
    { name: '调度算法', href: `#/servers/server/settings/locations/reverseProxy/scheduling${query}`, active: active === 'scheduling' },
    { name: '更多设置', href: `#/servers/server/settings/locations/reverseProxy/setting${query}`, active: active === 'setting' },
  ]
}
