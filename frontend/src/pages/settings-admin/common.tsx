import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, X } from 'lucide-react'
import { apiGet } from '../../api/client'
import { useSession } from '../../api/session'
import { PageHeader } from '../../components/PageHeader'

/* ---------- tabs ---------- */

interface TabItem {
  name: string
  url: string
  code: string
}

const BASIC_TABS: TabItem[] = [
  { name: '管理平台设置', url: '/settings/server', code: 'server' },
  { name: '管理界面', url: '/settings/ui', code: 'ui' },
  { name: '安全设置', url: '/settings/security', code: 'security' },
  { name: '版本更新', url: '/settings/updates', code: 'updates' },
  { name: '个人信息', url: '/settings/profile', code: 'profile' },
  { name: '登录设置', url: '/settings/login', code: 'login' },
]

const ADVANCED_TABS: TabItem[] = [
  { name: '数据库', url: '/settings/database', code: 'database' },
  { name: 'API节点', url: '/settings/api', code: 'apiNodes' },
  { name: '访问日志数据库', url: '/db', code: 'dbNodes' },
  { name: '迁移', url: '/settings/transfer', code: 'transfer' },
]

export function SettingsTabs({ kind, active }: { kind: 'basic' | 'advanced'; active: string }) {
  const session = useSession()
  const canSetting = session.data?.teaModules.some((module) => module.code === 'settings') ?? false
  const tabs = (kind === 'basic' ? BASIC_TABS : ADVANCED_TABS).filter((tab) => canSetting || tab.code === 'profile' || tab.code === 'login')
  if (tabs.length <= 1) {
    return null
  }
  return (
    <div className="ui top menu tabular tab-menu small">
      {tabs.map((tab) => (
        <Link key={tab.code} className={`item${tab.code === active ? ' active' : ''}`} to={tab.url}>
          <var>{tab.name}</var>
          {tab.code === active ? <div className="bottom-indicator" /> : null}
        </Link>
      ))}
    </div>
  )
}

/* ---------- modal ---------- */

export function Modal({
  title,
  children,
  onClose,
  width,
}: {
  title: ReactNode
  children: ReactNode
  onClose: () => void
  width?: string
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }} onClick={onClose}>
      <div
        className="ui modal transition visible active"
        style={{ display: 'block', position: 'relative', margin: 'auto', width }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="header">{title}</div>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}

/* ---------- values box ---------- */

