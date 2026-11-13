import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiPost, apiPostForm, getCsrfToken } from '../../api/client'
import { PageHeader } from '../../components/PageHeader'

export interface GroupBasic {
  id: number
  name: string
}

export interface AdminUser {
  id: number
  username?: string
  fullname?: string
}

export interface LeftMenuItem {
  name: string
  url: string
  isActive?: boolean
  isOn?: boolean
  isOff?: boolean
  isImportant?: boolean
}

export interface PriorConfig {
  isPrior: boolean
  isOn: boolean
}

export interface CapacityValue {
  count: number
  unit: string
}

export interface UrlPattern {
  pattern: string
}

export interface UserOption {
  id: number
  name: string
  username: string
  fullname: string
}

export type FormValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | File
  | File[]
  | readonly string[]
  | readonly number[]

export function buildForm(params: Record<string, FormValue>): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue
    }
    if (typeof value === 'boolean') {
      form.append(key, value ? '1' : '0')
    } else if (value instanceof File) {
      form.append(key, value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        form.append(key, typeof item === 'number' ? String(item) : String(item))
      }
    } else {
      form.append(key, String(value))
    }
  }
  return form
}

export async function postForm<T>(url: string, params: Record<string, FormValue>): Promise<T> {
  return apiPostForm<T>(url, buildForm(params))
}

export async function postFormWithCsrf<T>(url: string, params: Record<string, FormValue>): Promise<T> {
  const csrfToken = await getCsrfToken()
  return apiPostForm<T>(url, buildForm({ ...params, csrfToken }))
}

