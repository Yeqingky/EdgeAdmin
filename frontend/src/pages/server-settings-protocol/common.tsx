import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { ServerTabs } from '../../components/ServerTabs'
import { LoadingBlock } from '../../components/LoadingBlock'

export const SETTINGS_BASE = '/servers/server/settings'

export interface URLPattern {
  type: string
  pattern: string
}

export interface CondItem {
  type?: string
  param?: string
  operator?: string
  value?: string
  isCaseInsensitive?: boolean
}

export interface CondGroup {
  connector?: string
  conds?: CondItem[]
}

export interface CondsConfig {
  isOn?: boolean
  connector?: string
  groups?: CondGroup[]
}

export interface SizeCapacity {
  count: number
  unit: string
}

export interface TimeDuration {
  count: number
  unit: string
}

export interface NetworkAddress {
  protocol: string
  host: string
  portRange: string
}

export interface TrafficSource {
  id: number
  name?: string
}

export function useSearchInt(key: string): number {
  const [params] = useSearchParams()
  const value = Number(params.get(key) || 0)
  return Number.isFinite(value) ? value : 0
}

export function useSearchString(key: string, fallback = ''): string {
  const [params] = useSearchParams()
  return params.get(key) || fallback
}

export function buildSettingsURL(path: string, params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value))
    }
  })
  const isGlobalPath = /^\/(servers|clusters|dns|users|admins|settings|dashboard|log|ui)(\/|$)/.test(path)
  const suffix = path.startsWith(SETTINGS_BASE) || isGlobalPath ? path : `${SETTINGS_BASE}/${path.replace(/^\/+/, '')}`
  const query = search.toString()
  return query.length > 0 ? `${suffix}?${query}` : suffix
}

export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  return () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }
}

interface LeftMenuItem {
  name: string
  path: string
}

const HTTP_MENU: LeftMenuItem[] = [
  { name: '基本信息', path: '' },
  { name: '域名', path: '/serverNames' },
  { name: 'DNS', path: '/dns' },
  { name: 'HTTP', path: '/http' },
  { name: 'HTTPS', path: '/https' },
  { name: '源站', path: '/reverseProxy' },
  { name: 'URL跳转', path: '/redirects' },
  { name: '路径规则', path: '/locations' },
  { name: '重写规则', path: '/rewrite' },
  { name: 'WAF', path: '/waf' },
  { name: '缓存', path: '/cache' },
  { name: '访问控制', path: '/access' },
  { name: '防盗链', path: '/referers' },
  { name: 'UA名单', path: '/userAgent' },
  { name: '访问日志', path: '/accessLog' },
  { name: '内容压缩', path: '/compression' },
  { name: '自定义页面', path: '/pages' },
  { name: 'HTTP Header', path: '/headers' },
  { name: 'Websocket', path: '/websocket' },
  { name: 'WebP', path: '/webp' },
  { name: '统计', path: '/stat' },
  { name: '字符编码', path: '/charset' },
  { name: '静态分发', path: '/web' },
  { name: 'FastCGI', path: '/fastcgi' },
  { name: '访客IP', path: '/remoteAddr' },
  { name: '请求限制', path: '/requestLimit' },
]

const TCP_MENU: LeftMenuItem[] = [
  { name: '基本信息', path: '' },
  { name: '源站', path: '/reverseProxy' },
  { name: 'TCP', path: '/tcp' },
]

const UDP_MENU: LeftMenuItem[] = [
  { name: '基本信息', path: '' },
  { name: '源站', path: '/reverseProxy' },
  { name: 'UDP', path: '/udp' },
]

const FAMILY_MENU: Record<string, LeftMenuItem[]> = {
  http: HTTP_MENU,
  tcp: TCP_MENU,
  udp: UDP_MENU,
}

export type ServerFamily = 'http' | 'tcp' | 'udp' | 'unix'

