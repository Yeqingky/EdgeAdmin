import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { apiGet } from '../../api/client'
import { Checkbox, Select, TextInput } from '../../components/form'
import {
  type CacheDir,
  type DnsRouteOption,
  type IPAddressItem,
  type NetworkAddressConfig,
  type NodeGrantRef,
  type SizeCapacity,
  isIPv6,
} from './shared'

export function MenuLinks({ items }: { items: { name: string; to: string; active?: boolean; hidden?: boolean }[] }) {
  const visible = items.filter((item) => !item.hidden)
  if (visible.length === 0) {
    return null
  }
  return (
    <div className="ui menu text blue first-menu">
      {visible.map((item) => (
        <Link key={`${item.name}-${item.to}`} className={`item${item.active ? ' active' : ''}`} to={item.to}>
          {item.name}
        </Link>
      ))}
    </div>
  )
}

export function Modal({ title, children, onClose, width }: { title: ReactNode; children: ReactNode; onClose: () => void; width?: string }) {
  return (
    <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
      <div className="ui modal transition visible active" style={{ display: 'block', position: 'relative', margin: 'auto', width: width || '46em' }}>
        <div className="header">{title}</div>
        <div className="content" style={{ maxHeight: '32em', overflowY: 'auto' }}>
          {children}
        </div>
        <div className="actions">
          <button className="ui button" type="button" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export function ValueList({ values, onChange, placeholder }: { values: string[]; onChange: (values: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  function confirm() {
    const value = draft.trim()
    if (!value) {
      return
    }
    if (!values.includes(value)) {
      onChange([...values, value])
    }
    setDraft('')
    setAdding(false)
  }

  return (
    <div>
      {values.length > 0 ? (
        <div style={{ marginBottom: '0.5em' }}>
          {values.map((value, index) => (
            <span key={`${value}-${index}`} className="ui label tiny basic" style={{ marginTop: '0.4em', marginBottom: '0.4em' }}>
              {value}
              &nbsp;
              <a
                href=""
                title="删除"
                onClick={(event) => {
                  event.preventDefault()
                  onChange(values.filter((item) => item !== value))
                }}
              >
                <X size={11} />
              </a>
            </span>
          ))}
        </div>
      ) : null}
      {adding ? (
        <div className="ui fields inline">
          <div className="ui field">
            <TextInput
              autoFocus
              type="text"
              value={draft}
              placeholder={placeholder}
              onChange={(event) => setDraft(event.target.value)}
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
            &nbsp;
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                setDraft('')
                setAdding(false)
              }}
            >
              取消
            </a>
          </div>
        </div>
      ) : (
        <button className="ui button tiny" type="button" onClick={() => setAdding(true)}>
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

const CAPACITY_UNITS: { value: string; name: string }[] = [
  { value: 'byte', name: '字节' },
  { value: 'kb', name: 'KiB' },
  { value: 'mb', name: 'MiB' },
  { value: 'gb', name: 'GiB' },
  { value: 'tb', name: 'TiB' },
  { value: 'pb', name: 'PiB' },
  { value: 'eb', name: 'EiB' },
]

export function SizeCapacityInput({ value, onChange }: { value: SizeCapacity; onChange: (value: SizeCapacity) => void }) {
  const [count, setCount] = useState(value.count > 0 ? String(value.count) : '')
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <TextInput
          type="text"
          size={6}
          maxLength={10}
          value={count}
          onChange={(event) => {
            const text = event.target.value
            setCount(text)
            const parsed = parseInt(text.trim(), 10)
            onChange({ count: isNaN(parsed) ? 0 : parsed, unit: value.unit })
          }}
        />
      </div>
      <div className="ui field">
        <Select value={value.unit} onChange={(event) => onChange({ count: value.count, unit: event.target.value })}>
          {CAPACITY_UNITS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

export function DnsRoutesSelector({
  allRoutes,
  value,
  onChange,
}: {
  allRoutes: DnsRouteOption[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [keyword, setKeyword] = useState('')
  const selected = useMemo(() => {
    return value
      .map((routeKey) => allRoutes.find((route) => `${route.code}@${route.domainId}` === routeKey))
      .filter((route): route is DnsRouteOption => !!route)
  }, [allRoutes, value])

  const searching = useMemo(() => {
    const lower = keyword.trim().toLowerCase()
    if (!lower) {
      return allRoutes
    }
    return allRoutes.filter(
      (route) =>
        route.name.toLowerCase().includes(lower) ||
        route.code.toLowerCase().includes(lower) ||
        route.domainName.toLowerCase().includes(lower),
    )
  }, [allRoutes, keyword])

  return (
    <div>
      {selected.length > 0 ? (
        <div style={{ marginBottom: '0.5em' }}>
          {selected.map((route) => {
            const routeKey = `${route.code}@${route.domainId}`
            return (
              <span key={routeKey} className="ui label tiny basic" style={{ marginBottom: '0.4em' }}>
                {route.name} <span className="grey small">（{route.domainName}）</span>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    onChange(value.filter((item) => item !== routeKey))
                  }}
                >
                  <X size={11} />
                </a>
              </span>
            )
          })}
        </div>
      ) : null}
      {adding ? (
        <table className="ui table">
          <tbody>
            <tr>
              <td className="title">所有线路</td>
              <td>
                {searching.length === 0 ? (
                  <span className="disabled">没有可选的线路。</span>
                ) : (
                  <Select
                    defaultValue=""
                    onChange={(event) => {
                      const routeKey = event.target.value
                      if (routeKey && !value.includes(routeKey)) {
                        onChange([...value, routeKey])
                        setAdding(false)
                        setKeyword('')
                      }
                    }}
                  >
                    <option value="">[请选择]</option>
                    {searching.map((route) => {
                      const routeKey = `${route.code}@${route.domainId}`
                      return (
                        <option key={routeKey} value={routeKey}>
                          {route.name}（{route.code}/{route.domainName}）
                        </option>
                      )
                    })}
                  </Select>
                )}
                <div className="ui field" style={{ marginTop: '0.6em' }}>
                  <TextInput
                    type="text"
                    placeholder="线路名称或代号..."
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                  />
                </div>
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault()
                    setAdding(false)
                    setKeyword('')
                  }}
                >
                  取消
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <button className="ui button small" type="button" onClick={() => setAdding(true)}>
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

interface GrantsData {
  grants: NodeGrantRef[]
  suggestGrants?: NodeGrantRef[]
}

export function GrantSelector({ clusterId, value, onChange }: { clusterId: number; value: NodeGrantRef | null; onChange: (grant: NodeGrantRef | null) => void }) {
  const [opened, setOpened] = useState(false)
  const query = useQuery({
    queryKey: ['grants-select', clusterId],
    queryFn: () => apiGet<GrantsData>('/clusters/grants/selectPopup', { nodeClusterId: clusterId }),
    enabled: opened,
  })

  return (
    <div>
      {value && value.id > 0 ? (
        <div className="ui label small basic">
          {value.name}
          <span className="small grey">（{value.methodName}）</span>
          {value.username ? <span className="small grey">（{value.username}）</span> : null}
          &nbsp;
          <a
            href=""
            title="删除"
            onClick={(event) => {
              event.preventDefault()
              onChange(null)
            }}
          >
            <X size={11} />
          </a>
        </div>
      ) : null}
      {!value || value.id <= 0 ? (
        <span>
          <a
            href=""
            onClick={(event) => {
              event.preventDefault()
              setOpened(true)
            }}
          >
            [选择已有认证]
          </a>
          &nbsp; &nbsp;
          <Link to="/clusters/grants">[管理认证]</Link>
        </span>
      ) : null}
      {opened ? (
        <Modal title="选择SSH登录认证" onClose={() => setOpened(false)}>
          {query.isLoading ? <div className="loading-block">加载中...</div> : null}
          {query.data && query.data.grants.length === 0 ? <p className="comment">暂时还没有认证信息。</p> : null}
          {query.data && query.data.grants.length > 0 ? (
            <table className="ui table selectable">
              <tbody>
                {query.data.grants.map((grant) => (
                  <tr key={grant.id}>
                    <td>
                      <a
                        href=""
                        onClick={(event) => {
                          event.preventDefault()
                          onChange(grant)
                          setOpened(false)
                        }}
                      >
                        {grant.name}
                      </a>
                    </td>
                    <td>{grant.methodName}</td>
                    <td>{grant.username}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </Modal>
      ) : null}
    </div>
  )
}

interface GroupSelectData {
  groups: { id: number; name: string }[]
}

interface RegionSelectData {
  regions: { id: number; name: string }[]
}

export function GroupSelector({ clusterId, value, onChange }: { clusterId: number; value: { id: number; name: string } | null; onChange: (value: { id: number; name: string } | null) => void }) {
  const query = useQuery({
    queryKey: ['node-groups', clusterId],
    queryFn: () => apiGet<GroupSelectData>('/clusters/cluster/groups/selectPopup', { clusterId }),
    enabled: clusterId > 0,
  })
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <Select
          value={value ? String(value.id) : '0'}
          onChange={(event) => {
            const groupId = Number(event.target.value)
            if (groupId <= 0) {
              onChange(null)
              return
            }
            const found = query.data?.groups.find((group) => group.id === groupId)
            onChange(found ? { id: found.id, name: found.name } : null)
          }}
        >
          <option value="0">[无分组]</option>
          {(query.data?.groups || []).map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

export function RegionSelector({ value, onChange }: { value: { id: number; name: string } | null; onChange: (value: { id: number; name: string } | null) => void }) {
  const query = useQuery({
    queryKey: ['node-regions'],
    queryFn: () => apiGet<RegionSelectData>('/clusters/regions/selectPopup'),
  })
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <Select
          value={value ? String(value.id) : '0'}
          onChange={(event) => {
            const regionId = Number(event.target.value)
            if (regionId <= 0) {
              onChange(null)
              return
            }
            const found = query.data?.regions.find((region) => region.id === regionId)
            onChange(found ? { id: found.id, name: found.name } : null)
          }}
        >
          <option value="0">[无区域]</option>
          {(query.data?.regions || []).map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  )
}

interface IPDraft {
  ip: string
  name: string
  canAccess: boolean
  isUp: boolean
}

const EMPTY_IP_DRAFT: IPDraft = { ip: '', name: '', canAccess: true, isUp: true }

export function IPAddressesEditor({ value, onChange }: { value: IPAddressItem[]; onChange: (value: IPAddressItem[]) => void }) {
  const [editing, setEditing] = useState<{ index: number; draft: IPDraft } | null>(null)
  const [adding, setAdding] = useState<IPDraft | null>(null)

  function submitAdd() {
    if (!adding) {
      return
    }
    const ipText = adding.ip.trim()
    if (!ipText) {
      return
    }
    const next = [...value]
    for (const piece of ipText.split(/[\s,;]+/)) {
      if (!piece) {
        continue
      }
      next.push({
        id: 0,
        ip: piece,
        name: adding.name.trim(),
        canAccess: adding.canAccess,
        isUp: adding.isUp,
        isOn: true,
        thresholds: [],
      })
    }
    onChange(next)
    setAdding(null)
  }

  function submitEdit() {
    if (!editing) {
      return
    }
    const next = value.map((item, index) =>
      index === editing.index
        ? { ...item, ip: editing.draft.ip.trim(), name: editing.draft.name.trim(), canAccess: editing.draft.canAccess, isUp: editing.draft.isUp }
        : item,
    )
    onChange(next)
    setEditing(null)
  }

  function renderDraft(draft: IPDraft, onDraft: (draft: IPDraft) => void, onConfirm: () => void, onCancel: () => void) {
    return (
      <div className="ui segment">
        <div className="ui fields inline">
          <div className="ui field">
            <TextInput
              type="text"
              autoFocus
              placeholder="IP地址"
              maxLength={64}
              value={draft.ip}
              onChange={(event) => onDraft({ ...draft, ip: event.target.value })}
            />
          </div>
          <div className="ui field">
            <TextInput
              type="text"
              placeholder="备注"
              maxLength={50}
              value={draft.name}
              onChange={(event) => onDraft({ ...draft, name: event.target.value })}
            />
          </div>
        </div>
        <Checkbox label="公开访问" checked={draft.canAccess} onChange={(checked) => onDraft({ ...draft, canAccess: checked })} />
        &nbsp;&nbsp;
        <Checkbox label="在线" checked={draft.isUp} onChange={(checked) => onDraft({ ...draft, isUp: checked })} />
        <div style={{ marginTop: '0.6em' }}>
          <button className="ui button small" type="button" onClick={onConfirm}>
            确定
          </button>
          &nbsp;
          <a
            href=""
            onClick={(event) => {
              event.preventDefault()
              onCancel()
            }}
          >
            取消
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      {value.length > 0 ? (
        <div>
          {value.map((address, index) => (
            <div key={`${address.id}-${index}`} className="ui label tiny basic" style={{ marginBottom: '0.4em' }}>
              {isIPv6(address.ip) ? <span className="grey">[IPv6]</span> : null} {address.ip}
              {address.name ? (
                <span className="small grey">
                  （备注：{address.name}
                  {!address.canAccess ? '，不公开访问' : ''}）
                </span>
              ) : null}
              {!address.name && !address.canAccess ? <span className="small grey">（不公开访问）</span> : null}
              {address.isOn === false ? <span className="small red">[off]</span> : null}
              {address.isUp === false ? <span className="small red">[down]</span> : null}
              {address.thresholds && address.thresholds.length > 0 ? <span className="small">[{address.thresholds.length}个阈值]</span> : null}
              {address.clusters && address.clusters.length > 0 ? (
                <span>
                  &nbsp; <span className="small grey">专属集群：[</span>
                  <span className="small grey">{address.clusters.map((cluster) => cluster.name).join('，')}</span>
                  <span className="small grey">]</span>
                </span>
              ) : null}
              &nbsp;
              <a
                href=""
                title="修改"
                onClick={(event) => {
                  event.preventDefault()
                  setEditing({
                    index,
                    draft: {
                      ip: address.ip,
                      name: address.name || '',
                      canAccess: address.canAccess,
                      isUp: address.isUp !== false,
                    },
                  })
                }}
              >
                修改
              </a>
              &nbsp;
              <a
                href=""
                title="删除"
                onClick={(event) => {
                  event.preventDefault()
                  onChange(value.filter((_, itemIndex) => itemIndex !== index))
                }}
              >
                <X size={11} />
              </a>
            </div>
          ))}
          <div className="ui divider" />
        </div>
      ) : null}
      {editing ? renderDraft(editing.draft, (draft) => setEditing({ ...editing, draft }), submitEdit, () => setEditing(null)) : null}
      {adding ? renderDraft(adding, setAdding, submitAdd, () => setAdding(null)) : null}
      {!adding && !editing ? (
        <button className="ui button small" type="button" onClick={() => setAdding({ ...EMPTY_IP_DRAFT })}>
          <Plus size={12} />
        </button>
      ) : null}
    </div>
  )
}

export function CacheDiskDirsEditor({ value, onChange }: { value: CacheDir[]; onChange: (value: CacheDir[]) => void }) {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)

  function confirm() {
    let path = draft.trim()
    if (!path) {
      return
    }
    if (!path.startsWith('/')) {
      path = `/${path}`
    }
    onChange([...value, { path }])
    setDraft('')
    setAdding(false)
  }

  return (
    <div>
      {value.length > 0 ? (
        <div style={{ marginBottom: '0.5em' }}>
          {value.map((dir, index) => (
            <span key={`${dir.path}-${index}`} className="ui label small basic" style={{ marginBottom: '0.4em' }}>
              {dir.path} &nbsp;
              <a
                href=""
                title="删除"
                onClick={(event) => {
                  event.preventDefault()
                  onChange(value.filter((_, itemIndex) => itemIndex !== index))
                }}
              >
                <X size={11} />
              </a>
            </span>
          ))}
        </div>
      ) : null}
      {adding ? (
        <div className="ui fields inline">
          <div className="ui field">
            <TextInput
              autoFocus
              type="text"
              placeholder="新的缓存目录，比如 /mnt/cache"
              style={{ width: '30em' }}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
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
            &nbsp;
            <a
              href=""
              onClick={(event) => {
                event.preventDefault()
                setDraft('')
                setAdding(false)
              }}
            >
              取消
            </a>
          </div>
        </div>
      ) : (
        <button className="ui button tiny" type="button" onClick={() => setAdding(true)}>
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

export function ApiNodeAddressesEditor({ value, onChange }: { value: NetworkAddressConfig[]; onChange: (value: NetworkAddressConfig[]) => void }) {
  const [draft, setDraft] = useState<NetworkAddressConfig>({ protocol: 'http', host: '', portRange: '80' })
  const [adding, setAdding] = useState(false)

  function confirm() {
    if (!draft.host.trim() || !draft.portRange.trim()) {
      return
    }
    onChange([...value, { protocol: draft.protocol, host: draft.host.trim(), portRange: draft.portRange.trim() }])
    setDraft({ protocol: 'http', host: '', portRange: '80' })
    setAdding(false)
  }

  return (
    <div>
      {value.length > 0 ? (
        <div style={{ marginBottom: '0.5em' }}>
          {value.map((address, index) => (
            <span key={`${address.host}-${address.portRange}-${index}`} className="ui label small basic" style={{ marginBottom: '0.4em' }}>
              {address.protocol}://{address.host}:{address.portRange} &nbsp;
              <a
                href=""
                title="删除"
                onClick={(event) => {
                  event.preventDefault()
                  onChange(value.filter((_, itemIndex) => itemIndex !== index))
                }}
              >
                <X size={11} />
              </a>
            </span>
          ))}
          <div className="ui divider" />
        </div>
      ) : null}
      {adding ? (
        <div className="ui segment">
          <div className="ui fields inline">
            <div className="ui field">
              <Select value={draft.protocol} onChange={(event) => setDraft({ ...draft, protocol: event.target.value })}>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="tcp">TCP</option>
                <option value="tcp4">TCP4</option>
                <option value="tcp6">TCP6</option>
                <option value="udp">UDP</option>
                <option value="unix">Unix</option>
              </Select>
            </div>
            <div className="ui field">
              <TextInput type="text" placeholder="主机地址" value={draft.host} onChange={(event) => setDraft({ ...draft, host: event.target.value })} />
            </div>
            <div className="ui field">
              <TextInput
                type="text"
                placeholder="端口或端口范围"
                style={{ width: '10em' }}
                value={draft.portRange}
                onChange={(event) => setDraft({ ...draft, portRange: event.target.value })}
              />
            </div>
          </div>
          <button className="ui button small" type="button" onClick={confirm}>
            确定
          </button>
          &nbsp;
          <a
            href=""
            onClick={(event) => {
              event.preventDefault()
              setAdding(false)
            }}
          >
            取消
          </a>
        </div>
      ) : (
        <button className="ui button small" type="button" onClick={() => setAdding(true)}>
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}
