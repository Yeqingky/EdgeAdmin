import { useQuery } from '@tanstack/react-query'
import { BarChart3, History, Settings } from 'lucide-react'
import { apiGet } from '../api/client'
import { PageHeader } from './PageHeader'

export function ServerTabs({
  serverId,
  serverName,
  activeName,
}: {
  serverId: number
  serverName?: string
  activeName?: string
}) {
  const nameQuery = useQuery({
    queryKey: ['server-name', serverId],
    queryFn: () => apiGet<{ name: string }>('/servers/server/name', { serverId }),
    enabled: serverId > 0 && !serverName,
  })
  const name = serverName || nameQuery.data?.name || ''
  const currentUrl = typeof window === 'undefined' ? '' : window.location.pathname + window.location.search

  return (
    <>
      <div className="ui top menu tabular tab-menu small">
        <a className="item" href="/servers">
          <var>网站列表</var>
        </a>
        <a className="item active" href={`/servers/server/settings?serverId=${serverId}`}>
          <var>设置</var>
          <Settings size={14} />
          <div className="bottom-indicator" />
        </a>
        <a className="item" href={`/servers/server/stat?serverId=${serverId}`}>
          <var>统计</var>
          <BarChart3 size={14} />
        </a>
        <a className="item" href={`/servers/server/log?serverId=${serverId}`}>
          <var>日志</var>
          <History size={14} />
        </a>
      </div>
      <PageHeader
        items={[
          { name: '网站列表', href: '/servers' },
          { name: '|', disabled: true },
          { name: name ? `"${name}"设置` : '设置', href: `/servers/server/settings?serverId=${serverId}`, active: !activeName },
          { name: '»', disabled: true, hidden: !activeName },
          { name: activeName ? `"${activeName}"设置` : '', href: currentUrl, active: !!activeName, hidden: !activeName },
        ]}
      />
    </>
  )
}
