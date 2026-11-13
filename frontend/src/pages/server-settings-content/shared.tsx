import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp, Play, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'

export interface LeftMenuItem {
  name: string
  url: string
  isActive?: boolean
  isOn?: boolean
  isOff?: boolean
  isImportant?: boolean
  configCode?: string
}

export interface ServerBasic {
  id: number
  name: string
  clusterId: number
}

export interface ServerSettingsBase {
  serverId: number
  server: ServerBasic
  leftMenuItems: LeftMenuItem[]
  leftMenuActiveItem?: LeftMenuItem | null
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
  minPort?: number
  maxPort?: number
}

export interface RequestCond {
  type?: string
  isRequest?: boolean
  param?: string
  operator?: string
  value?: string
  isReverse?: boolean
  isCaseInsensitive?: boolean
}

export interface RequestCondGroup {
  isOn?: boolean
  connector?: string
  conds?: RequestCond[]
  isReverse?: boolean
  description?: string
}

export interface RequestCondsConfig {
  isOn?: boolean
  connector?: string
  groups?: RequestCondGroup[]
}

export interface CondComponentDef {
  type: string
  name: string
  paramsTitle: string
  caseInsensitive?: boolean
  description?: string
}

// 条件类型定义，与 web/public/js/conds/official.json 保持一致
export const COND_COMPONENTS: CondComponentDef[] = [
  { type: 'url-extension', name: '文件扩展名', paramsTitle: '扩展名列表' },
  { type: 'url-eq-index', name: '首页', paramsTitle: 'URL完整路径' },
  { type: 'url-all', name: '全站', paramsTitle: 'URL完整路径' },
  { type: 'url-prefix', name: 'URL目录前缀', paramsTitle: 'URL目录前缀', caseInsensitive: true },
  { type: 'url-eq', name: 'URL完整路径', paramsTitle: 'URL完整路径', caseInsensitive: true },
  { type: 'url-regexp', name: 'URL正则匹配', paramsTitle: '正则表达式', caseInsensitive: true },
  { type: 'url-wildcard-match', name: 'URL通配符', paramsTitle: '通配符', caseInsensitive: true },
  { type: 'user-agent-regexp', name: 'User-Agent正则匹配', paramsTitle: '正则表达式', caseInsensitive: true },
  { type: 'params', name: '参数匹配', paramsTitle: '参数配置' },
  { type: 'url-not-extension', name: '排除：URL扩展名', paramsTitle: '扩展名列表' },
  { type: 'url-not-prefix', name: '排除：URL前缀', paramsTitle: 'URL前缀', caseInsensitive: true },
  { type: 'url-not-eq', name: '排除：URL完整路径', paramsTitle: 'URL完整路径', caseInsensitive: true },
  { type: 'url-not-regexp', name: '排除：URL正则匹配', paramsTitle: '正则表达式', caseInsensitive: true },
  { type: 'user-agent-not-regexp', name: '排除：User-Agent正则匹配', paramsTitle: '正则表达式', caseInsensitive: true },
  { type: 'mime-type', name: '内容MimeType', paramsTitle: 'MimeType列表' },
]

export const COND_OPERATORS = [
  { code: 'eq', name: '等于' },
  { code: 'not', name: '不等于' },
  { code: 'prefix', name: '前缀' },
  { code: 'suffix', name: '后缀' },
  { code: 'contains', name: '包含' },
  { code: 'not contains', name: '不包含' },
  { code: 'regexp', name: '正则匹配' },
  { code: 'not regexp', name: '正则不匹配' },
  { code: 'wildcard match', name: '通配符匹配' },
  { code: 'wildcard not match', name: '通配符不匹配' },
  { code: 'eq int', name: '整数等于' },
  { code: 'eq float', name: '浮点数等于' },
  { code: 'gt', name: '大于' },
  { code: 'gte', name: '大于等于' },
  { code: 'lt', name: '小于' },
  { code: 'lte', name: '小于等于' },
  { code: 'ip range', name: 'IP范围' },
  { code: 'eq ip', name: 'IP等于' },
  { code: 'in', name: '在列表中' },
  { code: 'not in', name: '不在列表中' },
]