export function ServerSettingsShell({
  serverId,
  family = 'http',
  activePath,
  children,
}: {
  serverId: number
  family?: ServerFamily
  activePath: string
  children: ReactNode
}) {
  const items = FAMILY_MENU[family] || HTTP_MENU
  const activeName = items.find((item) => item.path === activePath)?.name
  return (
    <div>
      <ServerTabs serverId={serverId} activeName={activeName} />
      <div className="server-settings-layout">
      <div className="left-box with-menu">
        <div className="ui menu text blue vertical small">
          {items.map((item, index) =>
            item.path === '' && index > 0 ? (
              <div className="ui divider" key={`divider-${item.name}`} />
            ) : (
              <a
                key={item.path || 'basic'}
                className={`item${item.path === activePath ? ' active' : ''}`}
                href={`${buildSettingsURL(item.path || '', { serverId })}`}
              >
                {item.name}
              </a>
            ),
          )}
        </div>
      </div>
      <div className="right-box with-menu">{children}</div>
      </div>
    </div>
  )
}

export function SubMenu({ items }: { items: { name: string; href: string; active?: boolean }[] }) {
  return <PageHeader items={items} />
}

export function WarningMessage({ children }: { children: ReactNode }) {
  return (
    <div className="ui message warning" style={{ marginTop: '1em' }}>
      {children}
    </div>
  )
}

export function GroupConfigWarning({ url }: { url?: string }) {
  if (!url) {
    return null
  }
  return (
    <WarningMessage>
      由于已经在当前
      <a href={`${url}`}>网站分组</a>
      中进行了对应的配置,在这里的配置将不会生效.
    </WarningMessage>
  )
}

export function PopupPage({ title, children, backTo }: { title: string; children: ReactNode; backTo: string }) {
  const goBack = useGoBack(backTo)
  return (
    <div>
      <h3>
        {title}{' '}
        <a
          href={`${backTo}`}
          onClick={(event) => {
            event.preventDefault()
            goBack()
          }}
          style={{ fontSize: '0.7em', fontWeight: 'normal' }}
        >
          <ArrowLeft size={14} /> 返回
        </a>
      </h3>
      {children}
    </div>
  )
}

export function QueryLoading({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  if (isLoading) {
    return <LoadingBlock />
  }
  if (isError) {
    return <div className="ui negative message">加载失败</div>
  }
  return null
}

export function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback
  }
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function Comment({ children }: { children: ReactNode }) {
  return <p className="comment">{children}</p>
}

export function CodeLabel({ children }: { children: ReactNode }) {
  return <span className="ui label tiny">{children}</span>
}

