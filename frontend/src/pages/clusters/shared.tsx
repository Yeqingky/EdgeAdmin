import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { apiGet } from '../../api/client'

export interface ClusterBasic {
  id: number
  name: string
}

export interface MenuEntry {
  name: string
  href?: string
  active?: boolean
  onClick?: () => void
}

export function Menu({ entries, children }: { entries: MenuEntry[]; children?: ReactNode }) {
  return (
    <div className="ui menu text blue first-menu">
      {entries.map((entry) => (
        <a
          key={entry.name}
          className={`item${entry.active ? ' active' : ''}`}
          href={entry.href || '#'}
          onClick={(event) => {
            if (entry.onClick) {
              event.preventDefault()
              entry.onClick()
            }
          }}
        >
          {entry.name}
        </a>
      ))}
      {children}
    </div>
  )
}

export function Separator() {
  return <span className="disabled item">|</span>
}

export interface ClusterCounts {
  totalNodeClusters?: number
  totalNodes?: number
}

export function ClustersTopMenu({ active, counts }: { active: string; counts?: ClusterCounts }) {
  return (
    <Menu
      entries={[
        { name: `集群 (${counts?.totalNodeClusters ?? 0})`, href: '/clusters', active: active === 'index' },
        { name: `节点 (${counts?.totalNodes ?? 0})`, href: '/clusters/nodes', active: active === 'node' },
      ]}
    >
      <Separator />
      <a className="item" href="/clusters/create">
        [创建集群]
      </a>
      <a className="item" href="/clusters/createNode">
        [创建节点]
      </a>
    </Menu>
  )
}

export function GrantsTopMenu({ active }: { active: 'index' | 'create' }) {
  return (
    <Menu entries={[{ name: '认证列表', href: '/clusters/grants', active: active === 'index' }]}>
      <Separator />
      <a className={`item${active === 'create' ? ' active' : ''}`} href="/clusters/grants/create">
        [创建认证]
      </a>
    </Menu>
  )
}

export function GrantMenu({ grantId, grantName, active }: { grantId: number; grantName: string; active: 'index' | 'test' | 'update' }) {
  return (
    <Menu
      entries={[
        { name: '认证列表', href: '/clusters/grants' },
        { name: `${grantName}详情`, href: `/clusters/grants/grant?grantId=${grantId}`, active: active === 'index' },
        { name: '测试', href: `/clusters/grants/test?grantId=${grantId}`, active: active === 'test' },
        { name: '修改', href: `/clusters/grants/update?grantId=${grantId}`, active: active === 'update' },
      ]}
    />
  )
}

export function RegionsMenu({ active }: { active: 'index' | 'node' }) {
  return (
    <Menu
      entries={[
        { name: '区域', href: '/clusters/regions', active: active === 'index' },
        { name: '节点', href: '/clusters/regions/nodes', active: active === 'node' },
      ]}
    />
  )
}

export function LogsMenu({
  active,
  countUnreadLogs,
  countNeedFixLogs,
}: {
  active: 'index' | 'unread' | 'needFix'
  countUnreadLogs: number
  countNeedFixLogs: number
}) {
  return (
    <Menu
      entries={[
        { name: '所有', href: '/clusters/logs', active: active === 'index' },
        {
          name: `未读(${countUnreadLogs})`,
          href: '/clusters/logs?type=unread',
          active: active === 'unread',
        },
        {
          name: `需修复(${countNeedFixLogs})`,
          href: '/clusters/logs?type=needFix',
          active: active === 'needFix',
        },
      ]}
    />
  )
}

export function useClusterName(clusterId: number) {
  const query = useQuery({
    queryKey: ['cluster-name', clusterId],
    queryFn: () => apiGet<{ currentClusterName?: string }>('/clusters/cluster/delete', { clusterId }),
    enabled: clusterId > 0,
  })
  return query.data?.currentClusterName || `#${clusterId}`
}

export function ClusterTabMenu({
  clusterId,
  clusterName,
  active,
}: {
  clusterId: number
  clusterName: string
  active: 'index' | 'create' | 'group' | 'install'
}) {
  return (
    <div className="ui menu text blue second-menu">
      <a className="item" href={`/clusters/cluster?clusterId=${clusterId}`}>
        {clusterName}
      </a>
      <span className="disabled item" style={{ padding: 0 }}>
        &raquo;
      </span>
      <a className={`item${active === 'index' ? ' active' : ''}`} href={`/clusters/cluster/nodes?clusterId=${clusterId}`}>
        节点列表
      </a>
      <span className="disabled item">|</span>
      <a className={`item${active === 'create' ? ' active' : ''}`} href={`/clusters/cluster/createNode?clusterId=${clusterId}`}>
        [创建节点]
      </a>
      <span className="disabled item">|</span>
      <a className={`item${active === 'install' ? ' active' : ''}`} href={`/clusters/cluster/installManual?clusterId=${clusterId}`}>
        安装升级
      </a>
      <a className={`item${active === 'group' ? ' active' : ''}`} href={`/clusters/cluster/groups?clusterId=${clusterId}`}>
        节点分组
      </a>
    </div>
  )
}