export function useServerId(): number {
  const [searchParams] = useSearchParams()
  return Number(searchParams.get('serverId') || 0) || 0
}

export function condTypeName(cond: RequestCond): string {
  const component = COND_COMPONENTS.find((item) => item.type === cond.type)
  if (component) {
    return component.name
  }
  return `${cond.param || ''} ${cond.operator || ''}`.trim()
}

export function GroupConfigWarning({ href, text }: { href?: string; text?: string }) {
  return (
    <div className="ui message warning">
      {text || '由于已经在当前'}
      {href ? <a href={`${href}`}>网站分组</a> : '网站分组'}
      {text ? '' : '中进行了对应的配置，在这里的配置将不会生效。'}
    </div>
  )
}

export function ServerSettingsShell({
  data,
  children,
  header,
}: {
  data: ServerSettingsBase
  children: ReactNode
  header?: ReactNode
}) {
  const server = data.server
  const active = data.leftMenuActiveItem
  const items: LeftMenuItem[] = data.leftMenuItems || []

  return (
    <div>
      <PageHeader
        items={[
          { name: '网站列表', href: '/servers' },
          { name: `"${server.name}"设置`, href: `/servers/server/settings?serverId=${server.id}`, active: !active },
          { name: active ? `"${active.name}"设置` : '', href: active ? `${active.url}` : undefined, active: !!active, hidden: !active },
        ]}
      />

      <div className="margin" />

      <div className="left-box with-menu">
        <div className="ui menu text blue vertical small">
          {items.map((item, index) =>
            item.name === '-' ? (
              <div key={`separator-${index}`} className="item separator" />
            ) : (
              <a
                key={`${item.url}-${index}`}
                className={`item${item.isActive ? ' active' : ''}${item.isOn ? ' on' : ''}${item.isOff || item.isImportant ? ' off' : ''}`}
                href={`${item.url}`}
              >
                <Play size={10} style={{ visibility: item.isActive ? 'visible' : 'hidden' }} />
                {item.name}
                {item.isOff ? <var>关</var> : null}
                {item.isImportant ? <var>开</var> : null}
              </a>
            ),
          )}
        </div>
      </div>

      <div className="right-box with-menu">
        {header}
        {children}
      </div>
    </div>
  )
}

