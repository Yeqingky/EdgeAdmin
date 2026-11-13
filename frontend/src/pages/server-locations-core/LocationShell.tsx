import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { spaLink, type MenuItem, type ServerInfo } from './types'

function MenuColumn({ items, size }: { items: MenuItem[]; size: 'small' | 'tiny' }) {
  return (
    <div className={`ui menu text blue vertical ${size}`}>
      {items.map((item, index) => {
        if (item.name === '-') {
          return <div key={`separator-${index}`} className="item separator" />
        }
        const className = `item${item.isActive ? ' active' : ''}${item.isOn ? ' on' : ''}${item.isOff || item.isImportant ? ' off' : ''}`
        return (
          <a key={`${item.name}-${item.url}-${index}`} className={className} href={item.url ? spaLink(item.url) : undefined}>
            <ChevronRight size={11} style={{ visibility: item.isActive ? 'visible' : 'hidden' }} />
            <span>
              {item.name}
              {item.isOff ? <var>关</var> : null}
              {item.isImportant ? <var>开</var> : null}
            </span>
          </a>
        )
      })}
    </div>
  )
}

// 网站设置左侧菜单（对应 legacy left_menu_with_menu）
export function ServerSettingsLeftMenu({ items, disabled }: { items?: MenuItem[]; disabled?: boolean }) {
  return (
    <div className={`left-box with-menu${disabled ? ' disabled' : ''}`}>
      <MenuColumn items={items || []} size="small" />
    </div>
  )
}

// 网站设置顶部面包屑（对应 legacy settings_menu）
export function ServerSettingsBreadcrumb({ serverId, server }: { serverId: string; server?: ServerInfo }) {
  return (
    <PageHeader
      items={[
        { name: '网站列表', href: '/servers' },
        { name: '|' },
        {
          name: server ? `"${server.name}"设置` : '网站设置',
          href: spaLink(`/servers/server/settings?serverId=${serverId}`),
        },
      ]}
    />
  )
}

// 路由规则页面左侧导航（对应 legacy locations/@left_menu.html）
export function LocationLeftMenu({ items, disabled }: { items?: MenuItem[]; disabled?: boolean }) {
  return (
    <div className={`left-box tiny${disabled ? ' disabled' : ''}`}>
      <MenuColumn items={items || []} size="tiny" />
    </div>
  )
}

// 路由规则详情面包屑（对应 legacy locations/@location_menu.html）
export function LocationBreadcrumb({ serverId, locationId, pattern }: {
  serverId: string
  locationId: string
  pattern?: string
}) {
  const listUrl = spaLink(`/servers/server/settings/locations?serverId=${serverId}`)
  return (
    <PageHeader
      items={[
        { name: '« 返回网站设置', href: listUrl },
        { name: '|' },
        { name: '路由规则', href: listUrl },
        { name: '»' },
        {
          name: pattern || '路由规则',
          active: true,
          href: spaLink(`/servers/server/settings/locations/location?serverId=${serverId}&locationId=${locationId}`),
        },
      ]}
    />
  )
}

// 路由规则子页面布局
export function LocationShell({ serverId, locationId, pattern, tinyLeftMenuItems, leftMenuItemIsDisabled, children }: {
  serverId: string
  locationId: string
  pattern?: string
  tinyLeftMenuItems?: MenuItem[]
  leftMenuItemIsDisabled?: boolean
  children: ReactNode
}) {
  return (
    <div className="right-box">
      <LocationBreadcrumb serverId={serverId} locationId={locationId} pattern={pattern} />
      <LocationLeftMenu items={tinyLeftMenuItems} disabled={leftMenuItemIsDisabled} />
      <div className="right-box tiny">{children}</div>
    </div>
  )
}
