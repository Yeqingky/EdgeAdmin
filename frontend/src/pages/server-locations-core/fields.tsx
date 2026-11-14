import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Plus, X } from 'lucide-react'
import type { SizeCapacity, URLPattern } from './types'

// 打开独立配置(对应 legacy prior-checkbox)
export function PriorRow({ isPrior, onChange, description }: {
  isPrior: boolean
  onChange: (value: boolean) => void
  description?: string
}) {
  return (
    <tbody>
      <tr className={isPrior ? 'active' : undefined}>
        <td className="title">打开独立配置</td>
        <td>
          <div className="ui toggle checkbox">
            <input type="checkbox" checked={isPrior} onChange={(event) => onChange(event.target.checked)} />
            <label className="red" />
          </div>
          <p className="comment">
            {isPrior ? <strong>[已打开] </strong> : null}
            {description || '打开后可以覆盖父级或子级配置'}.
          </p>
        </td>
      </tr>
    </tbody>
  )
}

// 更多选项(对应 legacy more-options-indicator,放在已有的单元格内)
export function MoreOptionsIndicator({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <a href="" style={{ fontWeight: 'normal' }} onClick={(event) => { event.preventDefault(); onToggle() }}>
      {visible ? '收起选项' : '更多选项'}
      {visible ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
    </a>
  )
}

// 更多选项(对应 legacy more-options-tbody)
export function MoreOptionsRow({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <tbody>
      <tr>
        <td colSpan={2}>
          <a href="" onClick={(event) => { event.preventDefault(); onToggle() }}>
            {visible ? '收起选项' : '更多选项'}
            {visible ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </a>
        </td>
      </tr>
    </tbody>
  )
}

// 字符串列表(对应 legacy values-box)
export function ValueList({ values, onChange, placeholder, normalize }: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  normalize?: (value: string) => string
}) {
  const [editingIndex, setEditingIndex] = useState(-1)
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')

  function startAdd() {
    setEditingIndex(-1)
    setInput('')
    setAdding(true)
  }

  function startEdit(index: number) {
    setEditingIndex(index)
    setInput(values[index])
    setAdding(true)
  }

  function confirm() {
    if (input.length === 0) {
      return
    }
    const value = normalize ? normalize(input) : input
    if (editingIndex >= 0) {
      const next = values.slice()
      next[editingIndex] = value
      onChange(next)
    } else {
      onChange([...values, value])
    }
    setAdding(false)
    setEditingIndex(-1)
    setInput('')
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div>
      {values.length > 0 ? (
        <div style={{ marginBottom: '0.6em' }}>
          {values.map((value, index) => (
            <span
              key={`${value}-${index}`}
              className={`ui label tiny basic${index === editingIndex ? ' blue' : ''}`}
              style={{ marginBottom: '0.4em' }}
            >
              {value.length > 0 ? value : <span className="disabled">[空]</span>}
              <a href="" title="修改" style={{ marginLeft: '0.4em' }} onClick={(event) => { event.preventDefault(); startEdit(index) }}>
                <Pencil size={11} />
              </a>
              <a href="" title="删除" style={{ marginLeft: '0.2em' }} onClick={(event) => { event.preventDefault(); remove(index) }}>
                <X size={11} />
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
              value={input}
              autoFocus
              placeholder={placeholder}
              size={24}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  confirm()
                }
                if (event.key === 'Escape') {
                  setAdding(false)
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
            <a href="" title="取消" onClick={(event) => { event.preventDefault(); setAdding(false) }}>
              <X size={13} />
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

// 域名列表(对应 legacy domains-box)
export function DomainsField({ domains, onChange, placeholder }: {
  domains: string[]
  onChange: (domains: string[]) => void
  placeholder?: string
}) {
  const [adding, setAdding] = useState(false)
  const [batch, setBatch] = useState(false)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [input, setInput] = useState('')
  const [batchText, setBatchText] = useState('')

  function confirm() {
    if (batch) {
      const values = batchText
        .split('\n')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
      if (values.length === 0) {
        return
      }
      onChange([...domains, ...values])
    } else {
      const value = input.replace(/\s/g, '')
      if (value.length === 0) {
        return
      }
      const pieces = value.split(/[,,,;]/).filter((piece) => piece.length > 0)
      if (editingIndex >= 0) {
        const next = domains.slice()
        next[editingIndex] = value
        onChange(next)
      } else {
        onChange([...domains, ...pieces])
      }
    }
    cancel()
  }

  function cancel() {
    setAdding(false)
    setBatch(false)
    setEditingIndex(-1)
    setInput('')
    setBatchText('')
  }

  return (
    <div>
      {domains.length > 0 ? (
        <div>
          {domains.map((domain, index) => (
            <span key={`${domain}-${index}`} className={`ui label small basic${index === editingIndex ? ' blue' : ''}`}>
              {domain.startsWith('~') ? <span className="grey">[正则]</span> : null}
              {domain.startsWith('.') ? <span className="grey">[后缀]</span> : null}
              {domain.startsWith('*') ? <span className="grey">[泛域名]</span> : null}
              {domain}
              &nbsp;
              <a href="" title="修改" onClick={(event) => {
                event.preventDefault()
                setEditingIndex(index)
                setInput(domain)
                setAdding(true)
              }}>
                <Pencil size={11} />
              </a>
              &nbsp;
              <a href="" title="删除" onClick={(event) => {
                event.preventDefault()
                onChange(domains.filter((_, i) => i !== index))
              }}>
                <X size={11} />
              </a>
            </span>
          ))}
          <div className="ui divider" />
        </div>
      ) : null}
      {adding ? (
        <div className="ui fields inline">
          {editingIndex < 0 ? (
            <div className="ui field">
              <select className="ui dropdown" value={batch ? 'batch' : 'single'} onChange={(event) => setBatch(event.target.value === 'batch')}>
                <option value="single">单个</option>
                <option value="batch">批量</option>
              </select>
            </div>
          ) : null}
          <div className="ui field">
            {batch ? (
              <textarea
                cols={30}
                value={batchText}
                autoFocus
                placeholder={'example1.com\nexample2.com\n每行一个域名'}
                onChange={(event) => setBatchText(event.target.value)}
              />
            ) : (
              <input
                type="text"
                value={input}
                autoFocus
                size={30}
                maxLength={100}
                placeholder={placeholder || 'example.com,*.example.com'}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    confirm()
                  }
                  if (event.key === 'Escape') {
                    cancel()
                  }
                }}
              />
            )}
          </div>
          <div className="ui field">
            <button className="ui button tiny" type="button" onClick={confirm}>
              确定
            </button>
            &nbsp;
            <a href="" title="取消" onClick={(event) => { event.preventDefault(); cancel() }}>
              <X size={13} />
            </a>
          </div>
        </div>
      ) : null}
      <div style={{ marginTop: '0.5em' }}>
        <button className="ui button tiny" type="button" onClick={() => { cancel(); setAdding(true) }}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}

const sizeUnits: { value: string; name: string }[] = [
  { value: 'byte', name: '字节' },
  { value: 'kb', name: 'KiB' },
  { value: 'mb', name: 'MiB' },
  { value: 'gb', name: 'GiB' },
  { value: 'tb', name: 'TiB' },
]

// 尺寸容量(对应 legacy size-capacity-box)
export function SizeCapacityField({ value, onChange, unit }: {
  value: SizeCapacity | null | undefined
  onChange: (value: SizeCapacity) => void
  unit: string
}) {
  const capacity = value || { count: -1, unit }
  return (
    <div className="ui fields inline">
      <div className="ui field">
        <input
          type="text"
          size={6}
          maxLength={10}
          value={capacity.count >= 0 ? String(capacity.count) : ''}
          onChange={(event) => {
            const raw = event.target.value.trim()
            onChange({ count: raw.length === 0 ? -1 : Number(raw) || 0, unit: capacity.unit || unit })
          }}
        />
      </div>
      <div className="ui field">
        <select
          className="ui dropdown"
          value={capacity.unit || unit}
          onChange={(event) => onChange({ count: capacity.count, unit: event.target.value })}
        >
          {sizeUnits.map((item) => (
            <option key={item.value} value={item.value}>{item.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

const urlPatternTypeNames: Record<string, string> = {
  wildcard: '通配符',
  regexp: '正则',
  images: '常见图片文件',
  audios: '常见音频文件',
  videos: '常见视频文件',
}

// URL 规则列表(对应 legacy url-patterns-box)
export function UrlPatternsField({ patterns, onChange }: {
  patterns: URLPattern[]
  onChange: (patterns: URLPattern[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [type, setType] = useState('wildcard')
  const [pattern, setPattern] = useState('')

  const requiresURL = type === 'wildcard' || type === 'regexp'
  const invalid = (type === 'wildcard' && pattern.includes('?'))

  function confirm() {
    if (requiresURL && pattern.trim().length === 0) {
      return
    }
    if (invalid) {
      return
    }
    if (editingIndex >= 0) {
      const next = patterns.slice()
      next[editingIndex] = { type, pattern }
      onChange(next)
    } else {
      onChange([...patterns, { type, pattern }])
    }
    cancel()
  }

  function cancel() {
    setAdding(false)
    setEditingIndex(-1)
    setType('wildcard')
    setPattern('')
  }

  return (
    <div>
      {patterns.length > 0 ? (
        <div>
          {patterns.map((item, index) => (
            <div key={index} className="ui label basic small" style={{ marginBottom: '0.8em' }}>
              <span className="grey" style={{ fontWeight: 'normal' }}>[{urlPatternTypeNames[item.type] || item.type}]</span> {item.pattern}
              &nbsp;
              <a href="" title="修改" onClick={(event) => {
                event.preventDefault()
                setEditingIndex(index)
                setType(item.type)
                setPattern(item.pattern)
                setAdding(true)
              }}>
                <Pencil size={11} />
              </a>
              <a href="" title="删除" onClick={(event) => {
                event.preventDefault()
                onChange(patterns.filter((_, i) => i !== index))
              }}>
                <X size={11} />
              </a>
            </div>
          ))}
        </div>
      ) : null}
      {adding ? (
        <div className="ui fields inline">
          <div className="ui field">
            <select className="ui dropdown auto-width" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="wildcard">通配符</option>
              <option value="regexp">正则表达式</option>
              <option value="images">常见图片</option>
              <option value="audios">常见音频</option>
              <option value="videos">常见视频</option>
            </select>
          </div>
          {requiresURL ? (
            <div className="ui field">
              <input
                type="text"
                size={36}
                value={pattern}
                autoFocus
                spellCheck={false}
                placeholder={type === 'wildcard' ? '可以使用星号(*)通配符,不区分大小写' : '可以使用正则表达式,不区分大小写'}
                onChange={(event) => setPattern(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    confirm()
                  }
                }}
              />
              {invalid ? (
                <p className="comment">
                  <span className="red">通配符中不能包含问号(?)及问号以后的内容.</span>
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="ui field">
            <button className={`ui button tiny${invalid ? ' disabled' : ''}`} type="button" onClick={confirm}>
              确定
            </button>
            <a href="" title="取消" style={{ marginLeft: '0.4em' }} onClick={(event) => { event.preventDefault(); cancel() }}>
              <X size={12} />
            </a>
          </div>
        </div>
      ) : null}
      <div style={{ marginTop: '0.5em' }}>
        <button className="ui button tiny basic" type="button" onClick={() => { cancel(); setAdding(true) }}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}