export function StringListEditor({
  values,
  onChange,
  placeholder,
  size,
  maxLength,
  emptyText,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  size?: number
  maxLength?: number
  emptyText?: string
}) {
  const [editingIndex, setEditingIndex] = useState(-1)
  const [draft, setDraft] = useState('')

  function startAdd() {
    setEditingIndex(values.length)
    setDraft('')
  }

  function startEdit(index: number) {
    setEditingIndex(index)
    setDraft(values[index] ?? '')
  }

  function confirm() {
    const value = draft.trim()
    if (editingIndex >= values.length) {
      if (value.length > 0) {
        onChange([...values, value])
      }
    } else if (value.length > 0) {
      const next = [...values]
      next[editingIndex] = value
      onChange(next)
    } else {
      onChange(values.filter((_, index) => index !== editingIndex))
    }
    setEditingIndex(-1)
    setDraft('')
  }

  function remove(index: number) {
    onChange(values.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div>
      {values.length > 0 ? (
        <div style={{ marginBottom: '0.5em' }}>
          {values.map((value, index) => (
            <span key={`${value}-${index}`} className="ui label tiny basic" style={{ marginTop: '0.4em', marginBottom: '0.4em' }}>
              {value.length > 0 ? value : <span className="disabled">[空]</span>}
              &nbsp;
              <a href="" title="修改" onClick={(event) => { event.preventDefault(); startEdit(index) }}>
                <Pencil size={11} />
              </a>
              <a href="" title="删除" onClick={(event) => { event.preventDefault(); remove(index) }}>
                <X size={11} />
              </a>
            </span>
          ))}
        </div>
      ) : (
        <span className="disabled">{emptyText ?? '暂时还没有内容.'}</span>
      )}
      {editingIndex >= 0 ? (
        <div className="ui fields inline">
          <div className="ui field">
            <input
              type="text"
              value={draft}
              size={size}
              maxLength={maxLength}
              placeholder={placeholder}
              autoFocus
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
          </div>
          <div className="ui field">
            <a href="" title="取消" onClick={(event) => { event.preventDefault(); setEditingIndex(-1) }}>
              <X size={12} />
            </a>
          </div>
        </div>
      ) : (
        <button className="ui button tiny" type="button" onClick={startAdd}>
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

/* ---------- network addresses ---------- */

export interface NetworkAddress {
  protocol: string
  host: string
  portRange: string
}

export function formatAddress(address: NetworkAddress): string {
  const host = address.host.length > 0 ? (address.host.includes(':') && !address.host.startsWith('[') ? `[${address.host}]` : address.host) : '*'
  return `${address.protocol}://${host}:${address.portRange}`
}

export function AddressListEditor({
  addresses,
  onChange,
  protocols,
}: {
  addresses: NetworkAddress[]
  onChange: (addresses: NetworkAddress[]) => void
  protocols?: string[]
}) {
  const protocolOptions = protocols ?? ['http', 'https']
  const [editingIndex, setEditingIndex] = useState(-1)
  const [protocol, setProtocol] = useState(protocolOptions[0])
  const [host, setHost] = useState('')
  const [portRange, setPortRange] = useState('')

  function startAdd() {
    setEditingIndex(addresses.length)
    setProtocol(protocolOptions[0])
    setHost('')
    setPortRange('')
  }

  function startEdit(index: number) {
    const address = addresses[index]
    setEditingIndex(index)
    setProtocol(address.protocol)
    setHost(address.host)
    setPortRange(address.portRange)
  }

  function confirm() {
    const next = { protocol, host: host.trim(), portRange: portRange.trim() }
    if (next.portRange.length === 0) {
      return
    }
    if (editingIndex >= addresses.length) {
      onChange([...addresses, next])
    } else {
      onChange(addresses.map((address, index) => (index === editingIndex ? next : address)))
    }
    setEditingIndex(-1)
  }

  function remove(index: number) {
    onChange(addresses.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div>
      {addresses.length > 0 ? (
        <div style={{ marginBottom: '0.5em' }}>
          {addresses.map((address, index) => (
            <span key={`${formatAddress(address)}-${index}`} className="ui label small basic" style={{ marginTop: '0.4em', marginBottom: '0.4em' }}>
              {formatAddress(address)}
              &nbsp;
              <a href="" title="修改" onClick={(event) => { event.preventDefault(); startEdit(index) }}>
                <Pencil size={11} />
              </a>
              <a href="" title="删除" onClick={(event) => { event.preventDefault(); remove(index) }}>
                <X size={11} />
              </a>
            </span>
          ))}
          <div className="ui divider" />
        </div>
      ) : null}
      {editingIndex >= 0 ? (
        <div className="ui fields inline">
          <div className="ui field">
            <select className="ui dropdown" value={protocol} onChange={(event) => setProtocol(event.target.value)}>
              {protocolOptions.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="ui field">
            <input type="text" placeholder="主机地址,0.0.0.0表示全部" value={host} maxLength={100} onChange={(event) => setHost(event.target.value)} />
          </div>
          <div className="ui field">
            <input type="text" placeholder="端口" value={portRange} style={{ width: '6em' }} maxLength={20} onChange={(event) => setPortRange(event.target.value)} />
          </div>
          <div className="ui field">
            <button className="ui button small" type="button" onClick={confirm}>
              确定
            </button>
          </div>
          <div className="ui field">
            <a href="" title="取消" onClick={(event) => { event.preventDefault(); setEditingIndex(-1) }}>
              <X size={12} />
            </a>
          </div>
        </div>
      ) : (
        <button className="ui button tiny" type="button" onClick={startAdd}>
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

/* ---------- certificates ---------- */

export interface SSLCertSummary {
  id: number
  name: string
  dnsNames?: string[]
  timeEndAt?: number
}

interface CertsData {
  certs: SSLCertSummary[]
}

export function formatUnixDay(timestamp?: number): string {
  if (!timestamp) {
    return '-'
  }
  const date = new Date(timestamp * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function CertSelector({ certs, onChange }: { certs: SSLCertSummary[]; onChange: (certs: SSLCertSummary[]) => void }) {
  const [selecting, setSelecting] = useState(false)

  return (
    <div>
      {certs.length > 0 ? (
        <div style={{ marginBottom: '0.5em' }}>
          {certs.map((cert, index) => (
            <span key={`${cert.id}-${index}`} className="ui label small basic" style={{ marginTop: '0.4em', marginBottom: '0.4em' }}>
              {cert.name}
              {cert.dnsNames && cert.dnsNames.length > 0 ? ` / ${cert.dnsNames.join(',')}` : ''} / 有效至{formatUnixDay(cert.timeEndAt)} &nbsp;
              <a href="" title="删除" onClick={(event) => { event.preventDefault(); onChange(certs.filter((_, itemIndex) => itemIndex !== index)) }}>
                <X size={11} />
              </a>
            </span>
          ))}
          <div className="ui divider" />
        </div>
      ) : (
        <span className="red">选择或上传证书后HTTPS服务才能生效.</span>
      )}
      <button className="ui button tiny" type="button" onClick={() => setSelecting(true)}>
        选择已有证书
      </button>
      {selecting ? (
        <CertSelectModal
          selectedIds={certs.map((cert) => cert.id)}
          onClose={() => setSelecting(false)}
          onConfirm={(selected) => {
            onChange(selected)
            setSelecting(false)
          }}
        />
      ) : null}
    </div>
  )
}

function CertSelectModal({
  selectedIds,
  onClose,
  onConfirm,
}: {
  selectedIds: number[]
  onClose: () => void
  onConfirm: (certs: SSLCertSummary[]) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [checkedIds, setCheckedIds] = useState<number[]>(selectedIds)
  const query = useQuery({
    queryKey: ['settings-admin-certs', appliedKeyword],
    queryFn: () => apiGet<CertsData>('/servers/certs', { keyword: appliedKeyword }),
  })
  const certs = query.data?.certs ?? []

  function toggle(id: number) {
    setCheckedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <Modal title="选择证书" onClose={onClose} width="50em">
      <form
        className="ui form"
        onSubmit={(event) => {
          event.preventDefault()
          setAppliedKeyword(keyword)
        }}
      >
        <div className="ui fields inline">
          <div className="ui field">
            <input type="text" placeholder="关键词" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
          <div className="ui field">
            <button className="ui button" type="submit">
              搜索
            </button>
          </div>
        </div>
      </form>
      {query.isLoading ? <p className="comment">正在加载中...</p> : null}
      {!query.isLoading && certs.length === 0 ? <p className="comment">暂时还没有证书.</p> : null}
      {certs.length > 0 ? (
        <table className="ui table selectable">
          <tbody>
            {certs.map((cert) => (
              <tr key={cert.id}>
                <td>
                  <div className="ui checkbox">
                    <input type="checkbox" checked={checkedIds.includes(cert.id)} onChange={() => toggle(cert.id)} />
                    <label>
                      {cert.name}
                      {cert.dnsNames && cert.dnsNames.length > 0 ? ` / ${cert.dnsNames.join(',')}` : ''} / 有效至{formatUnixDay(cert.timeEndAt)}
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <div style={{ marginTop: '1em' }}>
        <button className="ui button" type="button" onClick={onClose}>
          取消
        </button>
        <button className="ui button primary" type="button" onClick={() => onConfirm(certs.filter((cert) => checkedIds.includes(cert.id)))}>
          确定
        </button>
      </div>
    </Modal>
  )
}

/* ---------- misc ---------- */

export function SortArrow({ direction, onClick }: { direction?: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <a href="" style={{ marginLeft: '0.3em' }} onClick={(event) => { event.preventDefault(); onClick() }}>
      {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}
    </a>
  )
}

export { PageHeader }
