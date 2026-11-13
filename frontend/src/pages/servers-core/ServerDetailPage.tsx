import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { LoadingBlock } from '../../components/LoadingBlock'
import { FirstMenu, ServerPageLayout, ServerTopMenu, type LeftMenuItem } from './common'

interface ServerData {
  server: { id: number; name: string; clusterId: number }
}

const settingsTabs: Array<{ name: string; path: string; family: 'all' | 'http' | 'tcp' | 'udp' }> = [
  { name: '基础设置', path: '/servers/server/settings', family: 'all' },
  { name: '域名', path: '/servers/server/settings/serverNames', family: 'http' },
  { name: 'DNS', path: '/servers/server/settings/dns', family: 'all' },
  { name: 'HTTP', path: '/servers/server/settings/http', family: 'http' },
  { name: 'HTTPS', path: '/servers/server/settings/https', family: 'http' },
  { name: '源站', path: '/servers/server/settings/reverseProxy', family: 'all' },
  { name: '重定向', path: '/servers/server/settings/redirects', family: 'http' },
  { name: '路径规则', path: '/servers/server/settings/locations', family: 'http' },
  { name: '重写规则', path: '/servers/server/settings/rewrite', family: 'http' },
  { name: 'WAF', path: '/servers/server/settings/waf', family: 'http' },
  { name: '缓存', path: '/servers/server/settings/cache', family: 'http' },
  { name: '访问控制', path: '/servers/server/settings/access', family: 'http' },
  { name: '防盗链', path: '/servers/server/settings/referers', family: 'http' },
  { name: 'User-Agent', path: '/servers/server/settings/userAgent', family: 'http' },
  { name: '访问日志', path: '/servers/server/settings/accessLog', family: 'http' },
  { name: '内容压缩', path: '/servers/server/settings/compression', family: 'http' },
  { name: '页面', path: '/servers/server/settings/pages', family: 'http' },
  { name: 'HTTP Header', path: '/servers/server/settings/headers', family: 'http' },
  { name: 'Websocket', path: '/servers/server/settings/websocket', family: 'http' },
  { name: 'WebP', path: '/servers/server/settings/webp', family: 'http' },
  { name: '统计', path: '/servers/server/settings/stat', family: 'http' },
  { name: '字符集', path: '/servers/server/settings/charset', family: 'http' },
  { name: 'Web', path: '/servers/server/settings/web', family: 'http' },
  { name: 'Fastcgi', path: '/servers/server/settings/fastcgi', family: 'http' },
  { name: '客户端IP', path: '/servers/server/settings/remoteAddr', family: 'http' },
  { name: '请求限制', path: '/servers/server/settings/requestLimit', family: 'http' },
  { name: '其他', path: '/servers/server/settings/common', family: 'http' },
  { name: 'TCP', path: '/servers/server/settings/tcp', family: 'tcp' },
  { name: 'TLS', path: '/servers/server/settings/tls', family: 'tcp' },
  { name: 'UDP', path: '/servers/server/settings/udp', family: 'udp' },
  { name: 'Unix', path: '/servers/server/settings/unix', family: 'all' },
]

export function ServerDetailPage() {
  const [searchParams] = useSearchParams()
  const serverId = Number(searchParams.get('serverId') || 0) || 0

  const query = useQuery({
    queryKey: ['servers-core', 'server-basic', serverId],
    enabled: serverId > 0,
    queryFn: () => apiGet<ServerData>('/servers/server/delete', { serverId }),
  })

  if (serverId <= 0) {
    return <div className="ui negative message">请先在网站列表中选择要查看的网站。</div>
  }
  if (query.isLoading) {
    return <LoadingBlock />
  }
  if (query.isError || !query.data) {
    return <div className="ui negative message">加载失败</div>
  }

  const server = query.data.server
  const menu: LeftMenuItem[] = [
    { name: '统计', url: `/servers/server/stat?serverId=${serverId}` },
    { name: '访问日志', url: `/servers/server/log?serverId=${serverId}` },
    { name: '设置', url: `/servers/server/settings?serverId=${serverId}` },
    { name: '删除', url: `/servers/server/delete?serverId=${serverId}` },
  ]

  return (
    <div>
      <ServerTopMenu serverId={server.id} serverName={server.name} current="settings" />
      <ServerPageLayout menu={menu}>
        <h3>网站概览</h3>
        <table className="ui table definition selectable">
          <tbody>
            <tr>
              <td className="title">网站名称</td>
              <td>{server.name}</td>
            </tr>
            <tr>
              <td>网站ID</td>
              <td>{server.id}</td>
            </tr>
            <tr>
              <td>部署集群</td>
              <td>
                {server.clusterId > 0 ? (
                  <a href={`#/clusters/cluster?clusterId=${server.clusterId}`}>查看集群 #{server.clusterId}</a>
                ) : (
                  <span className="disabled">-</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <h4>网站设置</h4>
        <p className="comment">请选择要修改的设置项。</p>
        <div className="ui segment">
          {settingsTabs.map((tab) => (
            <a
              key={tab.path}
              className="ui label basic"
              style={{ marginBottom: '0.5em' }}
              href={`#${tab.path}?serverId=${server.id}`}
            >
              {tab.name}
            </a>
          ))}
        </div>

        <h4>其他操作</h4>
        <FirstMenu
          items={[
            { name: '统计', href: `#/servers/server/stat?serverId=${server.id}` },
            { name: '访问日志', href: `#/servers/server/log?serverId=${server.id}` },
            { name: '删除网站', href: `#/servers/server/delete?serverId=${server.id}` },
            { name: '返回网站列表', href: '#/servers' },
          ]}
        />
      </ServerPageLayout>
    </div>
  )
}