export function Modal({
  title,
  children,
  onClose,
  width = '50em',
}: {
  title: ReactNode
  children: ReactNode
  onClose: () => void
  width?: string
}) {
  return (
    <div className="ui dimmer modals page transition visible active" style={{ display: 'flex' }}>
      <div
        className="ui modal transition visible active"
        style={{ display: 'block', position: 'relative', margin: 'auto', maxWidth: width, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="header">
          {title}
          <button className="ui button tiny basic" style={{ float: 'right' }} type="button" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}

export function Keyword({ word, text }: { word?: string; text?: string | null }) {
  const value = text == null ? '' : text
  const parts = useMemo(() => {
    if (!word) {
      return [value]
    }
    const lower = value.toLowerCase()
    const target = word.toLowerCase()
    const result: string[] = []
    let index = 0
    while (index < value.length) {
      const found = lower.indexOf(target, index)
      if (found < 0) {
        result.push(value.slice(index))
        break
      }
      if (found > index) {
        result.push(value.slice(index, found))
      }
      result.push(value.slice(found, found + word.length))
      index = found + word.length
    }
    if (result.length === 0) {
      result.push(value)
    }
    return result
  }, [value, word])
  return (
    <>
      {parts.map((part, index) =>
        word && part.toLowerCase() === word.toLowerCase() ? <span key={index} className="red">{part}</span> : <span key={index}>{part}</span>,
      )}
    </>
  )
}

export function GroupFirstMenu({
  group,
  active,
}: {
  group: GroupBasic
  active?: 'index' | 'settings' | 'update'
}) {
  return (
    <PageHeader
      items={[
        { name: '分组列表', href: '#/servers/groups' },
        { name: `"${group.name}"详情`, href: `#/servers/groups/group?groupId=${group.id}`, active: active === 'index' },
        { name: '全局设置', href: `#/servers/groups/group/settings?groupId=${group.id}`, active: active === 'settings' },
        { name: '修改', href: `#/servers/groups/group/update?groupId=${group.id}`, active: active === 'update' },
      ]}
    />
  )
}

export function GroupSecondMenu({
  group,
  base,
  current,
}: {
  group: GroupBasic
  base: string
  current: 'index' | 'scheduling' | 'setting'
}) {
  const items = [
    { key: 'index' as const, name: '源站列表', href: `#${base}?groupId=${group.id}` },
    { key: 'scheduling' as const, name: '调度算法', href: `#${base}/scheduling?groupId=${group.id}` },
    { key: 'setting' as const, name: '更多设置', href: `#${base}/setting?groupId=${group.id}` },
  ]
  return (
    <div className="ui menu text blue">
      {items.map((item) => (
        <a key={item.key} className={`item${current === item.key ? ' active' : ''}`} href={item.href}>
          {item.name}
        </a>
      ))}
    </div>
  )
}

export function SettingsLeftMenu({ items }: { items?: LeftMenuItem[] }) {
  if (!items || items.length === 0) {
    return null
  }
  return (
    <div className="left-box without-menu">
      <div className="ui menu text blue vertical small">
        {items.map((item, index) =>
          item.name === '-' ? (
            <a key={index} className="item separator" />
          ) : (
            <a
              key={index}
              className={`item${item.isActive ? ' active' : ''}${item.isOn ? ' on' : ''}${item.isOff || item.isImportant ? ' off' : ''}`}
              href={`#${item.url}`}
            >
              <span>
                <span style={{ visibility: item.isActive ? 'visible' : 'hidden' }}>▶ </span>
                {item.name}
                {item.isOff ? <var>关</var> : null}
                {item.isImportant ? <var>开</var> : null}
              </span>
            </a>
          ),
        )}
      </div>
    </div>
  )
}

export function PriorRow<T extends PriorConfig>({
  config,
  onChange,
  description,
}: {
  config: T
  onChange: (next: T) => void
  description?: string
}) {
  return (
    <tbody>
      <tr className={config.isPrior ? 'active' : undefined}>
        <td className="title">打开独立配置</td>
        <td>
          <div className="ui toggle checkbox">
            <input type="checkbox" checked={config.isPrior} onChange={(event) => onChange({ ...config, isPrior: event.target.checked })} />
            <label />
          </div>
          <p className="comment">
            {config.isPrior ? <strong>[已打开]</strong> : null} {description || '打开后可以覆盖父级或子级配置'}。
          </p>
        </td>
      </tr>
    </tbody>
  )
}

export function MoreOptionsRow({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <tbody>
      <tr>
        <td colSpan={2}>
          <a
            href=""
            onClick={(event) => {
              event.preventDefault()
              onClick()
            }}
          >
            {label || '更多选项'}
          </a>
        </td>
      </tr>
    </tbody>
  )
}

export function StringListInput({
  values,
  onChange,
  placeholder,
}: {
  values?: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={(values || []).join(',')}
      placeholder={placeholder}
      onChange={(event) =>
        onChange(
          event.target.value
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        )
      }
    />
  )
}

export function NumberListInput({
  values,
  onChange,
  placeholder,
}: {
  values?: number[]
  onChange: (values: number[]) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={(values || []).join(',')}
      placeholder={placeholder}
      onChange={(event) =>
        onChange(
          event.target.value
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => !Number.isNaN(value) && value > 0),
        )
      }
    />
  )
}

export function CapacityInput({
  value,
  onChange,
  units = ['byte', 'kb', 'mb', 'gb'],
  defaultUnit = 'kb',
}: {
  value?: CapacityValue
  onChange: (value: CapacityValue) => void
  units?: string[]
  defaultUnit?: string
}) {
  const current: CapacityValue = value || { count: 0, unit: defaultUnit }
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <input
          type="text"
          style={{ width: '7em' }}
          value={String(current.count)}
          onChange={(event) => {
            const count = Number(event.target.value)
            onChange({ ...current, count: Number.isNaN(count) ? 0 : count })
          }}
        />
      </div>
      <div className="ui field">
        <select className="ui dropdown" value={current.unit} onChange={(event) => onChange({ ...current, unit: event.target.value })}>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function UrlPatternsInput({
  patterns,
  onChange,
  placeholder,
}: {
  patterns?: UrlPattern[]
  onChange: (patterns: UrlPattern[]) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      placeholder={placeholder || '比如 /api/*'}
      value={(patterns || []).map((pattern) => pattern.pattern).join(',')}
      onChange={(event) =>
        onChange(
          event.target.value
            .split(',')
            .map((pattern) => pattern.trim())
            .filter((pattern) => pattern.length > 0)
            .map((pattern) => ({ pattern })),
        )
      }
    />
  )
}

export function JsonTextarea({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: unknown
  onChange: (value: unknown) => void
  hint?: string
}) {
  return (
    <tr>
      <td>{label}</td>
      <td>
        <textarea
          rows={4}
          defaultValue={value == null ? '' : JSON.stringify(value, null, 2)}
          style={{ fontFamily: 'Menlo, Monaco, Courier New, monospace', fontSize: '0.8em' }}
          onChange={(event) => {
            try {
              const parsed: unknown = event.target.value.trim().length === 0 ? null : JSON.parse(event.target.value)
              onChange(parsed)
            } catch {
              // keep the previous value until the JSON is valid again
            }
          }}
        />
        <p className="comment">{hint || '使用JSON格式填写高级配置。'}</p>
      </td>
    </tr>
  )
}

export function SubmitRow({ submitting, children = '保存' }: { submitting?: boolean; children?: ReactNode }) {
  return (
    <div style={{ marginTop: '1em' }}>
      <button className={`ui button primary${submitting ? ' loading disabled' : ''}`} type="submit" disabled={submitting}>
        {children}
      </button>
    </div>
  )
}

export function useQueryValue(searchParams: URLSearchParams, key: string): string {
  return searchParams.get(key) || ''
}

export function useQueryNumber(searchParams: URLSearchParams, key: string): number {
  return Number(searchParams.get(key) || 0) || 0
}

export function UserSelector({
  userId,
  onChange,
  emptyLabel = '[选择用户]',
}: {
  userId: number
  onChange: (userId: number) => void
  emptyLabel?: string
}) {
  const optionsQuery = useQuery({
    queryKey: ['server-user-options'],
    queryFn: () => apiPost<{ users: UserOption[] }>('/servers/users/options', { keyword: '' }),
  })
  const users = optionsQuery.data?.users || []
  return (
    <select className="ui dropdown" value={String(userId)} onChange={(event) => onChange(Number(event.target.value) || 0)}>
      <option value="0">{emptyLabel}</option>
      {users.map((user) => (
        <option key={user.id} value={String(user.id)}>
          {user.name}
        </option>
      ))}
    </select>
  )
}

export function AdminUserCell({ user }: { user?: AdminUser | null }) {
  if (!user || !user.id) {
    return <span className="disabled">管理员</span>
  }
  return (
    <span>
      {user.fullname || user.username}
      {user.username && user.fullname ? <span className="grey small">（{user.username}）</span> : null}
    </span>
  )
}