export function Modal({ title, children, onClose, width }: { title: ReactNode; children: ReactNode; onClose: () => void; width?: string }) {
  return (
    <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
      <div
        className="ui modal transition visible active"
        style={{ display: 'block', position: 'relative', margin: 'auto', width: width || '45em', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="header">
          {title}
          <a href="" style={{ float: 'right' }} title="关闭" onClick={(event) => { event.preventDefault(); onClose() }}>
            <X size={16} />
          </a>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}

export function MoreOptionsIndicator({ visible, onChange, text }: { visible: boolean; onChange: (visible: boolean) => void; text?: string }) {
  return (
    <a
      href=""
      onClick={(event) => {
        event.preventDefault()
        onChange(!visible)
      }}
    >
      {text || (visible ? '收起选项' : '更多选项')}
      {visible ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
    </a>
  )
}

export function StringListEditor({
  values,
  onChange,
  placeholder,
  width,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  width?: string
}) {
  return (
    <div>
      {values.map((value, index) => (
        <div key={index} className="ui fields inline" style={{ marginBottom: '0.4em' }}>
          <div className="ui field">
            <input
              type="text"
              value={value}
              placeholder={placeholder}
              style={width ? { width } : undefined}
              onChange={(event) => {
                const next = [...values]
                next[index] = event.target.value
                onChange(next)
              }}
            />
          </div>
          <div className="ui field" style={{ padding: 0 }}>
            <a
              href=""
              title="删除"
              onClick={(event) => {
                event.preventDefault()
                onChange(values.filter((_, i) => i !== index))
              }}
            >
              <Trash2 size={13} />
            </a>
          </div>
        </div>
      ))}
      <button className="ui button tiny" type="button" onClick={() => onChange([...values, ''])}>
        +
      </button>
    </div>
  )
}

export function SizeCapacityEditor({
  value,
  onChange,
  unit,
  units,
}: {
  value: SizeCapacity | null | undefined
  onChange: (value: SizeCapacity) => void
  unit?: string
  units?: string[]
}) {
  const realValue = value || { count: 0, unit: unit || 'kb' }
  const unitOptions = units || ['byte', 'kb', 'mb', 'gb']
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <input
          type="text"
          value={String(realValue.count)}
          style={{ width: '6em' }}
          onChange={(event) => onChange({ ...realValue, count: Number(event.target.value) || 0 })}
        />
      </div>
      <div className="ui field">
        <select className="ui dropdown" value={realValue.unit} onChange={(event) => onChange({ ...realValue, unit: event.target.value })}>
          {unitOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function TimeDurationEditor({ value, onChange }: { value: TimeDuration | null | undefined; onChange: (value: TimeDuration) => void }) {
  const realValue = value || { count: 0, unit: 'hour' }
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <input
          type="text"
          value={String(realValue.count)}
          style={{ width: '6em' }}
          onChange={(event) => onChange({ ...realValue, count: Number(event.target.value) || 0 })}
        />
      </div>
      <div className="ui field">
        <select className="ui dropdown" value={realValue.unit} onChange={(event) => onChange({ ...realValue, unit: event.target.value })}>
          <option value="ms">毫秒</option>
          <option value="second">秒</option>
          <option value="minute">分钟</option>
          <option value="hour">小时</option>
          <option value="day">天</option>
          <option value="week">周</option>
        </select>
      </div>
    </div>
  )
}

export function NetworkAddressesEditor({
  addresses,
  onChange,
  protocol,
  supportRange,
}: {
  addresses: NetworkAddress[]
  onChange: (addresses: NetworkAddress[]) => void
  protocol: string
  supportRange?: boolean
}) {
  return (
    <div>
      {addresses.length > 0 ? (
        <div style={{ marginBottom: '0.6em' }}>
          {addresses.map((address, index) => (
            <div key={index} className="ui fields inline" style={{ marginBottom: '0.4em' }}>
              <div className="ui field">
                <input
                  type="text"
                  value={address.host}
                  placeholder="主机地址，比如 0.0.0.0"
                  style={{ width: '12em' }}
                  onChange={(event) => {
                    const next = [...addresses]
                    next[index] = { ...address, host: event.target.value }
                    onChange(next)
                  }}
                />
              </div>
              <div className="ui field">
                <input
                  type="text"
                  value={address.portRange}
                  placeholder={supportRange ? '端口或范围，比如 8080-8090' : '端口，比如 80'}
                  style={{ width: '12em' }}
                  onChange={(event) => {
                    const next = [...addresses]
                    next[index] = { ...address, portRange: event.target.value }
                    onChange(next)
                  }}
                />
              </div>
              <div className="ui field" style={{ padding: 0 }}>
                <a
                  href=""
                  title="删除"
                  onClick={(event) => {
                    event.preventDefault()
                    onChange(addresses.filter((_, i) => i !== index))
                  }}
                >
                  <Trash2 size={13} />
                </a>
              </div>
            </div>
          ))}
          <div className="ui divider" />
        </div>
      ) : null}
      <button
        className="ui button tiny"
        type="button"
        onClick={() => onChange([...addresses, { protocol, host: '', portRange: '' }])}
      >
        + 添加端口绑定
      </button>
    </div>
  )
}

export function CondsEditor({ conds, onChange }: { conds: RequestCondsConfig | null; onChange: (conds: RequestCondsConfig) => void }) {
  const [type, setType] = useState('url-extension')
  const realConds: RequestCondsConfig = conds || { isOn: true, connector: 'or', groups: [] }
  const groups = realConds.groups || []

  function updateGroup(index: number, group: RequestCondGroup) {
    const next = [...groups]
    next[index] = group
    onChange({ ...realConds, groups: next })
  }

  return (
    <div>
      {groups.length > 0 ? (
        <table className="ui table">
          <tbody>
            {groups.map((group, groupIndex) => (
              <tr key={groupIndex}>
                <td className="title" style={{ width: '6em' }}>
                  分组{groupIndex + 1}
                </td>
                <td style={{ background: 'white', wordBreak: 'break-all' }}>
                  {(group.conds || []).length === 0 ? <span className="disabled">没有子条件</span> : null}
                  {(group.conds || []).map((cond, condIndex) => (
                    <span key={condIndex} className="ui label small" style={{ marginBottom: '0.3em' }}>
                      {cond.type && cond.type !== 'params' ? `${condTypeName(cond)}: ` : `${cond.param || ''} ${cond.operator || ''} `}
                      {cond.value}
                      <a
                        href=""
                        title="删除"
                        style={{ marginLeft: '0.3em' }}
                        onClick={(event) => {
                          event.preventDefault()
                          updateGroup(groupIndex, { ...group, conds: (group.conds || []).filter((_, i) => i !== condIndex) })
                        }}
                      >
                        <X size={12} />
                      </a>
                    </span>
                  ))}
                  <div className="ui fields inline" style={{ marginTop: '0.4em' }}>
                    <div className="ui field">
                      <select
                        className="ui dropdown"
                        value={type}
                        onChange={(event) => setType(event.target.value)}
                      >
                        {COND_COMPONENTS.map((component) => (
                          <option key={component.type} value={component.type}>
                            {component.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ui field">
                      <input
                        type="text"
                        placeholder={COND_COMPONENTS.find((component) => component.type === type)?.paramsTitle || '值'}
                        size={18}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') {
                            return
                          }
                          event.preventDefault()
                          const input = event.currentTarget
                          if (!input.value) {
                            return
                          }
                          updateGroup(groupIndex, {
                            ...group,
                            conds: [...(group.conds || []), { type, value: input.value, isReverse: false }],
                          })
                          input.value = ''
                        }}
                      />
                    </div>
                    <div className="ui field">
                      <button
                        className="ui button tiny"
                        type="button"
                        onClick={(event) => {
                          const container = event.currentTarget.closest('.ui.fields')
                          const input = container?.querySelector('input') as HTMLInputElement | null
                          if (!input || !input.value) {
                            return
                          }
                          updateGroup(groupIndex, {
                            ...group,
                            conds: [...(group.conds || []), { type, value: input.value, isReverse: false }],
                          })
                          input.value = ''
                        }}
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </td>
                <td style={{ width: '4em' }}>
                  <a
                    href=""
                    title="删除分组"
                    onClick={(event) => {
                      event.preventDefault()
                      onChange({ ...realConds, groups: groups.filter((_, i) => i !== groupIndex) })
                    }}
                  >
                    <Trash2 size={13} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {groups.length > 1 ? (
        <div className="ui fields inline">
          <label>分组之间关系：</label>
          <select
            className="ui dropdown"
            value={realConds.connector || 'or'}
            onChange={(event) => onChange({ ...realConds, connector: event.target.value })}
          >
            <option value="and">和</option>
            <option value="or">或</option>
          </select>
        </div>
      ) : null}

      <button
        className="ui button tiny basic"
        type="button"
        onClick={() => onChange({ ...realConds, groups: [...groups, { isOn: true, connector: 'and', conds: [], isReverse: false }] })}
      >
        + 添加分组
      </button>
    </div>
  )
}