export interface SettingsMenuItem {
  name: string
  href: string
  isOn?: boolean
  separator?: boolean
}

export const clusterSettingsItems = (clusterId: number): SettingsMenuItem[] => [
  { name: '基本信息', href: `/clusters/cluster/settings?clusterId=${clusterId}` },
  { name: 'DNS', href: `/clusters/cluster/settings/dns?clusterId=${clusterId}` },
  { name: '健康检查', href: `/clusters/cluster/settings/health?clusterId=${clusterId}` },
  { name: '-', href: '', separator: true },
  { name: '全局服务配置', href: `/clusters/cluster/settings/global-server-config?clusterId=${clusterId}` },
  { name: '缓存策略', href: `/clusters/cluster/settings/cache?clusterId=${clusterId}` },
  { name: 'WAF策略', href: `/clusters/cluster/settings/waf?clusterId=${clusterId}` },
  { name: 'WAF动作', href: `/clusters/cluster/settings/firewall-actions?clusterId=${clusterId}` },
  { name: 'WebP', href: `/clusters/cluster/settings/webp?clusterId=${clusterId}` },
  { name: '指标', href: `/clusters/cluster/settings/metrics?clusterId=${clusterId}` },
  { name: '-', href: '', separator: true },
  { name: 'DDoS防护', href: `/clusters/cluster/settings/ddos-protection?clusterId=${clusterId}` },
  { name: '系统服务', href: `/clusters/cluster/settings/services?clusterId=${clusterId}` },
]

export function ClusterSettingsLayout({
  clusterId,
  activePath,
  children,
}: {
  clusterId: number
  activePath: string
  children: ReactNode
}) {
  const clusterName = useClusterName(clusterId)
  const items = clusterSettingsItems(clusterId)
  const isActive = (href: string) => href.split('?')[0] === activePath
  const activeItem = items.find((item) => !item.separator && isActive(item.href))
  return (
    <div>
      <div className="ui menu text blue second-menu top-secondary-menu">
        <a className="item" href={`/clusters/cluster?clusterId=${clusterId}`}>
          {clusterName}
        </a>
        <span className="disabled item" style={{ padding: 0 }}>
          &raquo;
        </span>
        <a className="item" href={`/clusters/cluster/settings?clusterId=${clusterId}`}>
          集群设置
        </a>
        <span className="disabled item" style={{ padding: 0 }}>
          &raquo;
        </span>
        <span className="item active">{activeItem ? `"${activeItem.name}"设置` : '设置'}</span>
      </div>
      <div className="cluster-settings-grid">
        <div className="cluster-settings-menu">
          <div className="ui menu text blue vertical small">
            {items.map((item, index) =>
              item.separator ? (
                <div key={`separator-${index}`} className="item separator" />
              ) : (
                <a key={item.name} className={`item${isActive(item.href) ? ' active' : ''}`} href={item.href}>
                  {item.name}
                </a>
              ),
            )}
          </div>
        </div>
        <div className="cluster-settings-content">{children}</div>
      </div>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  width = '46em',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: string
}) {
  return (
    <div className="ui dimmer modals page transition visible active" style={{ display: 'flex', zIndex: 1000 }}>
      <div
        className="ui modal transition visible active"
        style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: width, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="header">
          {title}
          <button className="ui button tiny basic" style={{ float: 'right' }} onClick={onClose} type="button">
            <X size={14} />
          </button>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}

export function formatBits(bits: number, decimals = 2): string {
  if (!isFinite(bits) || bits <= 0) {
    return '0 bps'
  }
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps']
  let value = bits
  let index = 0
  while (value >= 1000 && index < units.length - 1) {
    value /= 1000
    index++
  }
  return `${value.toFixed(decimals)} ${units[index]}`
}

export function formatCount(count: number): string {
  return String(count)
}

export function formatDay(day: string): string {
  if (!day || day.length !== 8) {
    return day
  }
  return `${day.substring(0, 4)}-${day.substring(4, 6)}-${day.substring(6, 8)}`
}

export function parseId(value: string | null): number {
  if (!value) {
    return 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function FieldError({ message }: { message: string }) {
  if (!message) {
    return null
  }
  return <p className="comment red">{message}</p>
}

export interface LevelOption {
  name: string
  code: string
}

// apiPost 的 URLSearchParams 无法表达同名多值字段,而 Go 的 []int64 参数依赖重复字段.
export async function apiPostMulti(url: string, params: Record<string, (string | number)[]>): Promise<void> {
  const body = new URLSearchParams()
  for (const [key, values] of Object.entries(params)) {
    for (const value of values) {
      body.append(key, String(value))
    }
  }
  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  })
  const contentType = resp.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('请求失败')
  }
  const result = (await resp.json()) as { code: number; message?: string }
  if (result.code !== 200) {
    throw new Error(result.message || '请求失败')
  }
}