export function ValuesEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')

  function confirm() {
    const next = value.trim()
    if (next.length === 0) {
      return
    }
    onChange([...values, next])
    setValue('')
    setAdding(false)
  }

  return (
    <div>
      {values.length > 0 ? (
        <div>
          {values.map((item, index) => (
            <span className="ui label tiny basic" key={`${item}-${index}`} style={{ marginBottom: '0.4em' }}>
              {item}
              <a
                href=""
                title="删除"
                onClick={(event) => {
                  event.preventDefault()
                  onChange(values.filter((_, i) => i !== index))
                }}
              >
                <Trash2 size={12} />
              </a>
            </span>
          ))}
        </div>
      ) : null}
      {adding ? (
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  confirm()
                }
              }}
            />
          </div>
          <div className="ui field">
            <button className="ui button small" type="button" onClick={confirm}>
              确定
            </button>
          </div>
          <div className="ui field">
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                setAdding(false)
                setValue('')
              }}
            >
              取消
            </a>
          </div>
        </div>
      ) : (
        <button
          className="ui button tiny"
          type="button"
          onClick={(event) => {
            event.preventDefault()
            setAdding(true)
          }}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

export function URLPatternsEditor({
  patterns,
  onChange,
  description,
}: {
  patterns: URLPattern[]
  onChange: (patterns: URLPattern[]) => void
  description?: ReactNode
}) {
  const [adding, setAdding] = useState(false)
  const [type, setType] = useState('wildcard')
  const [pattern, setPattern] = useState('')

  const typeNames: Record<string, string> = {
    wildcard: '通配符',
    regexp: '正则',
    images: '常见图片',
    audios: '常见音频',
    videos: '常见视频',
  }

  function confirm() {
    if ((type === 'wildcard' || type === 'regexp') && pattern.trim().length === 0) {
      return
    }
    onChange([...patterns, { type, pattern: pattern.trim() }])
    setPattern('')
    setAdding(false)
  }

  return (
    <div>
      {patterns.length > 0 ? (
        <div>
          {patterns.map((item, index) => (
            <span className="ui label basic small" key={`${item.type}-${item.pattern}-${index}`} style={{ marginBottom: '0.5em' }}>
              <span className="grey">[{typeNames[item.type] || item.type}]</span> {item.pattern}
              <a
                href=""
                title="删除"
                onClick={(event) => {
                  event.preventDefault()
                  onChange(patterns.filter((_, i) => i !== index))
                }}
              >
                <Trash2 size={12} />
              </a>
            </span>
          ))}
        </div>
      ) : null}
      {adding ? (
        <div className="ui fields inline">
          <div className="ui field">
            <select className="ui dropdown" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="wildcard">通配符</option>
              <option value="regexp">正则表达式</option>
              <option value="images">常见图片</option>
              <option value="audios">常见音频</option>
              <option value="videos">常见视频</option>
            </select>
          </div>
          {type === 'wildcard' || type === 'regexp' ? (
            <div className="ui field">
              <input
                type="text"
                value={pattern}
                placeholder={type === 'wildcard' ? '可以使用星号(*)通配符' : '可以使用正则表达式'}
                onChange={(event) => setPattern(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    confirm()
                  }
                }}
              />
            </div>
          ) : null}
          <div className="ui field">
            <button className="ui button small" type="button" onClick={confirm}>
              确定
            </button>
            <a
              href=""
              style={{ marginLeft: '0.5em' }}
              onClick={(event) => {
                event.preventDefault()
                setAdding(false)
              }}
            >
              取消
            </a>
          </div>
        </div>
      ) : (
        <button
          className="ui button tiny basic"
          type="button"
          onClick={(event) => {
            event.preventDefault()
            setAdding(true)
          }}
        >
          <Plus size={12} />
        </button>
      )}
      {description}
    </div>
  )
}

