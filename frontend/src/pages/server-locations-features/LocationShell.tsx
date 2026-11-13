import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { PageHeader, type PageMenuItem } from '../../components/PageHeader'
import type { LocationBaseData } from './types'

function Badge({ text }: { text: string }) {
  return (
    <var
      style={{
        fontStyle: 'normal',
        background: '#db2828',
        color: 'white',
        fontSize: '8px',
        padding: '2px',
        borderRadius: '2px',
        marginLeft: '0.6em',
      }}
    >
      {text}
    </var>
  )
}

export function LocationShell({
  data,
  menu,
  children,
}: {
  data: LocationBaseData | undefined
  menu?: PageMenuItem[]
  children: ReactNode
}) {
  const serverId = data?.serverId || 0
  const locationId = data?.locationId || 0
  const locationsUrl = serverId > 0 ? `/servers/server/settings/locations?serverId=${serverId}` : '/servers'
  const pattern = data?.locationConfig?.pattern || ''
  const items: PageMenuItem[] = [
    { name: '« 返回网站设置', href: locationsUrl },
    { name: '路由规则', href: locationsUrl },
  ]
  if (pattern) {
    items.push({ name: pattern, href: `/servers/server/settings/locations/location?serverId=${serverId}&locationId=${locationId}`, active: true })
  }
  const leftMenuItems = data?.tinyLeftMenuItems || []

  return (
    <div>
      <PageHeader items={items} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1em' }}>
        {leftMenuItems.length > 0 ? (
          <div
            style={{
              flex: '0 0 9em',
              maxHeight: 'calc(100vh - 13em)',
              overflowY: 'auto',
              borderRight: '1px solid #ddd',
              paddingRight: '0.4em',
            }}
          >
            <div className="ui menu text blue vertical tiny" style={{ width: '100%' }}>
              {leftMenuItems.map((item, index) =>
                item.name === '-' ? (
                  <div key={`separator-${index}`} className="item separator" style={{ borderBottom: '1px #eee solid', paddingTop: 0, paddingBottom: 0 }} />
                ) : (
                  <a
                    key={`${item.name}-${index}`}
                    className={`item${item.isActive ? ' active' : ''}`}
                    href={`${item.url}`}
                    style={{ position: 'relative', paddingLeft: '1em', lineHeight: 1.2 }}
                  >
                    <ChevronRight
                      size={10}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        marginTop: '-5px',
                        visibility: item.isActive ? 'visible' : 'hidden',
                      }}
                    />
                    <span style={{ borderBottom: item.isOn ? '1px #666 dashed' : undefined }}>{item.name}</span>
                    {item.isOff ? <Badge text="关" /> : null}
                    {item.isImportant ? <Badge text="开" /> : null}
                  </a>
                ),
              )}
            </div>
          </div>
        ) : null}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          {menu && menu.length > 0 ? <PageHeader items={menu} /> : null}
          {children}
        </div>
      </div>
      <div className="clear" />
    </div>
  )
}