export function CondsEditor({ value, onChange }: { value: CondsConfig; onChange: (value: CondsConfig) => void }) {
  const [raw, setRaw] = useState(JSON.stringify(value, null, 2))
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  const groups = value.groups || []

  function apply() {
    try {
      const parsed = JSON.parse(raw) as CondsConfig
      onChange(parsed)
      setError('')
      setEditing(false)
    } catch (event) {
      setError(event instanceof Error ? event.message : 'JSON格式错误')
    }
  }

  return (
    <div>
      {groups.length > 0 ? (
        <table className="ui table">
          <tbody>
            {groups.map((group, groupIndex) => (
              <tr key={groupIndex}>
                <td className="title">分组{groupIndex + 1}</td>
                <td style={{ background: 'white', wordBreak: 'break-all' }}>
                  {(group.conds || []).map((cond, index) => (
                    <span key={index} className="ui label tiny">
                      {cond.param} {cond.operator} {cond.value}
                      {index < (group.conds || []).length - 1 ? <var style={{ marginLeft: '0.3em' }}>{group.connector || 'or'}</var> : null}
                    </span>
                  ))}
                </td>
                <td style={{ background: 'white' }}>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      onChange({ ...value, groups: groups.filter((_, i) => i !== groupIndex) })
                    }}
                  >
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="comment">暂时还没有匹配条件.</p>
      )}
      {groups.length > 1 ? (
        <div className="ui fields inline" style={{ marginBottom: '0.5em' }}>
          <div className="ui field">分组之间关系</div>
          <div className="ui field">
            <select
              className="ui dropdown"
              value={value.connector || 'or'}
              onChange={(event) => onChange({ ...value, connector: event.target.value })}
            >
              <option value="or">或</option>
              <option value="and">和</option>
            </select>
          </div>
        </div>
      ) : null}
      <a
        href=""
        onClick={(event) => {
          event.preventDefault()
          setRaw(JSON.stringify(value, null, 2))
          setEditing(true)
        }}
      >
        [编辑匹配条件JSON]
      </a>
      {editing ? (
        <div style={{ marginTop: '0.5em' }}>
          <textarea rows={8} value={raw} onChange={(event) => setRaw(event.target.value)} />
          {error ? <p className="comment red">{error}</p> : null}
          <button className="ui button small" type="button" onClick={apply}>
            确定
          </button>
          <a
            href=""
            style={{ marginLeft: '0.5em' }}
            onClick={(event) => {
              event.preventDefault()
              setEditing(false)
              setError('')
            }}
          >
            取消
          </a>
        </div>
      ) : null}
    </div>
  )
}

export function SizeCapacityEditor({
  value,
  onChange,
  units = ['byte', 'kb', 'mb', 'gb'],
}: {
  value: SizeCapacity | null | undefined
  onChange: (value: SizeCapacity) => void
  units?: string[]
}) {
  const names: Record<string, string> = { byte: '字节', kb: 'KiB', mb: 'MiB', gb: 'GiB', tb: 'TiB' }
  const capacity = value ?? { count: -1, unit: units[0] || 'kb' }
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <input
          type="text"
          size={6}
          maxLength={10}
          value={capacity.count >= 0 ? String(capacity.count) : ''}
          onChange={(event) => {
            const next = event.target.value.trim()
            const count = next.length === 0 ? -1 : Number(next)
            onChange({ ...capacity, count: Number.isFinite(count) ? count : -1 })
          }}
        />
      </div>
      <div className="ui field">
        <select className="ui dropdown" value={capacity.unit} onChange={(event) => onChange({ ...capacity, unit: event.target.value })}>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {names[unit] || unit}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function NetworkAddressesEditor({
  protocol,
  addresses,
  onChange,
}: {
  protocol: string
  addresses: NetworkAddress[]
  onChange: (addresses: NetworkAddress[]) => void
}) {
  return (
    <div>
      {addresses.length > 0 ? (
        <table className="ui table">
          <thead>
            <tr>
              <th>协议</th>
              <th>主机</th>
              <th>端口</th>
              <th style={{ width: '5em' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {addresses.map((address, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    size={6}
                    value={address.protocol}
                    onChange={(event) =>
                      onChange(addresses.map((item, i) => (i === index ? { ...item, protocol: event.target.value } : item)))
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={address.host}
                    placeholder="主机地址,留空表示所有"
                    onChange={(event) =>
                      onChange(addresses.map((item, i) => (i === index ? { ...item, host: event.target.value } : item)))
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    size={10}
                    value={address.portRange}
                    placeholder="8080 或 8080-8090"
                    onChange={(event) =>
                      onChange(addresses.map((item, i) => (i === index ? { ...item, portRange: event.target.value } : item)))
                    }
                  />
                </td>
                <td>
                  <a
                    href=""
                    onClick={(event) => {
                      event.preventDefault()
                      onChange(addresses.filter((_, i) => i !== index))
                    }}
                  >
                    删除
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="comment">暂时还没有绑定端口.</p>
      )}
      <button
        className="ui button tiny"
        type="button"
        onClick={(event) => {
          event.preventDefault()
          onChange([...addresses, { protocol, host: '', portRange: '' }])
        }}
      >
        + 添加端口绑定
      </button>
    </div>
  )
}

export function LegacyPopupLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={`${href}`}>
      {children} <ExternalLink size={12} />
    </a>
  )
}
